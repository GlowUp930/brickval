-- Referral onboarding attribution and the existing-user bulk credit boundary.
-- Existing referral rows remain valid; the three-argument function is used by
-- current clients while the two-argument function remains for older builds.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS bulk_intro_grandfathered boolean NOT NULL DEFAULT false;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS bulk_intro_installation_hash text;

CREATE UNIQUE INDEX IF NOT EXISTS users_bulk_intro_installation_hash_idx
  ON users (bulk_intro_installation_hash)
  WHERE bulk_intro_installation_hash IS NOT NULL;

-- Users that existed before this rollout keep their unused introductory bulk
-- allowance. New accounts intentionally inherit the false default.
UPDATE users
SET bulk_intro_grandfathered = true
WHERE bulk_intro_grandfathered = false
  AND created_at < timestamp '2026-08-28 00:00:00';

ALTER TABLE referral_attributions
  ADD COLUMN IF NOT EXISTS installation_hash text;

CREATE UNIQUE INDEX IF NOT EXISTS referral_attributions_installation_idx
  ON referral_attributions (installation_hash)
  WHERE installation_hash IS NOT NULL;

CREATE OR REPLACE FUNCTION claim_referral_code(
  p_referred_user_id text,
  p_code text,
  p_installation_hash text
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_code_id uuid;
  v_referrer_user_id text;
  v_existing_status text;
  v_inserted integer;
BEGIN
  SELECT status
  INTO v_existing_status
  FROM referral_attributions
  WHERE referred_user_id = p_referred_user_id;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'claimed', false,
      'status', COALESCE(v_existing_status, 'already_claimed')
    );
  END IF;

  IF p_installation_hash IS NOT NULL
     AND EXISTS (
       SELECT 1
       FROM referral_attributions
       WHERE installation_hash = p_installation_hash
     ) THEN
    RETURN jsonb_build_object('claimed', false, 'status', 'installation_already_used');
  END IF;

  SELECT id, referrer_user_id
  INTO v_code_id, v_referrer_user_id
  FROM referral_codes
  WHERE code = upper(trim(p_code))
    AND active = true
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('claimed', false, 'status', 'invalid');
  END IF;

  IF v_referrer_user_id = p_referred_user_id THEN
    RETURN jsonb_build_object('claimed', false, 'status', 'self_referral');
  END IF;

  INSERT INTO users (id)
  VALUES (p_referred_user_id)
  ON CONFLICT (id) DO NOTHING;

  BEGIN
    INSERT INTO referral_attributions (
      referral_code_id,
      referrer_user_id,
      referred_user_id,
      status,
      installation_hash
    )
    VALUES (
      v_code_id,
      v_referrer_user_id,
      p_referred_user_id,
      'claimed',
      p_installation_hash
    );
    GET DIAGNOSTICS v_inserted = ROW_COUNT;
  EXCEPTION
    WHEN unique_violation THEN
      IF p_installation_hash IS NOT NULL
         AND EXISTS (
           SELECT 1
           FROM referral_attributions
           WHERE installation_hash = p_installation_hash
         ) THEN
        RETURN jsonb_build_object('claimed', false, 'status', 'installation_already_used');
      END IF;
      SELECT status
      INTO v_existing_status
      FROM referral_attributions
      WHERE referred_user_id = p_referred_user_id;
      RETURN jsonb_build_object(
        'claimed', false,
        'status', COALESCE(v_existing_status, 'already_claimed')
      );
  END;

  IF v_inserted = 0 THEN
    RETURN jsonb_build_object('claimed', false, 'status', 'already_claimed');
  END IF;

  RETURN jsonb_build_object(
    'claimed', true,
    'status', 'claimed',
    'referrer_user_id', v_referrer_user_id
  );
END;
$$;

-- Keep the old RPC signature usable without making the three-argument
-- overload ambiguous for SQL callers.
CREATE OR REPLACE FUNCTION claim_referral_code(
  p_referred_user_id text,
  p_code text
)
RETURNS jsonb
LANGUAGE sql
AS $$
  SELECT claim_referral_code($1, $2, NULL::text);
$$;

CREATE OR REPLACE FUNCTION consume_feature_usage(
  p_user_id text,
  p_feature text,
  p_period_key text,
  p_free_limit int
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_is_pro boolean;
  v_bulk_intro_grandfathered boolean;
  v_uses int;
  v_effective_limit int := p_free_limit;
BEGIN
  SELECT is_pro, bulk_intro_grandfathered
  INTO v_is_pro, v_bulk_intro_grandfathered
  FROM users
  WHERE id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('allowed', false, 'used', 0, 'is_pro', false);
  END IF;

  IF v_is_pro THEN
    RETURN jsonb_build_object('allowed', true, 'used', 0, 'is_pro', true);
  END IF;

  IF p_feature = 'bulk_scan' AND NOT COALESCE(v_bulk_intro_grandfathered, false) THEN
    v_effective_limit := 0;
  END IF;

  INSERT INTO user_feature_usage (user_id, feature, period_key, uses)
  VALUES (p_user_id, p_feature, p_period_key, 0)
  ON CONFLICT (user_id, feature, period_key) DO NOTHING;

  UPDATE user_feature_usage
  SET uses = uses + 1, updated_at = now()
  WHERE user_id = p_user_id
    AND feature = p_feature
    AND period_key = p_period_key
    AND uses < v_effective_limit
  RETURNING uses INTO v_uses;

  IF NOT FOUND THEN
    SELECT uses INTO v_uses
    FROM user_feature_usage
    WHERE user_id = p_user_id
      AND feature = p_feature
      AND period_key = p_period_key;
    RETURN jsonb_build_object(
      'allowed', false,
      'used', COALESCE(v_uses, 0),
      'is_pro', false
    );
  END IF;

  RETURN jsonb_build_object('allowed', true, 'used', v_uses, 'is_pro', false);
END;
$$;

CREATE OR REPLACE FUNCTION claim_bulk_intro_grandfathering(
  p_user_id text,
  p_installation_hash text
)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  v_grandfathered boolean;
  v_existing_hash text;
  v_bulk_uses integer;
BEGIN
  IF p_installation_hash IS NULL OR length(trim(p_installation_hash)) = 0 THEN
    RETURN false;
  END IF;

  INSERT INTO users (id)
  VALUES (p_user_id)
  ON CONFLICT (id) DO NOTHING;

  SELECT bulk_intro_grandfathered, bulk_intro_installation_hash
  INTO v_grandfathered, v_existing_hash
  FROM users
  WHERE id = p_user_id
  FOR UPDATE;

  IF v_grandfathered THEN
    RETURN true;
  END IF;

  IF v_existing_hash IS NOT NULL THEN
    RETURN false;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM users
    WHERE bulk_intro_installation_hash = p_installation_hash
  ) THEN
    RETURN false;
  END IF;

  SELECT COALESCE(uses, 0)
  INTO v_bulk_uses
  FROM user_feature_usage
  WHERE user_id = p_user_id
    AND feature = 'bulk_scan'
    AND period_key = 'lifetime';

  IF COALESCE(v_bulk_uses, 0) > 0 THEN
    RETURN false;
  END IF;

  UPDATE users
  SET bulk_intro_grandfathered = true,
      bulk_intro_installation_hash = p_installation_hash
  WHERE id = p_user_id;

  RETURN true;
EXCEPTION
  WHEN unique_violation THEN
    RETURN false;
END;
$$;

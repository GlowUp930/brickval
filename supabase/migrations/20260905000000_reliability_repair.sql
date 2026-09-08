-- Forward reliability repair. Apply in a transaction after staging verification.
-- Legacy eligibility cutoff is the 2026-08-28 policy rollout (UTC).
BEGIN;
ALTER TABLE users ADD COLUMN IF NOT EXISTS bulk_intro_grandfathered boolean NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS bulk_intro_installation_hash text;
CREATE UNIQUE INDEX IF NOT EXISTS users_bulk_intro_installation_hash_idx ON users(bulk_intro_installation_hash) WHERE bulk_intro_installation_hash IS NOT NULL;
ALTER TABLE referral_attributions ADD COLUMN IF NOT EXISTS installation_hash text;
CREATE UNIQUE INDEX IF NOT EXISTS referral_attributions_installation_idx ON referral_attributions(installation_hash) WHERE installation_hash IS NOT NULL;
ALTER TABLE notification_devices ADD COLUMN IF NOT EXISTS language_code text DEFAULT 'en';
UPDATE users SET bulk_intro_grandfathered=true WHERE created_at < timestamp '2026-08-28 00:00:00';
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
    RETURN jsonb_build_object('allowed', false, 'used', COALESCE(v_uses, 0), 'is_pro', false);
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
  v_created_at timestamp;
BEGIN
  IF p_installation_hash IS NULL OR length(trim(p_installation_hash)) = 0 THEN
    RETURN false;
  END IF;

  INSERT INTO users (id)
  VALUES (p_user_id)
  ON CONFLICT (id) DO NOTHING;

  SELECT bulk_intro_grandfathered, bulk_intro_installation_hash, created_at
  INTO v_grandfathered, v_existing_hash, v_created_at
  FROM users
  WHERE id = p_user_id
  FOR UPDATE;

  -- Eligibility is historical server state, never a fresh installation assertion.
  IF v_created_at >= timestamp '2026-08-28 00:00:00' THEN
    RETURN false;
  END IF;

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
  IF EXISTS (SELECT 1 FROM deleted_installations
      WHERE installation_hash=p_installation_hash AND expires_at > now()) THEN
    RETURN jsonb_build_object('claimed', false, 'status', 'installation_already_used');
  END IF;
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

  INSERT INTO referral_attributions (
    referral_code_id,
    referrer_user_id,
    referred_user_id,
    status,
    installation_hash
  )
  VALUES (v_code_id, v_referrer_user_id, p_referred_user_id, 'claimed', p_installation_hash);

  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  IF v_inserted = 0 THEN
    SELECT status
    INTO v_existing_status
    FROM referral_attributions
    WHERE referred_user_id = p_referred_user_id;
    RETURN jsonb_build_object(
      'claimed', false,
      'status', COALESCE(v_existing_status, 'already_claimed')
    );
  END IF;

  RETURN jsonb_build_object('claimed', true, 'status', 'claimed');
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
    RETURN jsonb_build_object('claimed', false, 'status', 'already_claimed');
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

CREATE OR REPLACE FUNCTION qualify_referral(
  p_referred_user_id text,
  p_reason text,
  p_goal integer DEFAULT 3,
  p_bonus_quantity integer DEFAULT 3
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_attribution referral_attributions%ROWTYPE;
  v_qualified_count integer;
  v_reward_rows integer;
BEGIN
  IF p_goal <> 3 OR p_bonus_quantity <> 3 OR p_reason <> 'onboarding_completed' THEN
    RAISE EXCEPTION 'Invalid referral milestone';
  END IF;

  SELECT * INTO v_attribution FROM referral_attributions
  WHERE referred_user_id = p_referred_user_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('qualified', false, 'status', 'not_claimed');
  END IF;

  -- Lock the referrer before the attribution, shared with credit consumption.
  -- The next statement sees any completion committed by a prior lock holder.
  PERFORM 1 FROM users WHERE id = v_attribution.referrer_user_id FOR UPDATE;
  SELECT * INTO v_attribution FROM referral_attributions
  WHERE referred_user_id = p_referred_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('qualified', false, 'status', 'not_claimed');
  END IF;
  IF v_attribution.status NOT IN ('claimed', 'qualified') THEN
    RETURN jsonb_build_object('qualified', false, 'status', v_attribution.status);
  END IF;

  UPDATE referral_attributions
  SET status = 'qualified', qualified_at = COALESCE(qualified_at, now()),
      qualification_reason = p_reason
  WHERE id = v_attribution.id;

  SELECT count(*)::integer
  INTO v_qualified_count
  FROM referral_attributions
  WHERE referrer_user_id = v_attribution.referrer_user_id
    AND status = 'qualified';

  INSERT INTO referral_rewards (referrer_user_id, milestone, quantity)
  SELECT v_attribution.referrer_user_id, '3_qualified', p_bonus_quantity
  WHERE v_qualified_count >= p_goal
  ON CONFLICT (referrer_user_id, milestone) DO NOTHING;

  GET DIAGNOSTICS v_reward_rows = ROW_COUNT;
  IF v_reward_rows = 1 THEN
    INSERT INTO referral_credit_ledger (
      user_id,
      amount,
      reason,
      source_referral_id
    )
    VALUES (
      v_attribution.referrer_user_id,
      p_bonus_quantity,
      'referral_reward_3_qualified',
      v_attribution.id
    );
  END IF;

  RETURN jsonb_build_object(
    'qualified', true,
    'already_qualified', v_attribution.status = 'qualified',
    'qualified_count', v_qualified_count,
    'reward_granted', v_reward_rows = 1
  );
END;
$$;

CREATE OR REPLACE FUNCTION consume_referral_bulk_credit(p_user_id text)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  v_balance integer;
BEGIN
  PERFORM 1 FROM users WHERE id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN false;
  END IF;

  IF (SELECT is_pro FROM users WHERE id=p_user_id) THEN RETURN true; END IF;

  SELECT COALESCE(sum(amount), 0)::integer
  INTO v_balance
  FROM referral_credit_ledger
  WHERE user_id = p_user_id;

  IF v_balance <= 0 THEN
    RETURN false;
  END IF;

  INSERT INTO referral_credit_ledger (user_id, amount, reason)
  VALUES (p_user_id, -1, 'referral_bulk_scan');
  RETURN true;
END;
$$;

-- Durable authorization: a session's charge and its decision commit together.
CREATE TABLE IF NOT EXISTS bulk_scan_authorizations (
  session_hash text PRIMARY KEY,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  allowed boolean NOT NULL,
  expires_at timestamptz NOT NULL
);
ALTER TABLE bulk_scan_authorizations ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION authorize_bulk_scan(
  p_user_id text, p_session_hash text, p_free_limit int, p_expires_at timestamptz
) RETURNS boolean LANGUAGE plpgsql AS $$
DECLARE v_allowed boolean; v_owner text; v_result jsonb;
BEGIN
  PERFORM 1 FROM users WHERE id = p_user_id FOR UPDATE;
  IF NOT FOUND OR p_expires_at <= now() THEN RETURN false; END IF;
  SELECT allowed, user_id INTO v_allowed, v_owner
    FROM bulk_scan_authorizations WHERE session_hash = p_session_hash;
  IF FOUND THEN RETURN v_owner = p_user_id AND v_allowed; END IF;
  v_result := CASE WHEN p_free_limit = 2147483647 THEN '{"allowed":true}'::jsonb
    ELSE consume_feature_usage(p_user_id, 'bulk_scan', 'lifetime', p_free_limit) END;
  v_allowed := COALESCE((v_result->>'allowed')::boolean, false);
  IF NOT v_allowed THEN v_allowed := consume_referral_bulk_credit(p_user_id); END IF;
  DELETE FROM bulk_scan_authorizations WHERE expires_at < now();
  INSERT INTO bulk_scan_authorizations VALUES(p_session_hash, p_user_id, v_allowed, p_expires_at);
  RETURN v_allowed;
END;
$$;

-- Separate payment sources so one provider cannot revoke another's paid access.
CREATE TABLE IF NOT EXISTS subscription_entitlements (
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider text NOT NULL,
  active boolean NOT NULL,
  version_ms bigint NOT NULL,
  event_id text NOT NULL,
  PRIMARY KEY(user_id, provider)
);
ALTER TABLE subscription_entitlements ENABLE ROW LEVEL SECURITY;
CREATE OR REPLACE FUNCTION apply_subscription_entitlement(
  p_user_id text, p_provider text, p_active boolean, p_version_ms bigint, p_event_id text
) RETURNS boolean LANGUAGE plpgsql AS $$
DECLARE v_changed int;
BEGIN
  IF EXISTS (SELECT 1 FROM account_deletion_requests
    WHERE user_hash=encode(sha256(convert_to(p_user_id,'UTF8')),'hex') AND expires_at > now()) THEN RETURN false; END IF;
  INSERT INTO users(id) VALUES(p_user_id) ON CONFLICT DO NOTHING;
  PERFORM 1 FROM users WHERE id = p_user_id FOR UPDATE;
  INSERT INTO subscription_entitlements VALUES(p_user_id, p_provider, p_active, p_version_ms, p_event_id)
  ON CONFLICT(user_id, provider) DO UPDATE SET
    active=EXCLUDED.active, version_ms=EXCLUDED.version_ms, event_id=EXCLUDED.event_id
  WHERE subscription_entitlements.version_ms < EXCLUDED.version_ms;
  GET DIAGNOSTICS v_changed = ROW_COUNT;
  IF v_changed > 0 THEN
    UPDATE users SET is_pro = EXISTS(
      SELECT 1 FROM subscription_entitlements WHERE user_id=p_user_id AND active
    ) WHERE id=p_user_id;
  END IF;
  RETURN v_changed > 0;
END;
$$;


-- Minimal security receipts survive deletion for 90 days; no email, name, or photo.
CREATE TABLE IF NOT EXISTS deleted_installations (
  installation_hash text PRIMARY KEY,
  expires_at timestamptz NOT NULL DEFAULT now() + interval '90 days'
);
CREATE TABLE IF NOT EXISTS account_deletion_requests (
  user_hash text PRIMARY KEY,
  completed boolean NOT NULL DEFAULT false,
  expires_at timestamptz NOT NULL DEFAULT now() + interval '90 days'
);
ALTER TABLE deleted_installations ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_deletion_requests ENABLE ROW LEVEL SECURITY;
CREATE OR REPLACE FUNCTION stage_account_deletion(p_user_id text)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO account_deletion_requests(user_hash)
  VALUES(encode(sha256(convert_to(p_user_id,'UTF8')),'hex')) ON CONFLICT DO NOTHING;
  INSERT INTO deleted_installations(installation_hash)
  SELECT installation_hash FROM referral_attributions
  WHERE referred_user_id=p_user_id AND installation_hash IS NOT NULL
  ON CONFLICT(installation_hash) DO UPDATE SET expires_at=now()+interval '90 days';
  DELETE FROM notification_devices WHERE app_user_id=p_user_id OR clerk_user_id=p_user_id;
  DELETE FROM users WHERE id=p_user_id;
  DELETE FROM deleted_installations WHERE expires_at < now();
  DELETE FROM account_deletion_requests WHERE expires_at < now();
END;
$$;

-- Reconcile past missed milestones; preserve already-granted one-time rewards.
WITH grants AS (
  INSERT INTO referral_rewards(referrer_user_id, milestone, quantity)
  SELECT referrer_user_id, '3_qualified', 3 FROM referral_attributions
  WHERE status='qualified' GROUP BY referrer_user_id HAVING count(*) >= 3
  ON CONFLICT(referrer_user_id, milestone) DO NOTHING
  RETURNING referrer_user_id
)
INSERT INTO referral_credit_ledger(user_id, amount, reason)
SELECT referrer_user_id, 3, 'referral_reward_3_qualified' FROM grants;

CREATE OR REPLACE FUNCTION purge_expired_reliability_state()
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  DELETE FROM deleted_installations WHERE expires_at < now();
  DELETE FROM account_deletion_requests WHERE expires_at < now();
  DELETE FROM bulk_scan_authorizations WHERE expires_at < now();
END;
$$;

-- Supabase includes pg_cron. Plain local PostgreSQL tests may not have it installed.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_available_extensions WHERE name='pg_cron') THEN
    CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
    PERFORM cron.schedule('brickval-reliability-cleanup', '15 3 * * *',
      'SELECT public.purge_expired_reliability_state();');
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
COMMIT;

CREATE TABLE IF NOT EXISTS referral_codes (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_user_id  text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code              text NOT NULL UNIQUE,
  active            boolean NOT NULL DEFAULT true,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS referral_codes_referrer_idx
  ON referral_codes (referrer_user_id, active);

CREATE UNIQUE INDEX IF NOT EXISTS referral_codes_one_active_per_referrer_idx
  ON referral_codes (referrer_user_id)
  WHERE active = true;

CREATE TABLE IF NOT EXISTS referral_attributions (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_code_id    uuid NOT NULL REFERENCES referral_codes(id) ON DELETE CASCADE,
  referrer_user_id    text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referred_user_id    text NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  status              text NOT NULL CHECK (status IN ('claimed', 'qualified', 'rejected')),
  claimed_at          timestamptz NOT NULL DEFAULT now(),
  qualified_at        timestamptz,
  qualification_reason text
);

CREATE INDEX IF NOT EXISTS referral_attributions_referrer_idx
  ON referral_attributions (referrer_user_id, status);

CREATE TABLE IF NOT EXISTS referral_rewards (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_user_id  text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  milestone         text NOT NULL,
  quantity          integer NOT NULL CHECK (quantity > 0),
  granted_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (referrer_user_id, milestone)
);

CREATE TABLE IF NOT EXISTS referral_credit_ledger (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount              integer NOT NULL CHECK (amount <> 0),
  reason              text NOT NULL,
  source_referral_id  uuid REFERENCES referral_attributions(id) ON DELETE SET NULL,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS referral_credit_ledger_user_idx
  ON referral_credit_ledger (user_id, created_at);

ALTER TABLE referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_attributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_credit_ledger ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION claim_referral_code(
  p_referred_user_id text,
  p_code text
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
    status
  )
  VALUES (
    v_code_id,
    v_referrer_user_id,
    p_referred_user_id,
    'claimed'
  )
  ON CONFLICT (referred_user_id) DO NOTHING;

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

  RETURN jsonb_build_object(
    'claimed', true,
    'status', 'claimed',
    'referrer_user_id', v_referrer_user_id
  );
END;
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
  SELECT *
  INTO v_attribution
  FROM referral_attributions
  WHERE referred_user_id = p_referred_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('qualified', false, 'status', 'not_claimed');
  END IF;

  IF v_attribution.status = 'qualified' THEN
    SELECT count(*)::integer
    INTO v_qualified_count
    FROM referral_attributions
    WHERE referrer_user_id = v_attribution.referrer_user_id
      AND status = 'qualified';
    RETURN jsonb_build_object(
      'qualified', true,
      'already_qualified', true,
      'qualified_count', v_qualified_count,
      'reward_granted', false
    );
  END IF;

  IF v_attribution.status <> 'claimed' THEN
    RETURN jsonb_build_object('qualified', false, 'status', v_attribution.status);
  END IF;

  UPDATE referral_attributions
  SET status = 'qualified',
      qualified_at = now(),
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
    'already_qualified', false,
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

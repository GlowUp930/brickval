-- BrickVal — Supabase Schema
-- Run this in the Supabase SQL editor for your project.

-- ============================================================
-- TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
  id              text PRIMARY KEY,        -- Clerk userId
  scans_used      int DEFAULT 0 NOT NULL,
  is_pro          boolean DEFAULT false NOT NULL,
  hit_paywall_at  timestamp,               -- first time user hit the 5-scan gate
  bulk_intro_grandfathered boolean DEFAULT false NOT NULL,
  bulk_intro_installation_hash text,
  created_at      timestamp DEFAULT now() NOT NULL
);

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS bulk_intro_grandfathered boolean NOT NULL DEFAULT false;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS bulk_intro_installation_hash text;

CREATE UNIQUE INDEX IF NOT EXISTS users_bulk_intro_installation_hash_idx
  ON users (bulk_intro_installation_hash)
  WHERE bulk_intro_installation_hash IS NOT NULL;

UPDATE users
SET bulk_intro_grandfathered = true
WHERE bulk_intro_grandfathered = false
  AND created_at < now();

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
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_code_id     uuid NOT NULL REFERENCES referral_codes(id) ON DELETE CASCADE,
  referrer_user_id     text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referred_user_id     text NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  status               text NOT NULL CHECK (status IN ('claimed', 'qualified', 'rejected')),
  claimed_at           timestamptz NOT NULL DEFAULT now(),
  qualified_at         timestamptz,
  qualification_reason text,
  installation_hash    text
);

ALTER TABLE referral_attributions
  ADD COLUMN IF NOT EXISTS installation_hash text;

CREATE INDEX IF NOT EXISTS referral_attributions_referrer_idx
  ON referral_attributions (referrer_user_id, status);

CREATE UNIQUE INDEX IF NOT EXISTS referral_attributions_installation_idx
  ON referral_attributions (installation_hash)
  WHERE installation_hash IS NOT NULL;

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

CREATE TABLE IF NOT EXISTS notification_devices (
  device_id               text PRIMARY KEY,
  apns_token              text NOT NULL,
  environment             text NOT NULL CHECK (environment IN ('sandbox', 'production')),
  app_user_id             text,
  clerk_user_id           text,
  access_cohort           text,
  account_alerts_enabled  boolean NOT NULL DEFAULT false,
  enabled                 boolean NOT NULL DEFAULT true,
  last_seen_at            timestamptz NOT NULL DEFAULT now(),
  created_at              timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notification_devices_app_user_idx
  ON notification_devices (app_user_id, enabled, account_alerts_enabled);

CREATE TABLE IF NOT EXISTS product_feedback (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_type            text NOT NULL CHECK (survey_type IN ('post_purchase', 'pmf', 'cancellation')),
  dedupe_key             text NOT NULL UNIQUE,
  clerk_user_id          text,
  anonymous_id           text,
  post_purchase_reason   text,
  post_purchase_reasons  text[],
  acquisition_source     text,
  pmf_sentiment          text,
  pmf_benefit            text,
  pmf_benefits           text[],
  pmf_missing            text,
  pmf_improvements       text[],
  cancellation_reason    text,
  cancellation_reasons   text[],
  additional_text        text,
  access_cohort          text,
  product_id             text,
  is_trial               boolean,
  successful_scan_count  integer NOT NULL DEFAULT 0 CHECK (successful_scan_count >= 0),
  app_version            text,
  app_build              text,
  created_at             timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS product_feedback_type_created_at_idx
  ON product_feedback (survey_type, created_at DESC);

CREATE TABLE IF NOT EXISTS user_feature_usage (
  user_id    text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  feature    text NOT NULL CHECK (feature IN ('single_scan', 'bulk_scan')),
  period_key text NOT NULL,
  uses       int NOT NULL DEFAULT 0 CHECK (uses >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, feature, period_key)
);

ALTER TABLE user_feature_usage ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS api_cache (
  cache_key   text PRIMARY KEY,            -- e.g. "brickset:75192", "fx:EUR-USD-AUD"
  data        jsonb NOT NULL,
  expires_at  timestamp NOT NULL
);

CREATE TABLE IF NOT EXISTS market_snapshots (
  item_type        text NOT NULL CHECK (item_type IN ('minifig')),
  item_id          text NOT NULL,
  payload          jsonb NOT NULL,
  updated_at       timestamptz NOT NULL DEFAULT now(),
  refreshing_until timestamptz,
  PRIMARY KEY (item_type, item_id)
);

CREATE TABLE IF NOT EXISTS service_monthly_usage (
  service      text NOT NULL,
  period_start date NOT NULL,
  used         integer NOT NULL DEFAULT 0 CHECK (used >= 0),
  PRIMARY KEY (service, period_start)
);

CREATE TABLE IF NOT EXISTS service_rate_limits (
  key          text PRIMARY KEY,
  window_start timestamptz NOT NULL,
  used         integer NOT NULL DEFAULT 0 CHECK (used >= 0)
);

CREATE TABLE IF NOT EXISTS scan_feedback (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  outcome                text NOT NULL CHECK (outcome IN ('matched', 'brickognize-rejected', 'gallery-recovery', 'low-confidence')),
  detector_model_version text NOT NULL,
  detector_confidence    double precision,
  brickognize_id         text,
  brickognize_score      double precision,
  detect_ms              integer,
  identify_ms            integer,
  pricing_ms             integer,
  total_ms               integer,
  image_path             text,
  reviewed               boolean NOT NULL DEFAULT false,
  created_at             timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS scan_feedback_review_idx
  ON scan_feedback (reviewed, created_at);

INSERT INTO storage.buckets (id, name, public)
VALUES ('scan-feedback', 'scan-feedback', false)
ON CONFLICT (id) DO NOTHING;

-- Index for efficient TTL cleanup queries
CREATE INDEX IF NOT EXISTS api_cache_expires_at_idx ON api_cache (expires_at);

CREATE TABLE IF NOT EXISTS waitlist (
  email      text PRIMARY KEY,
  created_at timestamp DEFAULT now() NOT NULL
);

ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_monthly_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE scan_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_attributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_credit_ledger ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION consume_monthly_service_quota(
  p_service text,
  p_limit integer,
  p_now timestamptz
)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  v_claimed boolean := false;
  v_period_start date := date_trunc('month', p_now)::date;
BEGIN
  INSERT INTO service_monthly_usage (service, period_start, used)
  VALUES (p_service, v_period_start, 1)
  ON CONFLICT (service, period_start)
  DO UPDATE SET used = service_monthly_usage.used + 1
  WHERE service_monthly_usage.used < p_limit
  RETURNING true INTO v_claimed;

  RETURN coalesce(v_claimed, false);
END;
$$;

CREATE OR REPLACE FUNCTION consume_service_rate_limit(
  p_key text,
  p_limit integer,
  p_now timestamptz,
  p_window_seconds integer
)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  v_claimed boolean := false;
BEGIN
  INSERT INTO service_rate_limits (key, window_start, used)
  VALUES (p_key, p_now, 1)
  ON CONFLICT (key)
  DO UPDATE SET
    window_start = CASE
      WHEN service_rate_limits.window_start <= p_now - make_interval(secs => p_window_seconds) THEN p_now
      ELSE service_rate_limits.window_start
    END,
    used = CASE
      WHEN service_rate_limits.window_start <= p_now - make_interval(secs => p_window_seconds) THEN 1
      ELSE service_rate_limits.used + 1
    END
  WHERE service_rate_limits.window_start <= p_now - make_interval(secs => p_window_seconds)
     OR service_rate_limits.used < p_limit
  RETURNING true INTO v_claimed;

  RETURN coalesce(v_claimed, false);
END;
$$;

CREATE OR REPLACE FUNCTION claim_market_snapshot_refresh(
  p_item_type text,
  p_item_id text,
  p_now timestamptz,
  p_refreshing_until timestamptz
)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  v_rows integer;
BEGIN
  UPDATE market_snapshots
  SET refreshing_until = p_refreshing_until
  WHERE item_type = p_item_type
    AND item_id = p_item_id
    AND (refreshing_until IS NULL OR refreshing_until <= p_now);

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RETURN v_rows > 0;
END;
$$;

-- Service role key bypasses RLS — no public policies needed.
-- All server-side code uses SUPABASE_SERVICE_ROLE_KEY.

-- ============================================================
-- ATOMIC SCAN COUNTER FUNCTION
-- ============================================================
-- Handles the conditional increment atomically.
-- Never use read-then-write in application code.

CREATE OR REPLACE FUNCTION increment_scan(p_user_id text, p_free_limit int)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_scans_used int;
  v_is_pro     boolean;
BEGIN
  UPDATE users
  SET scans_used = CASE
    WHEN is_pro                      THEN scans_used + 1  -- pros always increment
    WHEN scans_used < p_free_limit   THEN scans_used + 1  -- free user within limit
    ELSE scans_used                                        -- free user at limit: no-op
  END
  WHERE id = p_user_id
  RETURNING scans_used, is_pro INTO v_scans_used, v_is_pro;

  -- If no row was updated (user doesn't exist yet), return denied
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'allowed',     false,
      'scans_used',  0,
      'is_pro',      false
    );
  END IF;

  RETURN jsonb_build_object(
    'allowed',     v_is_pro OR v_scans_used <= p_free_limit,
    'scans_used',  v_scans_used,
    'is_pro',      v_is_pro
  );
END;
$$;

-- Atomically consumes a feature allowance. The period key is a UTC date for
-- daily scans and "lifetime" for the introductory bulk scan.
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

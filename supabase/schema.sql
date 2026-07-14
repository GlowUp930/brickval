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
  created_at      timestamp DEFAULT now() NOT NULL
);

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
ALTER TABLE api_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_monthly_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE scan_feedback ENABLE ROW LEVEL SECURITY;

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

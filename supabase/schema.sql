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

-- Index for efficient TTL cleanup queries
CREATE INDEX IF NOT EXISTS api_cache_expires_at_idx ON api_cache (expires_at);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_cache ENABLE ROW LEVEL SECURITY;

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

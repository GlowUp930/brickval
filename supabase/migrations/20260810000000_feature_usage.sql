CREATE TABLE IF NOT EXISTS user_feature_usage (
  user_id    text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  feature    text NOT NULL CHECK (feature IN ('single_scan', 'bulk_scan')),
  period_key text NOT NULL,
  uses       int NOT NULL DEFAULT 0 CHECK (uses >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, feature, period_key)
);

ALTER TABLE user_feature_usage ENABLE ROW LEVEL SECURITY;

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
  v_uses int;
BEGIN
  SELECT is_pro INTO v_is_pro
  FROM users
  WHERE id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('allowed', false, 'used', 0, 'is_pro', false);
  END IF;

  IF v_is_pro THEN
    RETURN jsonb_build_object('allowed', true, 'used', 0, 'is_pro', true);
  END IF;

  INSERT INTO user_feature_usage (user_id, feature, period_key, uses)
  VALUES (p_user_id, p_feature, p_period_key, 0)
  ON CONFLICT (user_id, feature, period_key) DO NOTHING;

  UPDATE user_feature_usage
  SET uses = uses + 1, updated_at = now()
  WHERE user_id = p_user_id
    AND feature = p_feature
    AND period_key = p_period_key
    AND uses < p_free_limit
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

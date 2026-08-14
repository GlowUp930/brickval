CREATE TABLE IF NOT EXISTS product_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_type text NOT NULL CHECK (survey_type IN ('post_purchase', 'pmf', 'cancellation')),
  dedupe_key text NOT NULL UNIQUE,
  clerk_user_id text,
  anonymous_id text,
  post_purchase_reason text,
  acquisition_source text,
  pmf_sentiment text,
  pmf_benefit text,
  pmf_missing text,
  cancellation_reason text,
  additional_text text,
  access_cohort text,
  product_id text,
  is_trial boolean,
  successful_scan_count integer NOT NULL DEFAULT 0 CHECK (successful_scan_count >= 0),
  app_version text,
  app_build text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS product_feedback_type_created_at_idx
  ON product_feedback (survey_type, created_at DESC);

ALTER TABLE product_feedback ENABLE ROW LEVEL SECURITY;

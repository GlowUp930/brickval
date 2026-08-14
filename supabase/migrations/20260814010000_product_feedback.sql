CREATE TABLE IF NOT EXISTS product_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_type text NOT NULL CHECK (survey_type IN ('post_purchase', 'pmf', 'cancellation')),
  dedupe_key text NOT NULL UNIQUE,
  clerk_user_id text,
  anonymous_id text,
  post_purchase_reason text,
  post_purchase_reasons text[],
  acquisition_source text,
  pmf_sentiment text,
  pmf_benefit text,
  pmf_benefits text[],
  pmf_missing text,
  pmf_improvements text[],
  cancellation_reason text,
  cancellation_reasons text[],
  additional_text text,
  access_cohort text,
  product_id text,
  is_trial boolean,
  successful_scan_count integer NOT NULL DEFAULT 0 CHECK (successful_scan_count >= 0),
  app_version text,
  app_build text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE product_feedback
  ADD COLUMN IF NOT EXISTS post_purchase_reasons text[],
  ADD COLUMN IF NOT EXISTS pmf_benefits text[],
  ADD COLUMN IF NOT EXISTS pmf_improvements text[],
  ADD COLUMN IF NOT EXISTS cancellation_reasons text[];

CREATE INDEX IF NOT EXISTS product_feedback_type_created_at_idx
  ON product_feedback (survey_type, created_at DESC);

ALTER TABLE product_feedback ENABLE ROW LEVEL SECURITY;

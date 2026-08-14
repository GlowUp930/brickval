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

ALTER TABLE notification_devices ENABLE ROW LEVEL SECURITY;

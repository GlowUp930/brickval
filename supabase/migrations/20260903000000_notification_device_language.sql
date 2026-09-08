ALTER TABLE notification_devices
  ADD COLUMN IF NOT EXISTS language_code text DEFAULT 'en';

ALTER TABLE notification_devices
  ALTER COLUMN language_code DROP NOT NULL;

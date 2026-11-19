-- Dhun's application data is separate from Neon's managed identity tables.
CREATE SCHEMA IF NOT EXISTS dhun;
REVOKE ALL ON SCHEMA dhun FROM PUBLIC;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'dhun_app') THEN
    CREATE ROLE dhun_app NOLOGIN NOBYPASSRLS NOCREATEDB NOCREATEROLE;
  END IF;
  EXECUTE format('GRANT dhun_app TO %I', current_user);
END $$;

CREATE OR REPLACE FUNCTION dhun.valid_favourites(value jsonb) RETURNS boolean
LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE item jsonb;
BEGIN
  IF jsonb_typeof(value) IS DISTINCT FROM 'array' OR jsonb_array_length(value) > 1000 OR octet_length(value::text) > 2000000 THEN RETURN false; END IF;
  FOR item IN SELECT * FROM jsonb_array_elements(value) LOOP
    IF jsonb_typeof(item) IS DISTINCT FROM 'object'
      OR item - ARRAY['videoId','title','artist','durationSeconds'] <> '{}'::jsonb
      OR NOT (item ?& ARRAY['videoId','title','artist','durationSeconds'])
      OR jsonb_typeof(item->'videoId') IS DISTINCT FROM 'string'
      OR item->>'videoId' !~ '^[A-Za-z0-9_-]{11}$'
      OR jsonb_typeof(item->'title') IS DISTINCT FROM 'string' OR length(item->>'title') NOT BETWEEN 1 AND 300
      OR jsonb_typeof(item->'artist') IS DISTINCT FROM 'string' OR length(item->>'artist') > 200
      OR jsonb_typeof(item->'durationSeconds') IS DISTINCT FROM 'number' THEN RETURN false; END IF;
    IF (item->>'durationSeconds')::numeric NOT BETWEEN 0 AND 86400 THEN RETURN false; END IF;
  END LOOP;
  RETURN (SELECT count(DISTINCT entry->>'videoId') FROM jsonb_array_elements(value) entry) = jsonb_array_length(value);
END $$;

CREATE TABLE IF NOT EXISTS dhun.profiles (
  user_id uuid PRIMARY KEY REFERENCES neon_auth."user"(id) ON DELETE CASCADE,
  account_consent_version text NOT NULL,
  account_consented_at timestamptz NOT NULL DEFAULT now(),
  backup_consent_version text,
  backup_consented_at timestamptz,
  revision integer NOT NULL DEFAULT 0 CHECK (revision >= 0),
  favourites jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (dhun.valid_favourites(favourites)),
  preferences jsonb CHECK (preferences IS NULL OR COALESCE(
    jsonb_typeof(preferences) = 'object'
    AND preferences - ARRAY['theme','appearance','reduceMotion'] = '{}'::jsonb
    AND preferences ?& ARRAY['theme','appearance','reduceMotion']
    AND preferences->>'theme' IN ('monochrome','indigo','forest')
    AND preferences->>'appearance' IN ('dark','light','system')
    AND jsonb_typeof(preferences->'reduceMotion') = 'boolean', false)),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS dhun.devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES dhun.profiles(user_id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE CHECK (token_hash ~ '^[a-f0-9]{64}$'),
  name text NOT NULL CHECK (length(name) BETWEEN 1 AND 60),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  last_used_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS dhun.connections (
  secret_hash text PRIMARY KEY CHECK (secret_hash ~ '^[a-f0-9]{64}$'),
  user_code text NOT NULL UNIQUE CHECK (user_code ~ '^[A-Z0-9]{8}$'),
  name text NOT NULL CHECK (length(name) BETWEEN 1 AND 60),
  user_id uuid REFERENCES neon_auth."user"(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  last_polled_at timestamptz,
  redeemed_at timestamptz
);
CREATE TABLE IF NOT EXISTS dhun.rate_limits (
  key text PRIMARY KEY,
  attempts integer NOT NULL,
  expires_at timestamptz NOT NULL
);

ALTER TABLE dhun.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE dhun.profiles FORCE ROW LEVEL SECURITY;
ALTER TABLE dhun.devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE dhun.devices FORCE ROW LEVEL SECURITY;
ALTER TABLE dhun.connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE dhun.rate_limits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS own_profile ON dhun.profiles;
CREATE POLICY own_profile ON dhun.profiles TO dhun_app
  USING (user_id::text = current_setting('dhun.user_id', true))
  WITH CHECK (user_id::text = current_setting('dhun.user_id', true));
DROP POLICY IF EXISTS own_devices ON dhun.devices;
CREATE POLICY own_devices ON dhun.devices TO dhun_app
  USING (user_id::text = current_setting('dhun.user_id', true))
  WITH CHECK (user_id::text = current_setting('dhun.user_id', true));
GRANT USAGE ON SCHEMA dhun TO dhun_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON dhun.profiles TO dhun_app;
GRANT SELECT, DELETE ON dhun.devices TO dhun_app;
REVOKE ALL ON dhun.connections, dhun.rate_limits FROM dhun_app;
REVOKE ALL ON ALL TABLES IN SCHEMA dhun FROM PUBLIC;

-- Optional, unlinked installation activity. Raw installation secrets are never stored.
CREATE TABLE IF NOT EXISTS dhun.activity (
  installation text NOT NULL CHECK (installation ~ '^[a-f0-9]{64}$'),
  day date NOT NULL DEFAULT (now() AT TIME ZONE 'UTC')::date,
  platform text NOT NULL CHECK (platform IN ('android','windows','mac')),
  version text NOT NULL CHECK (length(version) BETWEEN 1 AND 40),
  PRIMARY KEY (installation,day)
);
CREATE INDEX IF NOT EXISTS activity_day ON dhun.activity(day);
CREATE TABLE IF NOT EXISTS dhun.download_clicks (
  day date NOT NULL DEFAULT (now() AT TIME ZONE 'UTC')::date,
  platform text NOT NULL,
  clicks bigint NOT NULL DEFAULT 0,
  PRIMARY KEY (day,platform)
);
ALTER TABLE dhun.activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE dhun.download_clicks ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON dhun.activity, dhun.download_clicks FROM PUBLIC, dhun_app;

ALTER TABLE dhun.connections ADD COLUMN IF NOT EXISTS handoff_required boolean NOT NULL DEFAULT false;
ALTER TABLE dhun.connections ADD COLUMN IF NOT EXISTS handoff_hash text;

-- Separately consented account activity: one row per account/platform/UTC day.
ALTER TABLE dhun.profiles ADD COLUMN IF NOT EXISTS activity_consent_version text;
ALTER TABLE dhun.profiles ADD COLUMN IF NOT EXISTS activity_consented_at timestamptz;
CREATE TABLE IF NOT EXISTS dhun.account_activity (
  user_id uuid NOT NULL REFERENCES dhun.profiles(user_id) ON DELETE CASCADE,
  day date NOT NULL DEFAULT (now() AT TIME ZONE 'UTC')::date,
  platform text NOT NULL CHECK (platform IN ('android','windows','mac')),
  version text NOT NULL CHECK (length(version) BETWEEN 1 AND 40),
  PRIMARY KEY (user_id,day,platform)
);
CREATE INDEX IF NOT EXISTS account_activity_day ON dhun.account_activity(day);
ALTER TABLE dhun.account_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE dhun.account_activity FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS own_account_activity ON dhun.account_activity;
CREATE POLICY own_account_activity ON dhun.account_activity TO dhun_app
  USING (user_id::text = current_setting('dhun.user_id', true));
REVOKE ALL ON dhun.account_activity FROM PUBLIC, dhun_app;
GRANT SELECT ON dhun.account_activity TO dhun_app;

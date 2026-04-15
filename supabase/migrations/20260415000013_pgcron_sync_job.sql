-- Schedule the FlowCheck sync job from Postgres instead of Vercel Cron.
-- This lets the project deploy on Vercel Hobby (which forbids sub-daily crons).
-- The /api/cron/sync endpoint still validates Bearer ${CRON_SECRET}.

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Store the deployed app URL and shared cron secret in Supabase Vault.
-- Update both via SQL after the first Vercel deploy:
--   SELECT vault.update_secret(
--     (SELECT id FROM vault.secrets WHERE name = 'flowcheck_app_url'),
--     'https://flowcheck.vercel.app'
--   );
--   SELECT vault.update_secret(
--     (SELECT id FROM vault.secrets WHERE name = 'flowcheck_cron_secret'),
--     '<value of CRON_SECRET env var>'
--   );
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'flowcheck_app_url') THEN
    PERFORM vault.create_secret(
      'https://REPLACE_ME.vercel.app',
      'flowcheck_app_url',
      'FlowCheck deployed app base URL — update after first Vercel deploy'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'flowcheck_cron_secret') THEN
    PERFORM vault.create_secret(
      'REPLACE_ME',
      'flowcheck_cron_secret',
      'Bearer token for /api/cron/sync — must match CRON_SECRET env var on Vercel'
    );
  END IF;
END $$;

-- Helper that pg_cron will call every 15 minutes.
-- Reads URL + secret from Vault at call time so secret rotation does not require
-- re-scheduling the job.
CREATE OR REPLACE FUNCTION public.flowcheck_trigger_sync()
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE
  v_url text;
  v_secret text;
  v_request_id bigint;
BEGIN
  SELECT decrypted_secret INTO v_url
  FROM vault.decrypted_secrets
  WHERE name = 'flowcheck_app_url';

  SELECT decrypted_secret INTO v_secret
  FROM vault.decrypted_secrets
  WHERE name = 'flowcheck_cron_secret';

  IF v_url IS NULL OR v_secret IS NULL OR v_url LIKE '%REPLACE_ME%' OR v_secret = 'REPLACE_ME' THEN
    RAISE NOTICE 'flowcheck_trigger_sync skipped: vault secrets not configured';
    RETURN NULL;
  END IF;

  SELECT net.http_get(
    url := v_url || '/api/cron/sync',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || v_secret,
      'Content-Type', 'application/json'
    ),
    timeout_milliseconds := 60000
  )
  INTO v_request_id;

  RETURN v_request_id;
END;
$$;

REVOKE ALL ON FUNCTION public.flowcheck_trigger_sync() FROM PUBLIC;

-- Unschedule any pre-existing job with the same name to make this migration idempotent.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'flowcheck-sync-every-15-min') THEN
    PERFORM cron.unschedule('flowcheck-sync-every-15-min');
  END IF;
END $$;

SELECT cron.schedule(
  'flowcheck-sync-every-15-min',
  '*/15 * * * *',
  $cron$SELECT public.flowcheck_trigger_sync();$cron$
);

-- Rename FlowCheck → Runmend: vault secrets, trigger function, and cron job.
-- Applied on top of 20260415000013_pgcron_sync_job.sql (which is left untouched).

-- 1. Unschedule the old cron job.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'flowcheck-sync-every-15-min') THEN
    PERFORM cron.unschedule('flowcheck-sync-every-15-min');
  END IF;
END $$;

-- 2. Drop the old function.
DROP FUNCTION IF EXISTS public.flowcheck_trigger_sync();

-- 3. Rename vault secrets (delete old + create new, preserving values).
-- Direct UPDATE on vault.secrets requires superuser; use delete+create instead.
DO $$
DECLARE
  v_old_url_id uuid;
  v_old_url_val text;
  v_old_secret_id uuid;
  v_old_secret_val text;
BEGIN
  SELECT id, decrypted_secret INTO v_old_url_id, v_old_url_val
  FROM vault.decrypted_secrets WHERE name = 'flowcheck_app_url';

  SELECT id, decrypted_secret INTO v_old_secret_id, v_old_secret_val
  FROM vault.decrypted_secrets WHERE name = 'flowcheck_cron_secret';

  IF v_old_url_id IS NOT NULL THEN
    DELETE FROM vault.secrets WHERE id = v_old_url_id;
    PERFORM vault.create_secret(
      COALESCE(v_old_url_val, 'https://REPLACE_ME.vercel.app'),
      'runmend_app_url',
      'Runmend deployed app base URL — update after first Vercel deploy'
    );
  END IF;

  IF v_old_secret_id IS NOT NULL THEN
    DELETE FROM vault.secrets WHERE id = v_old_secret_id;
    PERFORM vault.create_secret(
      COALESCE(v_old_secret_val, 'REPLACE_ME'),
      'runmend_cron_secret',
      'Bearer token for /api/cron/sync — must match CRON_SECRET env var on Vercel'
    );
  END IF;
END $$;

-- 5. Create the renamed function (identical logic, new secret names).
CREATE OR REPLACE FUNCTION public.runmend_trigger_sync()
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
  WHERE name = 'runmend_app_url';

  SELECT decrypted_secret INTO v_secret
  FROM vault.decrypted_secrets
  WHERE name = 'runmend_cron_secret';

  IF v_url IS NULL OR v_secret IS NULL OR v_url LIKE '%REPLACE_ME%' OR v_secret = 'REPLACE_ME' THEN
    RAISE NOTICE 'runmend_trigger_sync skipped: vault secrets not configured';
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

REVOKE ALL ON FUNCTION public.runmend_trigger_sync() FROM PUBLIC;

-- 6. Schedule the renamed cron job.
SELECT cron.schedule(
  'runmend-sync-every-15-min',
  '*/15 * * * *',
  $cron$SELECT public.runmend_trigger_sync();$cron$
);

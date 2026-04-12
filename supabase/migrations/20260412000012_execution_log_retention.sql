-- Enable pg_cron for scheduled jobs (Supabase has this extension available)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Weekly cleanup: delete execution logs older than 90 days
-- Runs every Sunday at 3 AM UTC
SELECT cron.schedule(
  'cleanup-old-execution-logs',
  '0 3 * * 0',
  $$DELETE FROM public.execution_logs WHERE started_at < NOW() - INTERVAL '90 days'$$
);

-- Monthly cleanup: delete read notifications older than 30 days
SELECT cron.schedule(
  'cleanup-old-notifications',
  '0 4 1 * *',
  $$DELETE FROM public.notifications WHERE is_read = true AND created_at < NOW() - INTERVAL '30 days'$$
);

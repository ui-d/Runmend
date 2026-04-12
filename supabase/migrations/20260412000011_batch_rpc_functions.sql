-- RPC function to update per-automation stats in a single query
-- Replaces the N+1 loop in sync engine
CREATE OR REPLACE FUNCTION public.update_automation_stats(p_profile_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE public.automations a
  SET
    total_runs = stats.total,
    failed_runs = stats.failed,
    success_rate = CASE
      WHEN stats.total > 0
      THEN ROUND(((stats.total - stats.failed)::numeric / stats.total) * 100, 2)
      ELSE NULL
    END
  FROM (
    SELECT
      el.automation_id,
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE el.status = 'error')::int AS failed
    FROM public.execution_logs el
    WHERE el.automation_id IN (
      SELECT id FROM public.automations WHERE profile_id = p_profile_id
    )
    GROUP BY el.automation_id
  ) stats
  WHERE a.id = stats.automation_id;
$$;

-- RPC function to atomically update profile scenario count
-- Eliminates race condition between COUNT and UPDATE
CREATE OR REPLACE FUNCTION public.update_profile_scenario_count(p_profile_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE public.automation_profiles
  SET scenario_count = (
    SELECT COUNT(*)::int FROM public.automations WHERE profile_id = p_profile_id
  )
  WHERE id = p_profile_id;
$$;

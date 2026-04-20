-- Phase 10: Add detector type to automation_issues
-- Enables grouping issues by their detection rule (zombie, silent_failure, etc.)

ALTER TABLE public.automation_issues ADD COLUMN type text;

-- Backfill existing rows by matching the human-readable name to the rule type.
UPDATE public.automation_issues SET type = CASE
  WHEN name ILIKE 'Zombie%'                THEN 'zombie_automation'
  WHEN name ILIKE 'Silent failure%'        THEN 'silent_failure'
  WHEN name ILIKE 'High error rate%'       THEN 'high_error_rate'
  WHEN name ILIKE 'Error rate spike%'      THEN 'error_spike'
  WHEN name ILIKE 'Consecutive failures%'  THEN 'consecutive_failures'
  WHEN name ILIKE 'Credential%'            THEN 'credential_expiration'
  ELSE NULL
END
WHERE type IS NULL;

CREATE INDEX idx_automation_issues_profile_type_status
  ON public.automation_issues(profile_id, type, status);

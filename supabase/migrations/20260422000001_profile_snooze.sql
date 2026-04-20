-- Profile snooze: lets users mute alerting/triage attention for a profile
-- temporarily (e.g. while a known issue is being addressed). Filtering happens
-- at query time via `snoozed_until > now()`; null means not snoozed.

ALTER TABLE public.automation_profiles
  ADD COLUMN IF NOT EXISTS snoozed_until timestamptz;

CREATE INDEX IF NOT EXISTS idx_automation_profiles_snoozed_until
  ON public.automation_profiles (snoozed_until)
  WHERE snoozed_until IS NOT NULL;

-- Phase 6: Diagnostic Reports
-- Persists AI-generated diagnostic reports for audit history

CREATE TABLE public.diagnostic_reports (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id      uuid NOT NULL REFERENCES public.automation_profiles(id) ON DELETE CASCADE,
  triggered_by    text NOT NULL CHECK (triggered_by IN ('manual', 'scheduled', 'alert')),
  overall_health  text NOT NULL,
  most_dangerous  text NOT NULL,
  recommendations text NOT NULL,
  model_used      text NOT NULL,
  tokens_used     integer,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_diagnostic_reports_profile ON public.diagnostic_reports(profile_id);
CREATE INDEX idx_diagnostic_reports_created ON public.diagnostic_reports(created_at DESC);

ALTER TABLE public.diagnostic_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can read diagnostics for their profiles"
  ON public.diagnostic_reports FOR SELECT
  USING (
    profile_id IN (
      SELECT ap.id FROM public.automation_profiles ap
      WHERE ap.workspace_id IN (SELECT public.get_user_workspace_ids())
    )
  );

-- Phase 5: Automations & Execution Logs
-- Stores synced automation data and execution history from connected platforms

CREATE TABLE public.automations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id   uuid NOT NULL REFERENCES public.platform_connections(id) ON DELETE CASCADE,
  profile_id      uuid NOT NULL REFERENCES public.automation_profiles(id) ON DELETE CASCADE,
  external_id     text NOT NULL,
  name            text NOT NULL,
  status          text NOT NULL,
  trigger_type    text,
  last_run_at     timestamptz,
  success_rate    numeric(5,2),
  total_runs      integer NOT NULL DEFAULT 0,
  failed_runs     integer NOT NULL DEFAULT 0,
  raw_data        jsonb,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_automations_conn_ext ON public.automations(connection_id, external_id);
CREATE INDEX idx_automations_profile ON public.automations(profile_id);
CREATE INDEX idx_automations_connection ON public.automations(connection_id);

CREATE TABLE public.execution_logs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_id   uuid NOT NULL REFERENCES public.automations(id) ON DELETE CASCADE,
  external_id     text,
  status          text NOT NULL,
  started_at      timestamptz NOT NULL,
  finished_at     timestamptz,
  error_message   text,
  data_in         jsonb,
  data_out        jsonb,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_execution_logs_automation ON public.execution_logs(automation_id);
CREATE INDEX idx_execution_logs_started ON public.execution_logs(started_at DESC);

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

-- Automations: members can read; writes happen via service role (sync engine)
ALTER TABLE public.automations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can read automations in their workspaces"
  ON public.automations FOR SELECT
  USING (
    profile_id IN (
      SELECT ap.id FROM public.automation_profiles ap
      WHERE ap.workspace_id IN (SELECT public.get_user_workspace_ids())
    )
  );

-- Execution logs: members can read; writes happen via service role
ALTER TABLE public.execution_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can read execution logs"
  ON public.execution_logs FOR SELECT
  USING (
    automation_id IN (
      SELECT a.id FROM public.automations a
      JOIN public.automation_profiles ap ON ap.id = a.profile_id
      WHERE ap.workspace_id IN (SELECT public.get_user_workspace_ids())
    )
  );

-- =============================================================================
-- TRIGGERS
-- =============================================================================

CREATE TRIGGER set_updated_at_automations
  BEFORE UPDATE ON public.automations
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

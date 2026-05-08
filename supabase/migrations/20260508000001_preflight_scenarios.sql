-- Phase: Pre-flight Check core
-- Workspace-scoped reusable test suites that run real workflow inputs against
-- assertions to detect drift before agencies push changes (or after a client
-- silently breaks something downstream).
--
-- Tables: scenarios → inputs / assertions / runs → run_results.
-- All five tables denormalize workspace_id so RLS can scope every read with
-- the existing get_user_workspace_ids() helper.
--
-- Assertion check constraint covers all 7 types up front so PR #2's
-- llm_judge / latency / cost types do not need a schema change.

-- 1. Scenarios — the top-level configurable test suite.
CREATE TABLE IF NOT EXISTS public.preflight_scenarios (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id          uuid        NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  connection_id         uuid        NOT NULL REFERENCES public.platform_connections(id) ON DELETE CASCADE,
  automation_profile_id uuid        REFERENCES public.automation_profiles(id) ON DELETE SET NULL,
  name                  text        NOT NULL CHECK (char_length(name) BETWEEN 1 AND 120),
  description           text        CHECK (description IS NULL OR char_length(description) <= 500),
  workflow_external_id  text        NOT NULL CHECK (char_length(workflow_external_id) BETWEEN 1 AND 200),
  workflow_name         text        CHECK (workflow_name IS NULL OR char_length(workflow_name) <= 200),
  schedule_cron         text        CHECK (schedule_cron IS NULL OR char_length(schedule_cron) <= 120),
  baseline_run_id       uuid,       -- self-FK added below after preflight_runs exists
  cost_cap_cents        integer     NOT NULL DEFAULT 500 CHECK (cost_cap_cents > 0 AND cost_cap_cents <= 100000),
  enabled               boolean     NOT NULL DEFAULT true,
  archived_at           timestamptz,
  created_by            uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_preflight_scenarios_workspace
  ON public.preflight_scenarios (workspace_id) WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_preflight_scenarios_connection
  ON public.preflight_scenarios (connection_id) WHERE archived_at IS NULL;

-- 2. Inputs — sample inputs to drive a scenario run.
CREATE TABLE IF NOT EXISTS public.preflight_inputs (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id      uuid        NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  scenario_id       uuid        NOT NULL REFERENCES public.preflight_scenarios(id) ON DELETE CASCADE,
  input_data        jsonb       NOT NULL,
  label             text        CHECK (label IS NULL OR char_length(label) <= 200),
  source            text        NOT NULL DEFAULT 'manual'
                                CHECK (source IN ('manual', 'production_trace', 'imported_csv')),
  pii_redacted_at   timestamptz, -- non-null when source='production_trace' (enforced at insert layer)
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_preflight_inputs_scenario
  ON public.preflight_inputs (scenario_id);

-- 3. Assertions — what counts as pass/fail per output. All 7 types declared
--    up front so PR #2 can wire types 5-7 without a schema migration.
CREATE TABLE IF NOT EXISTS public.preflight_assertions (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id      uuid        NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  scenario_id       uuid        NOT NULL REFERENCES public.preflight_scenarios(id) ON DELETE CASCADE,
  assertion_type    text        NOT NULL CHECK (assertion_type IN (
                                  'json_schema_valid',
                                  'field_present',
                                  'field_matches',
                                  'field_in_set',
                                  'llm_judge',
                                  'latency_under_ms',
                                  'cost_under_cents'
                                )),
  config            jsonb       NOT NULL,
  severity          text        NOT NULL DEFAULT 'fail' CHECK (severity IN ('fail', 'warn')),
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_preflight_assertions_scenario
  ON public.preflight_assertions (scenario_id);

-- 4. Runs — one execution of a scenario.
CREATE TABLE IF NOT EXISTS public.preflight_runs (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id        uuid        NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  scenario_id         uuid        NOT NULL REFERENCES public.preflight_scenarios(id) ON DELETE CASCADE,
  triggered_by        text        NOT NULL CHECK (triggered_by IN ('manual', 'schedule', 'api', 'mcp')),
  triggered_by_user   uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  status              text        NOT NULL DEFAULT 'running'
                                  CHECK (status IN ('running', 'passed', 'failed', 'errored', 'cost_capped')),
  total_inputs        integer     NOT NULL DEFAULT 0,
  passed_count        integer     NOT NULL DEFAULT 0,
  failed_count        integer     NOT NULL DEFAULT 0,
  errored_count       integer     NOT NULL DEFAULT 0,
  pass_rate           numeric(5,4),
  total_cost_cents    integer     NOT NULL DEFAULT 0,
  total_latency_ms    bigint      NOT NULL DEFAULT 0,
  baseline_drift_pct  numeric(6,4),
  drift_eligible      boolean     NOT NULL DEFAULT false,
  started_at          timestamptz NOT NULL DEFAULT now(),
  completed_at        timestamptz
);

CREATE INDEX IF NOT EXISTS idx_preflight_runs_scenario_started
  ON public.preflight_runs (scenario_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_preflight_runs_workspace_started
  ON public.preflight_runs (workspace_id, started_at DESC);

-- Self-FK from scenarios.baseline_run_id → runs.id, now that both tables exist.
ALTER TABLE public.preflight_scenarios
  ADD CONSTRAINT preflight_scenarios_baseline_run_fk
  FOREIGN KEY (baseline_run_id)
  REFERENCES public.preflight_runs(id)
  ON DELETE SET NULL;

-- 5. Run results — per-input outcome.
CREATE TABLE IF NOT EXISTS public.preflight_run_results (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id        uuid        NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  run_id              uuid        NOT NULL REFERENCES public.preflight_runs(id) ON DELETE CASCADE,
  input_id            uuid        NOT NULL REFERENCES public.preflight_inputs(id) ON DELETE CASCADE,
  output_data         jsonb,
  passed              boolean     NOT NULL,
  assertion_results   jsonb       NOT NULL,
  latency_ms          integer,
  cost_cents          integer,
  error_message       text,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_preflight_results_run
  ON public.preflight_run_results (run_id);

-- 6. Workspace-and-platform integrity: connection must belong to the same
--    workspace as the scenario. Mirrors assert_profile_connection_match
--    from 20260422000002_multi_connection_support.sql.
CREATE OR REPLACE FUNCTION public.assert_scenario_connection_match()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.platform_connections c
    WHERE c.id = NEW.connection_id
      AND c.workspace_id = NEW.workspace_id
  ) THEN
    RAISE EXCEPTION
      'connection_id must belong to the same workspace as the scenario';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS assert_scenario_connection_match
  ON public.preflight_scenarios;

CREATE TRIGGER assert_scenario_connection_match
  BEFORE INSERT OR UPDATE ON public.preflight_scenarios
  FOR EACH ROW EXECUTE FUNCTION public.assert_scenario_connection_match();

-- 7. RLS — workspace members read; only admins write.
ALTER TABLE public.preflight_scenarios       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.preflight_inputs          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.preflight_assertions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.preflight_runs            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.preflight_run_results     ENABLE ROW LEVEL SECURITY;

-- Read policies (any workspace member)
CREATE POLICY "Members can read scenarios in their workspaces"
  ON public.preflight_scenarios FOR SELECT
  USING (workspace_id IN (SELECT public.get_user_workspace_ids()));

CREATE POLICY "Members can read inputs in their workspaces"
  ON public.preflight_inputs FOR SELECT
  USING (workspace_id IN (SELECT public.get_user_workspace_ids()));

CREATE POLICY "Members can read assertions in their workspaces"
  ON public.preflight_assertions FOR SELECT
  USING (workspace_id IN (SELECT public.get_user_workspace_ids()));

CREATE POLICY "Members can read runs in their workspaces"
  ON public.preflight_runs FOR SELECT
  USING (workspace_id IN (SELECT public.get_user_workspace_ids()));

CREATE POLICY "Members can read run results in their workspaces"
  ON public.preflight_run_results FOR SELECT
  USING (workspace_id IN (SELECT public.get_user_workspace_ids()));

-- Write policies (admins/owners only). Service role bypasses RLS so the
-- executor and cron can still write run/result rows.
CREATE POLICY "Admins can manage scenarios in their workspaces"
  ON public.preflight_scenarios FOR ALL
  USING (workspace_id IN (SELECT public.get_user_admin_workspace_ids()))
  WITH CHECK (workspace_id IN (SELECT public.get_user_admin_workspace_ids()));

CREATE POLICY "Admins can manage inputs in their workspaces"
  ON public.preflight_inputs FOR ALL
  USING (workspace_id IN (SELECT public.get_user_admin_workspace_ids()))
  WITH CHECK (workspace_id IN (SELECT public.get_user_admin_workspace_ids()));

CREATE POLICY "Admins can manage assertions in their workspaces"
  ON public.preflight_assertions FOR ALL
  USING (workspace_id IN (SELECT public.get_user_admin_workspace_ids()))
  WITH CHECK (workspace_id IN (SELECT public.get_user_admin_workspace_ids()));

-- updated_at maintenance for scenarios
CREATE OR REPLACE FUNCTION public.touch_preflight_scenarios_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS touch_preflight_scenarios_updated_at
  ON public.preflight_scenarios;

CREATE TRIGGER touch_preflight_scenarios_updated_at
  BEFORE UPDATE ON public.preflight_scenarios
  FOR EACH ROW EXECUTE FUNCTION public.touch_preflight_scenarios_updated_at();

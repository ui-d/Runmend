-- Phase 3: Automation Profiles & Issues
-- Creates automation_profiles and automation_issues with RLS

-- =============================================================================
-- TABLES
-- =============================================================================

CREATE TABLE public.automation_profiles (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name            text NOT NULL,
  platform        text NOT NULL CHECK (platform IN ('zapier', 'make', 'n8n')),
  scenario_count  integer NOT NULL DEFAULT 0,
  industry        text,
  description     text,
  health_score    integer NOT NULL DEFAULT 100 CHECK (health_score BETWEEN 0 AND 100),
  last_audit_at   timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.automation_issues (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id          uuid NOT NULL REFERENCES public.automation_profiles(id) ON DELETE CASCADE,
  severity            text NOT NULL CHECK (severity IN ('critical', 'warning', 'info')),
  name                text NOT NULL,
  automation_name     text NOT NULL,
  business_impact     text NOT NULL,
  recommendation      text NOT NULL,
  status              text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'acknowledged', 'resolved', 'dismissed')),
  resolved_at         timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

-- =============================================================================
-- INDEXES
-- =============================================================================

CREATE INDEX idx_automation_profiles_workspace ON public.automation_profiles(workspace_id);
CREATE INDEX idx_automation_issues_profile ON public.automation_issues(profile_id);
CREATE INDEX idx_automation_issues_status ON public.automation_issues(status);

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE public.automation_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can read profiles in their workspaces"
  ON public.automation_profiles FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Members can create profiles in their workspaces"
  ON public.automation_profiles FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Members can update profiles in their workspaces"
  ON public.automation_profiles FOR UPDATE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Owners and admins can delete profiles"
  ON public.automation_profiles FOR DELETE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

ALTER TABLE public.automation_issues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can read issues for their profiles"
  ON public.automation_issues FOR SELECT
  USING (
    profile_id IN (
      SELECT ap.id FROM public.automation_profiles ap
      JOIN public.workspace_members wm ON wm.workspace_id = ap.workspace_id
      WHERE wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Members can create issues for their profiles"
  ON public.automation_issues FOR INSERT
  WITH CHECK (
    profile_id IN (
      SELECT ap.id FROM public.automation_profiles ap
      JOIN public.workspace_members wm ON wm.workspace_id = ap.workspace_id
      WHERE wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Members can update issues for their profiles"
  ON public.automation_issues FOR UPDATE
  USING (
    profile_id IN (
      SELECT ap.id FROM public.automation_profiles ap
      JOIN public.workspace_members wm ON wm.workspace_id = ap.workspace_id
      WHERE wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Owners and admins can delete issues"
  ON public.automation_issues FOR DELETE
  USING (
    profile_id IN (
      SELECT ap.id FROM public.automation_profiles ap
      JOIN public.workspace_members wm ON wm.workspace_id = ap.workspace_id
      WHERE wm.user_id = auth.uid() AND wm.role IN ('owner', 'admin')
    )
  );

-- =============================================================================
-- TRIGGERS
-- =============================================================================

CREATE TRIGGER set_updated_at_automation_profiles
  BEFORE UPDATE ON public.automation_profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_automation_issues
  BEFORE UPDATE ON public.automation_issues
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

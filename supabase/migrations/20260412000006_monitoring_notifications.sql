-- Phase 7: Monitoring & Notifications
-- Audit schedules, in-app notifications, and notification preferences

-- =============================================================================
-- TABLES
-- =============================================================================

CREATE TABLE public.audit_schedules (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id      uuid NOT NULL REFERENCES public.automation_profiles(id) ON DELETE CASCADE,
  cron_expression text NOT NULL DEFAULT '0 8 * * *',
  is_active       boolean NOT NULL DEFAULT true,
  last_run_at     timestamptz,
  next_run_at     timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_audit_schedules_profile ON public.audit_schedules(profile_id);
CREATE INDEX idx_audit_schedules_next_run ON public.audit_schedules(next_run_at) WHERE is_active;

CREATE TABLE public.notifications (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  workspace_id        uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  type                text NOT NULL CHECK (type IN ('issue_detected', 'credential_expiring', 'audit_complete', 'connection_error')),
  title               text NOT NULL,
  body                text NOT NULL,
  is_read             boolean NOT NULL DEFAULT false,
  related_profile_id  uuid REFERENCES public.automation_profiles(id) ON DELETE SET NULL,
  related_issue_id    uuid REFERENCES public.automation_issues(id) ON DELETE SET NULL,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user_unread ON public.notifications(user_id) WHERE NOT is_read;
CREATE INDEX idx_notifications_workspace ON public.notifications(workspace_id);
CREATE INDEX idx_notifications_created ON public.notifications(created_at DESC);

CREATE TABLE public.notification_preferences (
  user_id       uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  workspace_id  uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  channel       text NOT NULL CHECK (channel IN ('in_app', 'email', 'slack')),
  is_enabled    boolean NOT NULL DEFAULT true,
  config        jsonb NOT NULL DEFAULT '{}',
  PRIMARY KEY (user_id, workspace_id, channel)
);

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE public.audit_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can read audit schedules for their profiles"
  ON public.audit_schedules FOR SELECT
  USING (
    profile_id IN (
      SELECT ap.id FROM public.automation_profiles ap
      WHERE ap.workspace_id IN (SELECT public.get_user_workspace_ids())
    )
  );

CREATE POLICY "Admins can manage audit schedules"
  ON public.audit_schedules FOR INSERT
  WITH CHECK (
    profile_id IN (
      SELECT ap.id FROM public.automation_profiles ap
      WHERE ap.workspace_id IN (SELECT public.get_user_admin_workspace_ids())
    )
  );

CREATE POLICY "Admins can update audit schedules"
  ON public.audit_schedules FOR UPDATE
  USING (
    profile_id IN (
      SELECT ap.id FROM public.automation_profiles ap
      WHERE ap.workspace_id IN (SELECT public.get_user_admin_workspace_ids())
    )
  );

CREATE POLICY "Admins can delete audit schedules"
  ON public.audit_schedules FOR DELETE
  USING (
    profile_id IN (
      SELECT ap.id FROM public.automation_profiles ap
      WHERE ap.workspace_id IN (SELECT public.get_user_admin_workspace_ids())
    )
  );

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own notifications"
  ON public.notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications"
  ON public.notifications FOR UPDATE
  USING (user_id = auth.uid());

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own preferences"
  ON public.notification_preferences FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can manage their own preferences"
  ON public.notification_preferences FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own preferences"
  ON public.notification_preferences FOR UPDATE
  USING (user_id = auth.uid());

-- =============================================================================
-- TRIGGERS
-- =============================================================================

CREATE TRIGGER set_updated_at_audit_schedules
  BEFORE UPDATE ON public.audit_schedules
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =============================================================================
-- ENABLE REALTIME for notifications
-- =============================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

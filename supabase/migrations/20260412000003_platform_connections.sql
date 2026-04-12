-- Phase 4: Platform Connections
-- Stores encrypted credentials for Zapier, Make.com, and n8n

CREATE TABLE public.platform_connections (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id            uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  platform                text NOT NULL CHECK (platform IN ('zapier', 'make', 'n8n')),
  auth_type               text NOT NULL CHECK (auth_type IN ('oauth', 'api_key', 'webhook')),
  credentials_vault_id    text,
  access_token_encrypted  text,
  refresh_token_encrypted text,
  token_expires_at        timestamptz,
  api_key_encrypted       text,
  instance_url            text,
  status                  text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'expired', 'revoked', 'error')),
  last_synced_at          timestamptz,
  error_message           text,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_platform_connections_ws_platform
  ON public.platform_connections(workspace_id, platform);
CREATE INDEX idx_platform_connections_workspace
  ON public.platform_connections(workspace_id);

ALTER TABLE public.platform_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can read connections in their workspaces"
  ON public.platform_connections FOR SELECT
  USING (workspace_id IN (SELECT public.get_user_workspace_ids()));

CREATE POLICY "Admins can create connections"
  ON public.platform_connections FOR INSERT
  WITH CHECK (
    workspace_id IN (SELECT public.get_user_admin_workspace_ids())
    OR workspace_id IN (
      SELECT w.id FROM public.workspaces w WHERE w.owner_id = auth.uid()
    )
  );

CREATE POLICY "Admins can update connections"
  ON public.platform_connections FOR UPDATE
  USING (workspace_id IN (SELECT public.get_user_admin_workspace_ids()));

CREATE POLICY "Admins can delete connections"
  ON public.platform_connections FOR DELETE
  USING (workspace_id IN (SELECT public.get_user_admin_workspace_ids()));

CREATE TRIGGER set_updated_at_platform_connections
  BEFORE UPDATE ON public.platform_connections
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

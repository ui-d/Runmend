-- Phase: Connections catalog redesign
-- Enables multi-instance connections (Make.com Primary + Client A + ...),
-- records when a connection was last tested, and captures roadmap signal
-- via per-user interest votes and free-text connector requests.

ALTER TABLE public.platform_connections
  ADD COLUMN IF NOT EXISTS display_name  text NOT NULL DEFAULT 'Primary',
  ADD COLUMN IF NOT EXISTS last_tested_at timestamptz;

-- Multi-instance: swap single-row-per-(workspace, platform) for
-- per-(workspace, platform, display_name). Existing rows keep 'Primary'.
DROP INDEX IF EXISTS public.idx_platform_connections_ws_platform;

CREATE UNIQUE INDEX IF NOT EXISTS idx_platform_connections_ws_platform_name
  ON public.platform_connections (workspace_id, platform, display_name);

-- Interest votes for unconnected / coming-soon platforms.
-- platform_slug is free-form text so the catalog can grow without migrations.
CREATE TABLE IF NOT EXISTS public.connection_interest (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id   uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform_slug  text NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, user_id, platform_slug)
);

CREATE INDEX IF NOT EXISTS idx_connection_interest_ws_slug
  ON public.connection_interest (workspace_id, platform_slug);

ALTER TABLE public.connection_interest ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can read interest in their workspaces"
  ON public.connection_interest FOR SELECT
  USING (workspace_id IN (SELECT public.get_user_workspace_ids()));

CREATE POLICY "Members can vote in their workspaces"
  ON public.connection_interest FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND workspace_id IN (SELECT public.get_user_workspace_ids())
  );

CREATE POLICY "Members can remove their own votes"
  ON public.connection_interest FOR DELETE
  USING (
    user_id = auth.uid()
    AND workspace_id IN (SELECT public.get_user_workspace_ids())
  );

-- Free-text "request a connector" submissions. Pre-launch validation signal.
CREATE TABLE IF NOT EXISTS public.connection_requests (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id   uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform_slug  text NOT NULL CHECK (char_length(platform_slug) BETWEEN 1 AND 120),
  note           text CHECK (note IS NULL OR char_length(note) <= 500),
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_connection_requests_ws_created
  ON public.connection_requests (workspace_id, created_at DESC);

ALTER TABLE public.connection_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can read requests in their workspaces"
  ON public.connection_requests FOR SELECT
  USING (workspace_id IN (SELECT public.get_user_workspace_ids()));

CREATE POLICY "Members can submit requests in their workspaces"
  ON public.connection_requests FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND workspace_id IN (SELECT public.get_user_workspace_ids())
  );

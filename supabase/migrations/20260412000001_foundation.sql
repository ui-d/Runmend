-- Phase 1: Foundation Tables
-- Creates users, workspaces, workspace_members with RLS and auto-profile trigger

-- =============================================================================
-- TABLES
-- =============================================================================

CREATE TABLE public.users (
  id            uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email         text NOT NULL,
  full_name     text,
  avatar_url    text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.workspaces (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  slug          text NOT NULL UNIQUE,
  owner_id      uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.workspace_members (
  workspace_id  uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id       uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role          text NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, user_id)
);

-- =============================================================================
-- INDEXES
-- =============================================================================

CREATE INDEX idx_workspace_members_user ON public.workspace_members(user_id);
CREATE INDEX idx_workspaces_owner ON public.workspaces(owner_id);
CREATE INDEX idx_workspaces_slug ON public.workspaces(slug);

-- =============================================================================
-- HELPER FUNCTIONS (avoid infinite recursion in RLS policies)
-- =============================================================================

-- Returns workspace IDs the current user belongs to (bypasses RLS)
CREATE OR REPLACE FUNCTION public.get_user_workspace_ids()
RETURNS SETOF uuid AS $$
  SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Returns workspace IDs where the current user is owner or admin (bypasses RLS)
CREATE OR REPLACE FUNCTION public.get_user_admin_workspace_ids()
RETURNS SETOF uuid AS $$
  SELECT workspace_id FROM public.workspace_members
  WHERE user_id = auth.uid() AND role IN ('owner', 'admin');
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

-- users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own profile"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = id);

-- workspaces
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can read their workspaces"
  ON public.workspaces FOR SELECT
  USING (
    id IN (SELECT public.get_user_workspace_ids())
    OR owner_id = auth.uid()
  );

CREATE POLICY "Authenticated users can create workspaces"
  ON public.workspaces FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can update their workspaces"
  ON public.workspaces FOR UPDATE
  USING (owner_id = auth.uid());

CREATE POLICY "Owners can delete their workspaces"
  ON public.workspaces FOR DELETE
  USING (owner_id = auth.uid());

-- workspace_members
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can read workspace membership"
  ON public.workspace_members FOR SELECT
  USING (workspace_id IN (SELECT public.get_user_workspace_ids()));

CREATE POLICY "Owners and admins can insert members"
  ON public.workspace_members FOR INSERT
  WITH CHECK (
    workspace_id IN (SELECT public.get_user_admin_workspace_ids())
    -- Also allow the workspace owner to insert themselves as the first member
    OR (
      user_id = auth.uid()
      AND workspace_id IN (
        SELECT w.id FROM public.workspaces w
        WHERE w.owner_id = auth.uid()
      )
    )
  );

CREATE POLICY "Owners and admins can update members"
  ON public.workspace_members FOR UPDATE
  USING (workspace_id IN (SELECT public.get_user_admin_workspace_ids()));

CREATE POLICY "Owners and admins can delete members"
  ON public.workspace_members FOR DELETE
  USING (workspace_id IN (SELECT public.get_user_admin_workspace_ids()));

-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- Auto-create public user profile when a new auth user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at_users
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_workspaces
  BEFORE UPDATE ON public.workspaces
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

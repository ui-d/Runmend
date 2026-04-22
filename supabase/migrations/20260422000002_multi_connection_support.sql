-- Phase: Multi-connection support per profile
-- platform_connections already supports multiple per (workspace, platform) via
-- display_name (see 20260423000001_connections_catalog.sql). This migration
-- adds the missing link: an explicit connection_id FK on automation_profiles
-- so each profile can point at a specific connection instead of being matched
-- implicitly by platform.

-- 1. Bind a profile to a specific connection. Nullable so legacy profiles and
--    profiles created before a connection exists remain valid.
ALTER TABLE public.automation_profiles
  ADD COLUMN IF NOT EXISTS connection_id UUID
    REFERENCES public.platform_connections(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_automation_profiles_connection
  ON public.automation_profiles(connection_id);

-- 2. Backfill: bind each existing profile to the first connection in its
--    workspace that matches the profile's platform.
UPDATE public.automation_profiles p
SET connection_id = sub.connection_id
FROM (
  SELECT DISTINCT ON (c.workspace_id, c.platform)
    c.workspace_id, c.platform, c.id AS connection_id
  FROM public.platform_connections c
  ORDER BY c.workspace_id, c.platform, c.created_at ASC
) sub
WHERE sub.workspace_id = p.workspace_id
  AND sub.platform = p.platform
  AND p.connection_id IS NULL;

-- 3. Enforce integrity: connection_id must belong to the same workspace AND
--    match the profile's platform. This replaces the implicit guarantee the
--    old (workspace_id, platform) UNIQUE index provided.
CREATE OR REPLACE FUNCTION public.assert_profile_connection_match()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.connection_id IS NULL THEN
    RETURN NEW;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.platform_connections c
    WHERE c.id = NEW.connection_id
      AND c.workspace_id = NEW.workspace_id
      AND c.platform = NEW.platform
  ) THEN
    RAISE EXCEPTION
      'connection_id must belong to the same workspace and platform as the profile';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS assert_profile_connection_match
  ON public.automation_profiles;

CREATE TRIGGER assert_profile_connection_match
  BEFORE INSERT OR UPDATE ON public.automation_profiles
  FOR EACH ROW EXECUTE FUNCTION public.assert_profile_connection_match();

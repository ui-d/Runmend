"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceMembership } from "@/lib/security/workspace-auth";
import { syncProfile } from "@/lib/sync/engine";

interface ActionResult {
  ok: boolean;
  error?: string;
}

async function assertConnectionAccess(
  connectionId: string,
): Promise<
  | { workspaceId: string; workspaceSlug: string; platform: string }
  | { error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: row } = await supabase
    .from("platform_connections")
    .select("id, workspace_id, platform, workspaces!inner(slug)")
    .eq("id", connectionId)
    .maybeSingle();

  if (!row) return { error: "Connection not found" };
  const ws = (row as unknown as { workspaces: { slug: string } }).workspaces;
  return {
    workspaceId: row.workspace_id,
    workspaceSlug: ws.slug,
    platform: row.platform,
  };
}

/**
 * Sync every profile whose automations live on this connection. We match
 * profiles by platform on first run (before any automation rows exist) so
 * the first "Sync now" after connect still pulls scenarios. Subsequent runs
 * iterate the profiles already linked via automations.connection_id.
 */
export async function syncConnectionAction(
  connectionId: string,
): Promise<ActionResult & { profilesSynced?: number }> {
  const access = await assertConnectionAccess(connectionId);
  if ("error" in access) return { ok: false, error: access.error };

  const supabase = await createClient();

  const { data: linked } = await supabase
    .from("automations")
    .select("profile_id")
    .eq("connection_id", connectionId);

  const profileIds = new Set<string>(
    (linked ?? []).map((row) => row.profile_id),
  );

  if (profileIds.size === 0) {
    const { data: profiles } = await supabase
      .from("automation_profiles")
      .select("id")
      .eq("workspace_id", access.workspaceId)
      .eq("platform", access.platform);
    for (const p of profiles ?? []) profileIds.add(p.id);
  }

  let succeeded = 0;
  const errors: string[] = [];
  for (const profileId of Array.from(profileIds)) {
    try {
      await syncProfile(profileId);
      succeeded += 1;
    } catch (err: unknown) {
      errors.push(err instanceof Error ? err.message : "sync failed");
    }
  }

  revalidatePath(`/app/${access.workspaceSlug}/connections`);

  if (profileIds.size === 0) {
    return {
      ok: false,
      error: "No profiles on this platform yet. Create a profile first.",
    };
  }
  if (errors.length > 0 && succeeded === 0) {
    return { ok: false, error: errors[0] };
  }
  return { ok: true, profilesSynced: succeeded };
}

/**
 * Toggle a user's interest vote for a platform slug. If the user has voted
 * already we remove the row so the button acts as an unvote; otherwise we
 * insert. Idempotent under race via the UNIQUE constraint on
 * (workspace_id, user_id, platform_slug).
 */
export async function toggleInterestAction(
  workspaceId: string,
  platformSlug: string,
): Promise<ActionResult & { voted?: boolean; count?: number }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Unauthorized" };

  const membership = await getWorkspaceMembership(supabase, workspaceId);
  if (!membership) return { ok: false, error: "Not a workspace member" };

  const { data: workspace } = await supabase
    .from("workspaces")
    .select("slug")
    .eq("id", workspaceId)
    .maybeSingle();

  const { data: existing } = await supabase
    .from("connection_interest")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("user_id", user.id)
    .eq("platform_slug", platformSlug)
    .maybeSingle();

  let voted: boolean;
  if (existing) {
    const { error } = await supabase
      .from("connection_interest")
      .delete()
      .eq("id", existing.id);
    if (error) return { ok: false, error: error.message };
    voted = false;
  } else {
    const { error } = await supabase.from("connection_interest").insert({
      workspace_id: workspaceId,
      user_id: user.id,
      platform_slug: platformSlug,
    });
    if (error) return { ok: false, error: error.message };
    voted = true;
  }

  const { count } = await supabase
    .from("connection_interest")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .eq("platform_slug", platformSlug);

  if (workspace?.slug) {
    revalidatePath(`/app/${workspace.slug}/connections`);
  }
  return { ok: true, voted, count: count ?? 0 };
}

export async function requestConnectorAction(
  workspaceId: string,
  input: { platformSlug: string; note?: string },
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Unauthorized" };

  const membership = await getWorkspaceMembership(supabase, workspaceId);
  if (!membership) return { ok: false, error: "Not a workspace member" };

  const slug = input.platformSlug.trim();
  if (slug.length === 0 || slug.length > 120) {
    return { ok: false, error: "Platform name must be 1-120 characters" };
  }
  const note = input.note?.trim() ? input.note.trim().slice(0, 500) : null;

  const { error } = await supabase.from("connection_requests").insert({
    workspace_id: workspaceId,
    user_id: user.id,
    platform_slug: slug,
    note,
  });
  if (error) return { ok: false, error: error.message };

  const { data: workspace } = await supabase
    .from("workspaces")
    .select("slug")
    .eq("id", workspaceId)
    .maybeSingle();
  if (workspace?.slug) revalidatePath(`/app/${workspace.slug}/connections`);

  return { ok: true };
}

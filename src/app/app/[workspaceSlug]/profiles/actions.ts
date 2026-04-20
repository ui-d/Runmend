"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { syncProfile as runProfileSync } from "@/lib/sync/engine";

interface ActionResult {
  ok: boolean;
  error?: string;
}

interface BulkActionResult {
  ok: boolean;
  succeeded: number;
  failed: number;
  errors: string[];
}

async function assertProfileAccess(
  profileId: string,
): Promise<{ workspaceId: string; workspaceSlug: string } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: profile } = await supabase
    .from("automation_profiles")
    .select("id, workspace_id, workspaces!inner(slug)")
    .eq("id", profileId)
    .maybeSingle();

  if (!profile) return { error: "Profile not found" };
  const workspaces = (profile as unknown as { workspaces: { slug: string } })
    .workspaces;
  return { workspaceId: profile.workspace_id, workspaceSlug: workspaces.slug };
}

export async function syncProfileAction(
  profileId: string,
): Promise<ActionResult> {
  const access = await assertProfileAccess(profileId);
  if ("error" in access) return { ok: false, error: access.error };

  try {
    await runProfileSync(profileId);
    revalidatePath(`/app/${access.workspaceSlug}/profiles`);
    return { ok: true };
  } catch (err: unknown) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Sync failed",
    };
  }
}

export async function bulkSyncProfilesAction(
  profileIds: string[],
): Promise<BulkActionResult> {
  const results = await Promise.allSettled(
    profileIds.map((id) => syncProfileAction(id)),
  );
  const errors: string[] = [];
  let succeeded = 0;
  let failed = 0;
  for (const r of results) {
    if (r.status === "fulfilled" && r.value.ok) succeeded += 1;
    else {
      failed += 1;
      const msg =
        r.status === "rejected"
          ? r.reason instanceof Error
            ? r.reason.message
            : "unknown"
          : (r.value.error ?? "unknown");
      errors.push(msg);
    }
  }
  return { ok: failed === 0, succeeded, failed, errors };
}

export async function deleteProfilesAction(
  profileIds: string[],
): Promise<ActionResult> {
  if (profileIds.length === 0) return { ok: true };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Unauthorized" };

  const { data: profiles } = await supabase
    .from("automation_profiles")
    .select("id, workspaces!inner(slug)")
    .in("id", profileIds);

  if (!profiles || profiles.length !== profileIds.length) {
    return { ok: false, error: "One or more profiles not found" };
  }

  const { error } = await supabase
    .from("automation_profiles")
    .delete()
    .in("id", profileIds);

  if (error) return { ok: false, error: error.message };

  const slugs = Array.from(
    new Set(
      (profiles as unknown as Array<{ workspaces: { slug: string } }>).map(
        (p) => p.workspaces.slug,
      ),
    ),
  );
  slugs.forEach((slug) => revalidatePath(`/app/${slug}/profiles`));
  return { ok: true };
}

export type SnoozeDuration = "1d" | "7d" | "indefinite" | "clear";

export async function snoozeProfileAction(
  profileId: string,
  duration: SnoozeDuration,
): Promise<ActionResult> {
  const access = await assertProfileAccess(profileId);
  if ("error" in access) return { ok: false, error: access.error };

  const supabase = await createClient();
  let snoozedUntil: string | null;
  if (duration === "clear") snoozedUntil = null;
  else if (duration === "indefinite") {
    const far = new Date();
    far.setUTCFullYear(far.getUTCFullYear() + 10);
    snoozedUntil = far.toISOString();
  } else {
    const days = duration === "1d" ? 1 : 7;
    const until = new Date();
    until.setUTCDate(until.getUTCDate() + days);
    snoozedUntil = until.toISOString();
  }

  const { error } = await supabase
    .from("automation_profiles")
    .update({ snoozed_until: snoozedUntil })
    .eq("id", profileId);

  if (error) return { ok: false, error: error.message };
  revalidatePath(`/app/${access.workspaceSlug}/profiles`);
  return { ok: true };
}

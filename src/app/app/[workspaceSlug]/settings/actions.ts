"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceMembership } from "@/lib/security/workspace-auth";
import { updateWorkspaceName } from "@/lib/queries/workspaces";
import { upsertNotificationPreference } from "@/lib/queries/notifications";
import {
  accountUpdateSchema,
  formatZodErrors,
  notificationPreferenceUpdateSchema,
  workspaceNameUpdateSchema,
} from "@/lib/validation/schemas";

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function updateWorkspaceNameAction(input: {
  workspaceId: string;
  name: string;
  workspaceSlug: string;
}): Promise<ActionResult> {
  const parsed = workspaceNameUpdateSchema.safeParse({
    workspaceId: input.workspaceId,
    name: input.name,
  });
  if (!parsed.success) {
    return { ok: false, error: formatZodErrors(parsed.error) };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const membership = await getWorkspaceMembership(supabase, parsed.data.workspaceId);
  if (!membership) return { ok: false, error: "Not a member of this workspace" };
  if (membership.role !== "owner" && membership.role !== "admin") {
    return { ok: false, error: "Only owners and admins can rename workspaces" };
  }

  try {
    await updateWorkspaceName(supabase, parsed.data.workspaceId, parsed.data.name);
  } catch {
    return { ok: false, error: "Could not update workspace name" };
  }

  revalidatePath(`/app/${input.workspaceSlug}/settings`, "layout");
  revalidatePath(`/app/${input.workspaceSlug}`, "layout");
  return { ok: true };
}

export async function updateAccountNameAction(input: {
  fullName: string;
  workspaceSlug: string;
}): Promise<ActionResult> {
  const parsed = accountUpdateSchema.safeParse({ fullName: input.fullName });
  if (!parsed.success) {
    return { ok: false, error: formatZodErrors(parsed.error) };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const trimmed = parsed.data.fullName;
  const { error } = await supabase
    .from("users")
    .update({
      full_name: trimmed === "" ? null : trimmed,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) return { ok: false, error: "Could not update account name" };

  revalidatePath(`/app/${input.workspaceSlug}`, "layout");
  return { ok: true };
}

export async function updateNotificationPreferenceAction(input: {
  workspaceId: string;
  workspaceSlug: string;
  channel: string;
  is_enabled: boolean;
  config: unknown;
}): Promise<ActionResult> {
  const parsed = notificationPreferenceUpdateSchema.safeParse({
    workspaceId: input.workspaceId,
    channel: input.channel,
    is_enabled: input.is_enabled,
    config: input.config,
  });
  if (!parsed.success) {
    return { ok: false, error: formatZodErrors(parsed.error) };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const membership = await getWorkspaceMembership(supabase, parsed.data.workspaceId);
  if (!membership) return { ok: false, error: "Not a member of this workspace" };

  try {
    await upsertNotificationPreference(supabase, {
      userId: user.id,
      workspaceId: parsed.data.workspaceId,
      channel: parsed.data.channel,
      is_enabled: parsed.data.is_enabled,
      config: parsed.data.config,
    });
  } catch {
    return { ok: false, error: "Could not save notification preference" };
  }

  revalidatePath(`/app/${input.workspaceSlug}/settings/alerts`);
  return { ok: true };
}

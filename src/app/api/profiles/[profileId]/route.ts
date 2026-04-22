import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceMembership } from "@/lib/security/workspace-auth";
import { updateProfile } from "@/lib/queries/profiles";
import { formatZodErrors, profileUpdateSchema } from "@/lib/validation/schemas";

interface RouteContext {
  params: Promise<{ profileId: string }>;
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { profileId } = await context.params;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = profileUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: formatZodErrors(parsed.error) },
        { status: 400 },
      );
    }

    const { data: profile, error: profileErr } = await supabase
      .from("automation_profiles")
      .select("id, workspace_id, name")
      .eq("id", profileId)
      .maybeSingle();
    if (profileErr) throw profileErr;
    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const membership = await getWorkspaceMembership(supabase, profile.workspace_id);
    if (!membership) {
      return NextResponse.json(
        { error: "Not a member of this workspace" },
        { status: 403 },
      );
    }

    try {
      const updated = await updateProfile(supabase, profileId, {
        connection_id: parsed.data.connection_id,
      });

      const { data: workspace } = await supabase
        .from("workspaces")
        .select("slug")
        .eq("id", profile.workspace_id)
        .maybeSingle();
      if (workspace?.slug) {
        revalidatePath(`/app/${workspace.slug}/profiles/${profileId}`);
        revalidatePath(`/app/${workspace.slug}/connections`);
      }

      return NextResponse.json({ profile: updated });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to update profile";
      return NextResponse.json({ error: message }, { status: 400 });
    }
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to update profile";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

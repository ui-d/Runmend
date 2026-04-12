import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { markAllNotificationsRead } from "@/lib/queries/notifications";
import { getWorkspaceMembership } from "@/lib/security/workspace-auth";
import { markAllReadSchema, formatZodErrors } from "@/lib/validation/schemas";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = markAllReadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: formatZodErrors(parsed.error) },
        { status: 400 }
      );
    }
    const { workspaceId } = parsed.data;

    const membership = await getWorkspaceMembership(supabase, workspaceId);
    if (!membership) {
      return NextResponse.json(
        { error: "Not a member of this workspace" },
        { status: 403 }
      );
    }

    await markAllNotificationsRead(supabase, user.id, workspaceId);
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to mark all as read";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

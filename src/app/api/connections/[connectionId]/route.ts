import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceMembership } from "@/lib/security/workspace-auth";
import { uuidParamSchema } from "@/lib/validation/schemas";

interface RouteContext {
  params: Promise<{ connectionId: string }>;
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { connectionId } = await context.params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const idCheck = uuidParamSchema.safeParse(connectionId);
    if (!idCheck.success) {
      return NextResponse.json(
        { error: "Invalid connection id" },
        { status: 400 },
      );
    }

    const { data: connection } = await supabase
      .from("platform_connections")
      .select("workspace_id")
      .eq("id", connectionId)
      .maybeSingle();

    if (!connection) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const membership = await getWorkspaceMembership(
      supabase,
      connection.workspace_id,
    );
    if (!membership) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const { error } = await supabase
      .from("platform_connections")
      .delete()
      .eq("id", connectionId);

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to delete connection";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

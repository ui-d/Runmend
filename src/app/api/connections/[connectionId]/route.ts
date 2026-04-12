import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface RouteContext {
  params: Promise<{ connectionId: string }>;
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { connectionId } = await context.params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

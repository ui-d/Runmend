import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { decrypt } from "@/lib/crypto";
import { createAdapter } from "@/lib/platform-adapters";
import { getWorkspaceMembership } from "@/lib/security/workspace-auth";
import { uuidParamSchema } from "@/lib/validation/schemas";

interface RouteContext {
  params: Promise<{ connectionId: string }>;
}

export async function POST(_request: NextRequest, context: RouteContext) {
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

    const { data: connection, error } = await supabase
      .from("platform_connections")
      .select("*")
      .eq("id", connectionId)
      .maybeSingle();

    if (error || !connection) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const membership = await getWorkspaceMembership(
      supabase,
      connection.workspace_id,
    );
    if (!membership) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const apiKey = connection.api_key_encrypted
      ? decrypt(connection.api_key_encrypted)
      : undefined;

    const adapter = createAdapter(
      connection.platform as "make" | "n8n",
      {
        apiKey,
        instanceUrl: connection.instance_url || undefined,
        zone: connection.zone || undefined,
        teamId: connection.team_id || undefined,
      }
    );

    const result = await adapter.testConnection();
    const teamId = (result.metadata?.teamId as number | null) ?? null;

    await supabase
      .from("platform_connections")
      .update({
        status: result.ok ? "active" : "error",
        error_message: result.error || null,
        ...(teamId ? { team_id: teamId } : {}),
      })
      .eq("id", connectionId);

    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Test failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { decrypt } from "@/lib/crypto";
import { createAdapter } from "@/lib/platform-adapters";

interface RouteContext {
  params: Promise<{ connectionId: string }>;
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { connectionId } = await context.params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: connection, error } = await supabase
      .from("platform_connections")
      .select("*")
      .eq("id", connectionId)
      .single();

    if (error || !connection) {
      return NextResponse.json(
        { error: "Connection not found" },
        { status: 404 }
      );
    }

    // Webhook connections don't need credential decryption
    if (connection.auth_type === "webhook") {
      const isValid = !!connection.webhook_token;
      await supabase
        .from("platform_connections")
        .update({
          status: isValid ? "active" : "error",
          error_message: isValid ? null : "Webhook token missing",
        })
        .eq("id", connectionId);

      return NextResponse.json({ ok: isValid });
    }

    const apiKey = connection.api_key_encrypted
      ? decrypt(connection.api_key_encrypted)
      : undefined;

    const adapter = createAdapter(
      connection.platform as "zapier" | "make" | "n8n",
      {
        apiKey,
        instanceUrl: connection.instance_url || undefined,
      }
    );

    const result = await adapter.testConnection();

    // Update status
    await supabase
      .from("platform_connections")
      .update({
        status: result.ok ? "active" : "error",
        error_message: result.error || null,
      })
      .eq("id", connectionId);

    return NextResponse.json(result);
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Test failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

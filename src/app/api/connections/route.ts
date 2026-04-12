import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { encrypt } from "@/lib/crypto";
import { createAdapter } from "@/lib/platform-adapters";

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
    const { workspaceId, platform, apiKey, instanceUrl, zone } = body;

    if (!workspaceId || !platform) {
      return NextResponse.json(
        { error: "workspaceId and platform are required" },
        { status: 400 }
      );
    }

    if (platform !== "zapier" && platform !== "make" && platform !== "n8n") {
      return NextResponse.json(
        { error: "Invalid platform" },
        { status: 400 }
      );
    }

    // Test connection before saving
    const adapter = createAdapter(platform, { apiKey, instanceUrl, zone });
    const testResult = await adapter.testConnection();

    // Encrypt credentials
    const encryptedApiKey = apiKey ? encrypt(apiKey) : null;

    // Upsert connection
    const { data, error } = await supabase
      .from("platform_connections")
      .upsert(
        {
          workspace_id: workspaceId,
          platform,
          auth_type: platform === "zapier" ? "oauth" : "api_key",
          api_key_encrypted: encryptedApiKey,
          instance_url: instanceUrl || null,
          status: testResult.ok ? "active" : "error",
          error_message: testResult.error || null,
        },
        { onConflict: "workspace_id,platform" }
      )
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ connection: data, testResult });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to create connection";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { encrypt, hashToken } from "@/lib/crypto";
import { createAdapter } from "@/lib/platform-adapters";
import { getWorkspaceMembership } from "@/lib/security/workspace-auth";
import { connectionCreateSchema, formatZodErrors } from "@/lib/validation/schemas";

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
    const parsed = connectionCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: formatZodErrors(parsed.error) },
        { status: 400 }
      );
    }
    const { workspaceId, platform, apiKey, instanceUrl, zone } = parsed.data;

    const membership = await getWorkspaceMembership(supabase, workspaceId);
    if (!membership) {
      return NextResponse.json(
        { error: "Not a member of this workspace" },
        { status: 403 }
      );
    }

    // Zapier uses webhook-based auth (no API key needed)
    if (platform === "zapier") {
      const webhookToken = randomBytes(32).toString("hex");
      const webhookTokenHash = hashToken(webhookToken);
      const adapter = createAdapter(platform, { authType: "webhook" });
      const testResult = await adapter.testConnection();

      const { data, error } = await supabase
        .from("platform_connections")
        .upsert(
          {
            workspace_id: workspaceId,
            platform,
            auth_type: "webhook" as const,
            webhook_token: webhookToken,
            webhook_token_hash: webhookTokenHash,
            api_key_encrypted: null,
            instance_url: null,
            status: testResult.ok ? "active" : "error",
            error_message: testResult.error || null,
          },
          { onConflict: "workspace_id,platform" }
        )
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ connection: data, testResult });
    }

    // Make.com / n8n use API key auth
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
          auth_type: "api_key" as const,
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

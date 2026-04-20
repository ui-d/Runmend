import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { encrypt } from "@/lib/crypto";
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
    const { workspaceId, platform, apiKey, instanceUrl, zone, displayName } =
      parsed.data;

    const membership = await getWorkspaceMembership(supabase, workspaceId);
    if (!membership) {
      return NextResponse.json(
        { error: "Not a member of this workspace" },
        { status: 403 }
      );
    }

    const adapter = createAdapter(platform, { apiKey, instanceUrl, zone });
    const testResult = await adapter.testConnection();

    // Encrypt credentials
    const encryptedApiKey = apiKey ? encrypt(apiKey) : null;
    const teamId = testResult.metadata?.teamId as number | null ?? null;

    // Upsert connection
    const { data, error } = await supabase
      .from("platform_connections")
      .upsert(
        {
          workspace_id: workspaceId,
          platform,
          display_name: displayName?.trim() || "Primary",
          auth_type: "api_key" as const,
          api_key_encrypted: encryptedApiKey,
          instance_url: instanceUrl || null,
          zone: zone || null,
          team_id: teamId,
          status: testResult.ok ? "active" : "error",
          error_message: testResult.error || null,
          last_tested_at: new Date().toISOString(),
        },
        { onConflict: "workspace_id,platform,display_name" }
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

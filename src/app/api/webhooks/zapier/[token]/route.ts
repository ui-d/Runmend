import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";

const webhookPayloadSchema = z.object({
  zapId: z.string().min(1),
  zapName: z.string().min(1),
  status: z.enum(["success", "error"]),
  startedAt: z.string().min(1),
  errorMessage: z.string().nullish(),
});

interface RouteContext {
  params: Promise<{ token: string }>;
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { token } = await context.params;
  const admin = createAdminClient();

  try {
    // 1. Validate token against active connections
    const { data: connection, error: connError } = await admin
      .from("platform_connections")
      .select("id, workspace_id, status")
      .eq("webhook_token", token)
      .single();

    if (connError || !connection) {
      return NextResponse.json(
        { error: "Invalid webhook token" },
        { status: 401 }
      );
    }

    if (connection.status !== "active") {
      return NextResponse.json(
        { error: "Connection is not active" },
        { status: 401 }
      );
    }

    // 2. Parse and validate payload
    const rawBody = await request.json();
    const parsed = webhookPayloadSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid payload",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const payload = parsed.data;

    // 3. Find the Zapier profile for this workspace
    const { data: profile } = await admin
      .from("automation_profiles")
      .select("id")
      .eq("workspace_id", connection.workspace_id)
      .eq("platform", "zapier")
      .limit(1)
      .single();

    if (!profile) {
      return NextResponse.json(
        {
          error:
            "No Zapier profile found for this workspace. Create a Zapier automation profile first.",
        },
        { status: 422 }
      );
    }

    // 4. Find or create automation (auto-discovery)
    let { data: automation } = await admin
      .from("automations")
      .select("id")
      .eq("connection_id", connection.id)
      .eq("external_id", payload.zapId)
      .single();

    if (!automation) {
      const { data: newAutomation, error: createError } = await admin
        .from("automations")
        .insert({
          connection_id: connection.id,
          profile_id: profile.id,
          external_id: payload.zapId,
          name: payload.zapName,
          status: "active",
          trigger_type: "webhook",
          last_run_at: payload.startedAt,
        })
        .select("id")
        .single();

      if (createError) {
        return NextResponse.json(
          { error: "Failed to create automation record" },
          { status: 500 }
        );
      }

      automation = newAutomation;
    }

    // 5. Insert execution log
    const externalId = `${payload.zapId}-${payload.startedAt}`;

    await admin.from("execution_logs").insert({
      automation_id: automation!.id,
      external_id: externalId,
      status: payload.status,
      started_at: payload.startedAt,
      finished_at: payload.startedAt,
      error_message: payload.errorMessage ?? null,
    });

    // 6. Update automation metadata
    await admin
      .from("automations")
      .update({
        name: payload.zapName,
        last_run_at: payload.startedAt,
      })
      .eq("id", automation!.id);

    return NextResponse.json({ received: true });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Webhook processing failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

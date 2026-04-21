import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { markNotificationRead } from "@/lib/queries/notifications";
import { uuidParamSchema } from "@/lib/validation/schemas";

interface RouteContext {
  params: Promise<{ notificationId: string }>;
}

export async function PATCH(_request: NextRequest, context: RouteContext) {
  try {
    const { notificationId } = await context.params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const idCheck = uuidParamSchema.safeParse(notificationId);
    if (!idCheck.success) {
      return NextResponse.json(
        { error: "Invalid notification id" },
        { status: 400 },
      );
    }

    await markNotificationRead(supabase, notificationId);
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to mark as read";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

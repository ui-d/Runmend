import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserNotifications } from "@/lib/queries/notifications";
import { notificationQuerySchema } from "@/lib/validation/schemas";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const rawLimit = parseInt(searchParams.get("limit") ?? "20", 10);
    const parsed = notificationQuerySchema.safeParse({
      workspaceId: searchParams.get("workspaceId") ?? undefined,
      unreadOnly: searchParams.get("unreadOnly") === "true",
      limit: isNaN(rawLimit) ? 20 : rawLimit,
    });

    const { workspaceId, unreadOnly, limit } = parsed.success
      ? parsed.data
      : { workspaceId: undefined, unreadOnly: false, limit: 20 };

    const notifications = await getUserNotifications(supabase, user.id, {
      workspaceId,
      unreadOnly,
      limit,
    });

    return NextResponse.json({ notifications });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to fetch notifications";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

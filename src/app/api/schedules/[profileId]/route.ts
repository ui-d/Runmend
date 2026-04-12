import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getProfileSchedule, upsertSchedule, toggleSchedule } from "@/lib/queries/schedules";
import { scheduleUpsertSchema, scheduleToggleSchema, formatZodErrors } from "@/lib/validation/schemas";

interface RouteContext {
  params: Promise<{ profileId: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { profileId } = await context.params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const schedule = await getProfileSchedule(supabase, profileId);
    return NextResponse.json({ schedule });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to fetch schedule";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { profileId } = await context.params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = scheduleUpsertSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: formatZodErrors(parsed.error) },
        { status: 400 }
      );
    }

    const schedule = await upsertSchedule(
      supabase,
      profileId,
      parsed.data.cronExpression,
      parsed.data.isActive
    );

    return NextResponse.json({ schedule });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to update schedule";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { profileId } = await context.params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = scheduleToggleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: formatZodErrors(parsed.error) },
        { status: 400 }
      );
    }
    await toggleSchedule(supabase, profileId, parsed.data.isActive);
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to toggle schedule";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

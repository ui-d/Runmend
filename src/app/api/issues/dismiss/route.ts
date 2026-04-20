import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  dismissIssuesSchema,
  formatZodErrors,
} from "@/lib/validation/schemas";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const parsed = dismissIssuesSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: formatZodErrors(parsed.error) },
        { status: 400 }
      );
    }

    const { issueIds } = parsed.data;

    // RLS on automation_issues enforces workspace membership for UPDATE.
    // We still trust Postgres to reject any IDs the user can't touch,
    // but we also return the count actually updated for the UI to reconcile.
    const { data: updated, error } = await supabase
      .from("automation_issues")
      .update({
        status: "dismissed",
        resolved_at: new Date().toISOString(),
      })
      .in("id", issueIds)
      .eq("status", "open")
      .select("id");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      dismissed: updated?.length ?? 0,
      requested: issueIds.length,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Dismiss failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

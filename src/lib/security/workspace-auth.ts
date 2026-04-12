import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

/**
 * Verifies that the authenticated user is a member of the given workspace.
 * Returns the member's role, or null if not a member.
 */
export async function getWorkspaceMembership(
  supabase: SupabaseClient<Database>,
  workspaceId: string
): Promise<{ role: string } | null> {
  const { data } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .limit(1)
    .maybeSingle();

  return data;
}

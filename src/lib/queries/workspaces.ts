import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

type Client = SupabaseClient<Database>;
type WorkspaceRow = Database["public"]["Tables"]["workspaces"]["Row"];
type WorkspaceMemberRow = Database["public"]["Tables"]["workspace_members"]["Row"];

export async function getUserWorkspaces(supabase: Client) {
  const { data, error } = await supabase
    .from("workspaces")
    .select("*, workspace_members!inner(role)")
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data as (WorkspaceRow & { workspace_members: Pick<WorkspaceMemberRow, "role">[] })[];
}

export async function getWorkspaceBySlug(supabase: Client, slug: string) {
  const { data, error } = await supabase
    .from("workspaces")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error && error.code !== "PGRST116") throw error;
  return data;
}

export async function createWorkspace(
  supabase: Client,
  input: { name: string; slug: string; ownerId: string }
) {
  const { data: workspace, error: wsError } = await supabase
    .from("workspaces")
    .insert({ name: input.name, slug: input.slug, owner_id: input.ownerId })
    .select()
    .single();

  if (wsError) throw wsError;

  // Add the owner as a workspace member
  const { error: memberError } = await supabase
    .from("workspace_members")
    .insert({
      workspace_id: workspace.id,
      user_id: input.ownerId,
      role: "owner",
    });

  if (memberError) throw memberError;
  return workspace;
}

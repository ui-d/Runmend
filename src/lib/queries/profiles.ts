import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

type Client = SupabaseClient<Database>;
type ProfileRow = Database["public"]["Tables"]["automation_profiles"]["Row"];
type IssueRow = Database["public"]["Tables"]["automation_issues"]["Row"];

export async function getWorkspaceProfiles(
  supabase: Client,
  workspaceId: string
) {
  const { data, error } = await supabase
    .from("automation_profiles")
    .select("*, automation_issues(id, severity)")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data as (ProfileRow & {
    automation_issues: Pick<IssueRow, "id" | "severity">[];
  })[];
}

export async function getProfileById(supabase: Client, profileId: string) {
  const { data, error } = await supabase
    .from("automation_profiles")
    .select("*, automation_issues(*)")
    .eq("id", profileId)
    .single();

  if (error && error.code !== "PGRST116") throw error;
  return data as
    | (ProfileRow & { automation_issues: IssueRow[] })
    | null;
}

export async function createProfile(
  supabase: Client,
  input: {
    workspaceId: string;
    name: string;
    platform: "make" | "n8n";
    industry?: string;
    description?: string;
  }
) {
  const { data, error } = await supabase
    .from("automation_profiles")
    .insert({
      workspace_id: input.workspaceId,
      name: input.name,
      platform: input.platform,
      industry: input.industry ?? null,
      description: input.description ?? null,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateProfile(
  supabase: Client,
  profileId: string,
  input: {
    name?: string;
    platform?: "make" | "n8n";
    industry?: string | null;
    description?: string | null;
    scenario_count?: number;
    health_score?: number;
  }
) {
  const { data, error } = await supabase
    .from("automation_profiles")
    .update(input)
    .eq("id", profileId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteProfile(supabase: Client, profileId: string) {
  const { error } = await supabase
    .from("automation_profiles")
    .delete()
    .eq("id", profileId);

  if (error) throw error;
}

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

type Client = SupabaseClient<Database>;
type ConnectionRow = Database["public"]["Tables"]["platform_connections"]["Row"];

export async function getWorkspaceConnections(
  supabase: Client,
  workspaceId: string
): Promise<ConnectionRow[]> {
  const { data, error } = await supabase
    .from("platform_connections")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data;
}

export async function getConnectionById(
  supabase: Client,
  connectionId: string
): Promise<ConnectionRow | null> {
  const { data, error } = await supabase
    .from("platform_connections")
    .select("*")
    .eq("id", connectionId)
    .single();

  if (error && error.code !== "PGRST116") throw error;
  return data;
}

export async function upsertConnection(
  supabase: Client,
  input: Database["public"]["Tables"]["platform_connections"]["Insert"]
): Promise<ConnectionRow> {
  const { data, error } = await supabase
    .from("platform_connections")
    .upsert(input, { onConflict: "workspace_id,platform" })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteConnection(
  supabase: Client,
  connectionId: string
): Promise<void> {
  const { error } = await supabase
    .from("platform_connections")
    .delete()
    .eq("id", connectionId);

  if (error) throw error;
}

export async function updateConnectionStatus(
  supabase: Client,
  connectionId: string,
  status: string,
  errorMessage?: string | null
): Promise<void> {
  const { error } = await supabase
    .from("platform_connections")
    .update({
      status: status as ConnectionRow["status"],
      error_message: errorMessage ?? null,
      ...(status === "active" ? { last_synced_at: new Date().toISOString() } : {}),
    })
    .eq("id", connectionId);

  if (error) throw error;
}

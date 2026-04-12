import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

type Client = SupabaseClient<Database>;
type DiagnosticReportRow = Database["public"]["Tables"]["diagnostic_reports"]["Row"];

export async function saveDiagnosticReport(
  supabase: Client,
  input: Database["public"]["Tables"]["diagnostic_reports"]["Insert"]
): Promise<DiagnosticReportRow> {
  const { data, error } = await supabase
    .from("diagnostic_reports")
    .insert(input)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getProfileDiagnostics(
  supabase: Client,
  profileId: string,
  limit: number = 20
): Promise<DiagnosticReportRow[]> {
  const { data, error } = await supabase
    .from("diagnostic_reports")
    .select("*")
    .eq("profile_id", profileId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
}

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

type Client = SupabaseClient<Database>;
type SubscriptionRow = Database["public"]["Tables"]["subscriptions"]["Row"];

export async function getWorkspaceSubscription(
  supabase: Client,
  workspaceId: string
): Promise<SubscriptionRow | null> {
  const { data, error } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function upsertSubscription(
  supabase: Client,
  input: Database["public"]["Tables"]["subscriptions"]["Insert"]
): Promise<SubscriptionRow> {
  const { data, error } = await supabase
    .from("subscriptions")
    .upsert(input, { onConflict: "workspace_id" })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateSubscriptionByStripeId(
  supabase: Client,
  stripeCustomerId: string,
  updates: Partial<Database["public"]["Tables"]["subscriptions"]["Update"]>
): Promise<void> {
  const { error } = await supabase
    .from("subscriptions")
    .update(updates)
    .eq("stripe_customer_id", stripeCustomerId);

  if (error) throw error;
}

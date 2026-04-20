import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import type { NotificationConfig, NotificationChannel } from "@/lib/notifications/config";

type Client = SupabaseClient<Database>;
type NotificationRow = Database["public"]["Tables"]["notifications"]["Row"];
type PreferenceRow = Database["public"]["Tables"]["notification_preferences"]["Row"];

export interface ChannelPreference {
  channel: NotificationChannel;
  is_enabled: boolean;
  config: NotificationConfig;
}

export async function getNotificationPreferences(
  supabase: Client,
  userId: string,
  workspaceId: string
): Promise<PreferenceRow[]> {
  const { data, error } = await supabase
    .from("notification_preferences")
    .select("*")
    .eq("user_id", userId)
    .eq("workspace_id", workspaceId);

  if (error) throw error;
  return data;
}

export async function upsertNotificationPreference(
  supabase: Client,
  input: {
    userId: string;
    workspaceId: string;
    channel: NotificationChannel;
    is_enabled: boolean;
    config: NotificationConfig;
  }
): Promise<void> {
  const { error } = await supabase.from("notification_preferences").upsert(
    {
      user_id: input.userId,
      workspace_id: input.workspaceId,
      channel: input.channel,
      is_enabled: input.is_enabled,
      config: input.config as unknown as Database["public"]["Tables"]["notification_preferences"]["Insert"]["config"],
    },
    { onConflict: "user_id,workspace_id,channel" }
  );

  if (error) throw error;
}

export async function getUserNotifications(
  supabase: Client,
  userId: string,
  options?: { workspaceId?: string; unreadOnly?: boolean; limit?: number }
): Promise<NotificationRow[]> {
  let query = supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(options?.limit ?? 20);

  if (options?.workspaceId) {
    query = query.eq("workspace_id", options.workspaceId);
  }
  if (options?.unreadOnly) {
    query = query.eq("is_read", false);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function markNotificationRead(
  supabase: Client,
  notificationId: string
): Promise<void> {
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", notificationId);

  if (error) throw error;
}

export async function markAllNotificationsRead(
  supabase: Client,
  userId: string,
  workspaceId: string
): Promise<void> {
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", userId)
    .eq("workspace_id", workspaceId)
    .eq("is_read", false);

  if (error) throw error;
}

export async function createNotification(
  supabase: Client,
  input: Database["public"]["Tables"]["notifications"]["Insert"]
): Promise<NotificationRow> {
  const { data, error } = await supabase
    .from("notifications")
    .insert(input)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function createNotificationsForWorkspaceMembers(
  adminSupabase: Client,
  workspaceId: string,
  notification: Omit<
    Database["public"]["Tables"]["notifications"]["Insert"],
    "user_id" | "workspace_id"
  >
): Promise<void> {
  // Fetch all members
  const { data: members, error: memberError } = await adminSupabase
    .from("workspace_members")
    .select("user_id")
    .eq("workspace_id", workspaceId);

  if (memberError || !members) return;

  const inserts = members.map((m) => ({
    ...notification,
    user_id: m.user_id,
    workspace_id: workspaceId,
  }));

  if (inserts.length > 0) {
    await adminSupabase.from("notifications").insert(inserts);
  }
}

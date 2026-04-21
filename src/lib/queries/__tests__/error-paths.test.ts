/**
 * Parallel shallow tests for the supabase-error branches across every query
 * module. The happy paths live in each module's dedicated test file; this
 * file exists purely so the branch coverage on "if (error) throw error"
 * style guards stays green.
 */
import { describe, it, expect } from "vitest";
import { createSupabaseMock } from "@/test/supabase-mock";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

function wire() {
  const mock = createSupabaseMock();
  return { mock, client: mock.client as unknown as SupabaseClient<Database> };
}

describe("query error paths", () => {
  it("getWorkspaceConnections throws", async () => {
    const { getWorkspaceConnections } = await import("@/lib/queries/connections");
    const { mock, client } = wire();
    mock.setTableError("platform_connections", { message: "err" });
    await expect(getWorkspaceConnections(client, "ws")).rejects.toBeTruthy();
  });

  it("getConnectionById throws on non-PGRST116 error", async () => {
    const { getConnectionById } = await import("@/lib/queries/connections");
    const { mock, client } = wire();
    mock.setTableError("platform_connections", { message: "err", code: "OTHER" });
    await expect(getConnectionById(client, "c")).rejects.toBeTruthy();
  });

  it("upsertConnection throws", async () => {
    const { upsertConnection } = await import("@/lib/queries/connections");
    const { mock, client } = wire();
    mock.setTableError("platform_connections", { message: "err" });
    await expect(
      upsertConnection(client, {
        workspace_id: "ws",
        platform: "make",
        auth_type: "api_key",
      }),
    ).rejects.toBeTruthy();
  });

  it("deleteConnection throws", async () => {
    const { deleteConnection } = await import("@/lib/queries/connections");
    const { mock, client } = wire();
    mock.setTableError("platform_connections", { message: "err" });
    await expect(deleteConnection(client, "c")).rejects.toBeTruthy();
  });

  it("updateConnectionStatus throws", async () => {
    const { updateConnectionStatus } = await import("@/lib/queries/connections");
    const { mock, client } = wire();
    mock.setTableError("platform_connections", { message: "err" });
    await expect(
      updateConnectionStatus(client, "c", "error"),
    ).rejects.toBeTruthy();
  });

  it("getInterestVoteCounts throws", async () => {
    const { getInterestVoteCounts } = await import("@/lib/queries/connections");
    const { mock, client } = wire();
    mock.setTableError("connection_interest", { message: "err" });
    await expect(
      getInterestVoteCounts(client, "ws", ["bardeen"]),
    ).rejects.toBeTruthy();
  });

  it("getUserVotes throws", async () => {
    const { getUserVotes } = await import("@/lib/queries/connections");
    const { mock, client } = wire();
    mock.setTableError("connection_interest", { message: "err" });
    await expect(getUserVotes(client, "ws", "u")).rejects.toBeTruthy();
  });

  it("getWorkspaceProfiles throws", async () => {
    const { getWorkspaceProfiles } = await import("@/lib/queries/profiles");
    const { mock, client } = wire();
    mock.setTableError("automation_profiles", { message: "err" });
    await expect(getWorkspaceProfiles(client, "ws")).rejects.toBeTruthy();
  });

  it("createProfile throws", async () => {
    const { createProfile } = await import("@/lib/queries/profiles");
    const { mock, client } = wire();
    mock.setTableError("automation_profiles", { message: "err" });
    await expect(
      createProfile(client, { workspaceId: "w", name: "n", platform: "make" }),
    ).rejects.toBeTruthy();
  });

  it("updateProfile throws", async () => {
    const { updateProfile } = await import("@/lib/queries/profiles");
    const { mock, client } = wire();
    mock.setTableError("automation_profiles", { message: "err" });
    await expect(updateProfile(client, "p", { name: "x" })).rejects.toBeTruthy();
  });

  it("deleteProfile throws", async () => {
    const { deleteProfile } = await import("@/lib/queries/profiles");
    const { mock, client } = wire();
    mock.setTableError("automation_profiles", { message: "err" });
    await expect(deleteProfile(client, "p")).rejects.toBeTruthy();
  });

  it("saveDiagnosticReport throws", async () => {
    const { saveDiagnosticReport } = await import("@/lib/queries/diagnostics");
    const { mock, client } = wire();
    mock.setTableError("diagnostic_reports", { message: "err" });
    await expect(
      saveDiagnosticReport(client, {
        profile_id: "p",
        model_used: "m",
        most_dangerous: "d",
        overall_health: "h",
        recommendations: "r",
        triggered_by: "t",
      }),
    ).rejects.toBeTruthy();
  });

  it("getProfileDiagnostics throws", async () => {
    const { getProfileDiagnostics } = await import("@/lib/queries/diagnostics");
    const { mock, client } = wire();
    mock.setTableError("diagnostic_reports", { message: "err" });
    await expect(getProfileDiagnostics(client, "p")).rejects.toBeTruthy();
  });

  it("getNotificationPreferences throws", async () => {
    const { getNotificationPreferences } = await import(
      "@/lib/queries/notifications"
    );
    const { mock, client } = wire();
    mock.setTableError("notification_preferences", { message: "err" });
    await expect(
      getNotificationPreferences(client, "u", "w"),
    ).rejects.toBeTruthy();
  });

  it("upsertNotificationPreference throws", async () => {
    const { upsertNotificationPreference } = await import(
      "@/lib/queries/notifications"
    );
    const { mock, client } = wire();
    mock.setTableError("notification_preferences", { message: "err" });
    await expect(
      upsertNotificationPreference(client, {
        userId: "u",
        workspaceId: "w",
        channel: "email",
        is_enabled: true,
        config: {} as never,
      }),
    ).rejects.toBeTruthy();
  });

  it("getUserNotifications throws", async () => {
    const { getUserNotifications } = await import("@/lib/queries/notifications");
    const { mock, client } = wire();
    mock.setTableError("notifications", { message: "err" });
    await expect(getUserNotifications(client, "u")).rejects.toBeTruthy();
  });

  it("markNotificationRead throws", async () => {
    const { markNotificationRead } = await import("@/lib/queries/notifications");
    const { mock, client } = wire();
    mock.setTableError("notifications", { message: "err" });
    await expect(markNotificationRead(client, "n")).rejects.toBeTruthy();
  });

  it("markAllNotificationsRead throws", async () => {
    const { markAllNotificationsRead } = await import(
      "@/lib/queries/notifications"
    );
    const { mock, client } = wire();
    mock.setTableError("notifications", { message: "err" });
    await expect(
      markAllNotificationsRead(client, "u", "w"),
    ).rejects.toBeTruthy();
  });

  it("createNotification throws", async () => {
    const { createNotification } = await import("@/lib/queries/notifications");
    const { mock, client } = wire();
    mock.setTableError("notifications", { message: "err" });
    await expect(
      createNotification(client, {
        user_id: "u",
        workspace_id: "w",
        title: "t",
        body: "b",
        type: "x",
      }),
    ).rejects.toBeTruthy();
  });

  it("getDueSchedules throws", async () => {
    const { getDueSchedules } = await import("@/lib/queries/schedules");
    const { mock, client } = wire();
    mock.setTableError("audit_schedules", { message: "err" });
    await expect(getDueSchedules(client)).rejects.toBeTruthy();
  });

  it("updateScheduleAfterRun throws", async () => {
    const { updateScheduleAfterRun } = await import("@/lib/queries/schedules");
    const { mock, client } = wire();
    mock.setTableError("audit_schedules", { message: "err" });
    await expect(
      updateScheduleAfterRun(client, "s", "0 8 * * *"),
    ).rejects.toBeTruthy();
  });

  it("getProfileSchedule throws", async () => {
    const { getProfileSchedule } = await import("@/lib/queries/schedules");
    const { mock, client } = wire();
    mock.setTableError("audit_schedules", { message: "err" });
    await expect(getProfileSchedule(client, "p")).rejects.toBeTruthy();
  });

  it("upsertSchedule throws", async () => {
    const { upsertSchedule } = await import("@/lib/queries/schedules");
    const { mock, client } = wire();
    mock.setTableError("audit_schedules", { message: "err" });
    await expect(upsertSchedule(client, "p")).rejects.toBeTruthy();
  });

  it("toggleSchedule throws", async () => {
    const { toggleSchedule } = await import("@/lib/queries/schedules");
    const { mock, client } = wire();
    mock.setTableError("audit_schedules", { message: "err" });
    await expect(toggleSchedule(client, "p", true)).rejects.toBeTruthy();
  });

  it("getWorkspaceSubscription throws", async () => {
    const { getWorkspaceSubscription } = await import(
      "@/lib/queries/subscriptions"
    );
    const { mock, client } = wire();
    mock.setTableError("subscriptions", { message: "err" });
    await expect(getWorkspaceSubscription(client, "w")).rejects.toBeTruthy();
  });

  it("upsertSubscription throws", async () => {
    const { upsertSubscription } = await import("@/lib/queries/subscriptions");
    const { mock, client } = wire();
    mock.setTableError("subscriptions", { message: "err" });
    await expect(
      upsertSubscription(client, {
        workspace_id: "w",
        stripe_customer_id: "c",
      }),
    ).rejects.toBeTruthy();
  });

  it("updateSubscriptionByStripeId throws", async () => {
    const { updateSubscriptionByStripeId } = await import(
      "@/lib/queries/subscriptions"
    );
    const { mock, client } = wire();
    mock.setTableError("subscriptions", { message: "err" });
    await expect(
      updateSubscriptionByStripeId(client, "cus_1", { plan: "pro" }),
    ).rejects.toBeTruthy();
  });

  it("getUserWorkspaces throws", async () => {
    const { getUserWorkspaces } = await import("@/lib/queries/workspaces");
    const { mock, client } = wire();
    mock.setTableError("workspaces", { message: "err" });
    await expect(getUserWorkspaces(client)).rejects.toBeTruthy();
  });

  it("createWorkspace throws on workspace insert error", async () => {
    const { createWorkspace } = await import("@/lib/queries/workspaces");
    const { mock, client } = wire();
    mock.setTableError("workspaces", { message: "err" });
    await expect(
      createWorkspace(client, { name: "n", slug: "s", ownerId: "o" }),
    ).rejects.toBeTruthy();
  });

  it("updateWorkspaceName throws", async () => {
    const { updateWorkspaceName } = await import("@/lib/queries/workspaces");
    const { mock, client } = wire();
    mock.setTableError("workspaces", { message: "err" });
    await expect(updateWorkspaceName(client, "w", "n")).rejects.toBeTruthy();
  });

  it("getWorkspaceMembers throws", async () => {
    const { getWorkspaceMembers } = await import("@/lib/queries/workspaces");
    const { mock, client } = wire();
    mock.setTableError("workspace_members", { message: "err" });
    await expect(getWorkspaceMembers(client, "w")).rejects.toBeTruthy();
  });
});

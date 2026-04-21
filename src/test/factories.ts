/**
 * Typed fixture factories matching the actual Supabase schema. Overrides are
 * shallow-merged and the returned row is typed as the corresponding
 * Database["public"]["Tables"][X]["Row"].
 */

import type { Database } from "@/lib/database.types";

type Tables = Database["public"]["Tables"];

function isoNow(): string {
  return new Date().toISOString();
}

/** Deterministic, schema-valid UUIDs for tests needing one. */
export const TEST_UUID = "00000000-0000-4000-8000-000000000001";
export const TEST_UUID_2 = "00000000-0000-4000-8000-000000000002";
export const TEST_UUID_3 = "00000000-0000-4000-8000-000000000003";
export const TEST_USER_ID = "00000000-0000-4000-8000-000000000099";
export const TEST_PROFILE_ID = "00000000-0000-4000-8000-000000000010";
export const TEST_CONNECTION_ID = "00000000-0000-4000-8000-000000000020";
export const TEST_NOTIFICATION_ID = "00000000-0000-4000-8000-000000000030";
export const TEST_WORKSPACE_ID_2 = "00000000-0000-4000-8000-000000000040";

export function makeWorkspace(
  overrides: Partial<Tables["workspaces"]["Row"]> = {},
): Tables["workspaces"]["Row"] {
  return {
    id: overrides.id ?? TEST_UUID,
    slug: overrides.slug ?? "test-ws",
    name: overrides.name ?? "Test Workspace",
    owner_id: overrides.owner_id ?? TEST_USER_ID,
    created_at: overrides.created_at ?? isoNow(),
    updated_at: overrides.updated_at ?? isoNow(),
  };
}

export function makeProfile(
  overrides: Partial<Tables["automation_profiles"]["Row"]> = {},
): Tables["automation_profiles"]["Row"] {
  return {
    id: overrides.id ?? "p-test",
    workspace_id: overrides.workspace_id ?? TEST_UUID,
    name: overrides.name ?? "Test Profile",
    description: overrides.description ?? null,
    platform: overrides.platform ?? "make",
    health_score: overrides.health_score ?? 100,
    industry: overrides.industry ?? null,
    scenario_count: overrides.scenario_count ?? 0,
    last_audit_at: overrides.last_audit_at ?? null,
    snoozed_until: overrides.snoozed_until ?? null,
    created_at: overrides.created_at ?? isoNow(),
    updated_at: overrides.updated_at ?? isoNow(),
  };
}

export function makeConnection(
  overrides: Partial<Tables["platform_connections"]["Row"]> = {},
): Tables["platform_connections"]["Row"] {
  return {
    id: overrides.id ?? "conn-test",
    workspace_id: overrides.workspace_id ?? TEST_UUID,
    platform: overrides.platform ?? "make",
    display_name: overrides.display_name ?? "Test Connection",
    status: overrides.status ?? "active",
    auth_type: overrides.auth_type ?? "api_key",
    api_key_encrypted: overrides.api_key_encrypted ?? null,
    access_token_encrypted: overrides.access_token_encrypted ?? null,
    refresh_token_encrypted: overrides.refresh_token_encrypted ?? null,
    token_expires_at: overrides.token_expires_at ?? null,
    instance_url: overrides.instance_url ?? null,
    team_id: overrides.team_id ?? null,
    zone: overrides.zone ?? null,
    error_message: overrides.error_message ?? null,
    last_tested_at: overrides.last_tested_at ?? null,
    last_synced_at: overrides.last_synced_at ?? null,
    credentials_vault_id: overrides.credentials_vault_id ?? null,
    created_at: overrides.created_at ?? isoNow(),
    updated_at: overrides.updated_at ?? isoNow(),
  };
}

export function makeAutomation(
  overrides: Partial<Tables["automations"]["Row"]> = {},
): Tables["automations"]["Row"] {
  return {
    id: overrides.id ?? "auto-test",
    connection_id: overrides.connection_id ?? "conn-test",
    profile_id: overrides.profile_id ?? "p-test",
    external_id: overrides.external_id ?? "ext-1",
    name: overrides.name ?? "Test Automation",
    status: overrides.status ?? "active",
    trigger_type: overrides.trigger_type ?? null,
    last_run_at: overrides.last_run_at ?? null,
    success_rate: overrides.success_rate ?? null,
    total_runs: overrides.total_runs ?? 0,
    failed_runs: overrides.failed_runs ?? 0,
    raw_data: overrides.raw_data ?? null,
    created_at: overrides.created_at ?? isoNow(),
    updated_at: overrides.updated_at ?? isoNow(),
  };
}

export function makeExecution(
  automationId: string,
  overrides: Partial<Tables["execution_logs"]["Row"]> = {},
): Tables["execution_logs"]["Row"] {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    automation_id: automationId,
    external_id: overrides.external_id ?? null,
    status: overrides.status ?? "success",
    started_at: overrides.started_at ?? isoNow(),
    finished_at: overrides.finished_at ?? isoNow(),
    error_message: overrides.error_message ?? null,
    data_in: overrides.data_in ?? null,
    data_out: overrides.data_out ?? null,
    created_at: overrides.created_at ?? isoNow(),
  };
}

export function makeIssue(
  overrides: Partial<Tables["automation_issues"]["Row"]> = {},
): Tables["automation_issues"]["Row"] {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    profile_id: overrides.profile_id ?? "p-test",
    automation_name: overrides.automation_name ?? "Test Automation",
    name: overrides.name ?? "Test Issue",
    severity: overrides.severity ?? "medium",
    status: overrides.status ?? "open",
    type: overrides.type ?? "high_error_rate",
    business_impact: overrides.business_impact ?? "Low throughput",
    recommendation: overrides.recommendation ?? "Investigate",
    resolved_at: overrides.resolved_at ?? null,
    created_at: overrides.created_at ?? isoNow(),
    updated_at: overrides.updated_at ?? isoNow(),
  };
}

export function makeSubscription(
  overrides: Partial<Tables["subscriptions"]["Row"]> = {},
): Tables["subscriptions"]["Row"] {
  return {
    id: overrides.id ?? "sub-test",
    workspace_id: overrides.workspace_id ?? TEST_UUID,
    stripe_customer_id: overrides.stripe_customer_id ?? "cus_test",
    stripe_subscription_id: overrides.stripe_subscription_id ?? null,
    status: overrides.status ?? "active",
    plan: overrides.plan ?? "starter",
    is_ltd: overrides.is_ltd ?? false,
    ltd_purchased_at: overrides.ltd_purchased_at ?? null,
    current_period_start: overrides.current_period_start ?? null,
    current_period_end: overrides.current_period_end ?? null,
    billing_country: overrides.billing_country ?? null,
    billing_email: overrides.billing_email ?? null,
    tax_id: overrides.tax_id ?? null,
    tax_id_country: overrides.tax_id_country ?? null,
    created_at: overrides.created_at ?? isoNow(),
    updated_at: overrides.updated_at ?? isoNow(),
  };
}

export function makeNotification(
  overrides: Partial<Tables["notifications"]["Row"]> = {},
): Tables["notifications"]["Row"] {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    workspace_id: overrides.workspace_id ?? TEST_UUID,
    user_id: overrides.user_id ?? TEST_USER_ID,
    title: overrides.title ?? "Test Notification",
    body: overrides.body ?? "Test body",
    type: overrides.type ?? "issue_detected",
    is_read: overrides.is_read ?? false,
    related_issue_id: overrides.related_issue_id ?? null,
    related_profile_id: overrides.related_profile_id ?? null,
    created_at: overrides.created_at ?? isoNow(),
  };
}

export function makeMember(
  overrides: Partial<Tables["workspace_members"]["Row"]> = {},
): Tables["workspace_members"]["Row"] {
  return {
    workspace_id: overrides.workspace_id ?? TEST_UUID,
    user_id: overrides.user_id ?? TEST_USER_ID,
    role: overrides.role ?? "admin",
    created_at: overrides.created_at ?? isoNow(),
  };
}

export function makeUser(overrides: Partial<{ id: string; email: string }> = {}) {
  return {
    id: overrides.id ?? TEST_USER_ID,
    email: overrides.email ?? "test@example.com",
    user_metadata: {},
  };
}

export function hoursAgo(hours: number): string {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

export function daysAgo(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

export type NotificationChannel = "in_app" | "email" | "slack" | "webhook";

export type NotificationSeverity = "critical" | "warning" | "info";

export type NotificationEventType =
  | "issue_detected"
  | "credential_expiring"
  | "audit_complete"
  | "connection_error";

export interface QuietHours {
  enabled: boolean;
  start: string;
  end: string;
  timezone: string;
}

export interface DigestConfig {
  enabled: boolean;
  schedule: "daily" | "weekly";
}

export interface NotificationConfig {
  severities: NotificationSeverity[];
  event_types: NotificationEventType[];
  muted_profile_ids: string[];
  quiet_hours: QuietHours | null;
  digest: DigestConfig | null;
}

export const DEFAULT_SEVERITIES: NotificationSeverity[] = ["critical", "warning"];

export const ALL_EVENT_TYPES: NotificationEventType[] = [
  "issue_detected",
  "credential_expiring",
  "audit_complete",
  "connection_error",
];

export const EVENT_TYPE_LABELS: Record<NotificationEventType, { label: string; description: string }> = {
  issue_detected: {
    label: "New issue detected",
    description: "A new critical, warning, or info issue was flagged on a profile.",
  },
  credential_expiring: {
    label: "Credential expiring",
    description: "A platform connection key or OAuth token is nearing expiry.",
  },
  connection_error: {
    label: "Connection error",
    description: "Runmend couldn't reach a connected platform.",
  },
  audit_complete: {
    label: "Audit completed",
    description: "A scheduled sync + audit finished for a profile.",
  },
};

export const CHANNEL_LABELS: Record<NotificationChannel, string> = {
  in_app: "In-app bell",
  email: "Email",
  slack: "Slack",
  webhook: "Webhook",
};

export function defaultConfig(): NotificationConfig {
  return {
    severities: [...DEFAULT_SEVERITIES],
    event_types: [...ALL_EVENT_TYPES],
    muted_profile_ids: [],
    quiet_hours: null,
    digest: null,
  };
}

export function defaultEnabled(channel: NotificationChannel): boolean {
  return channel === "in_app" || channel === "email";
}

/**
 * Normalize arbitrary jsonb into the typed config shape. Missing fields fall
 * back to defaults so new UI renders even if a row predates a config field.
 */
export function normalizeConfig(raw: unknown): NotificationConfig {
  const base = defaultConfig();
  if (!raw || typeof raw !== "object") return base;
  const c = raw as Record<string, unknown>;

  const severities = Array.isArray(c.severities)
    ? (c.severities.filter((s) =>
        ["critical", "warning", "info"].includes(s as string)
      ) as NotificationSeverity[])
    : base.severities;

  const eventTypes = Array.isArray(c.event_types)
    ? (c.event_types.filter((e) =>
        ALL_EVENT_TYPES.includes(e as NotificationEventType)
      ) as NotificationEventType[])
    : base.event_types;

  const mutedProfileIds = Array.isArray(c.muted_profile_ids)
    ? (c.muted_profile_ids.filter((id) => typeof id === "string") as string[])
    : [];

  const quietHours =
    c.quiet_hours && typeof c.quiet_hours === "object"
      ? (c.quiet_hours as QuietHours)
      : null;

  const digest =
    c.digest && typeof c.digest === "object" ? (c.digest as DigestConfig) : null;

  return {
    severities,
    event_types: eventTypes,
    muted_profile_ids: mutedProfileIds,
    quiet_hours: quietHours,
    digest,
  };
}

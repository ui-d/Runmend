"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import {
  AlertCircle,
  Bell,
  BellOff,
  Check,
  ExternalLink,
  Hash,
  Mail,
  Webhook,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  ALL_EVENT_TYPES,
  CHANNEL_LABELS,
  defaultConfig,
  defaultEnabled,
  EVENT_TYPE_LABELS,
  normalizeConfig,
  type DigestConfig,
  type NotificationChannel,
  type NotificationConfig,
  type NotificationEventType,
  type NotificationSeverity,
  type QuietHours,
} from "@/lib/notifications/config";
import { updateNotificationPreferenceAction } from "@/app/app/[workspaceSlug]/settings/actions";

type ChannelState = { is_enabled: boolean; config: NotificationConfig };
type PrefsState = Record<NotificationChannel, ChannelState>;

interface StoredPreference {
  channel: string;
  is_enabled: boolean;
  config: unknown;
}

interface AlertsClientProps {
  workspaceId: string;
  workspaceSlug: string;
  userEmail: string;
  storedPreferences: StoredPreference[];
  mutedProfileMap: Record<string, string>;
}

const CHANNELS_IN_MATRIX: NotificationChannel[] = ["in_app", "email"];
const ALL_SEVERITIES: NotificationSeverity[] = ["critical", "warning", "info"];

const SEVERITY_STYLE: Record<NotificationSeverity, { on: string; off: string; label: string }> = {
  critical: {
    on: "border-red-500/40 bg-red-500/10 text-red-400",
    off: "border-border/50 bg-transparent text-muted-foreground hover:text-red-400 hover:border-red-500/30",
    label: "Critical",
  },
  warning: {
    on: "border-yellow-500/40 bg-yellow-500/10 text-yellow-400",
    off: "border-border/50 bg-transparent text-muted-foreground hover:text-yellow-400 hover:border-yellow-500/30",
    label: "Warning",
  },
  info: {
    on: "border-sky-500/40 bg-sky-500/10 text-sky-400",
    off: "border-border/50 bg-transparent text-muted-foreground hover:text-sky-400 hover:border-sky-500/30",
    label: "Info",
  },
};

function buildInitialState(stored: StoredPreference[]): PrefsState {
  const base: PrefsState = {
    in_app: { is_enabled: defaultEnabled("in_app"), config: defaultConfig() },
    email: { is_enabled: defaultEnabled("email"), config: defaultConfig() },
    slack: { is_enabled: false, config: defaultConfig() },
    webhook: { is_enabled: false, config: defaultConfig() },
  };
  for (const row of stored) {
    if (row.channel in base) {
      base[row.channel as NotificationChannel] = {
        is_enabled: row.is_enabled,
        config: normalizeConfig(row.config),
      };
    }
  }
  return base;
}

export function AlertsClient({
  workspaceId,
  workspaceSlug,
  userEmail,
  storedPreferences,
  mutedProfileMap,
}: AlertsClientProps) {
  const [prefs, setPrefs] = useState<PrefsState>(() =>
    buildInitialState(storedPreferences)
  );
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [savingChannel, setSavingChannel] = useState<NotificationChannel | null>(null);
  const [, startTransition] = useTransition();

  const detectedTimezone = useMemo(() => {
    if (typeof Intl === "undefined") return "UTC";
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    } catch {
      return "UTC";
    }
  }, []);

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 2500);
  }

  function persistChannel(
    channel: NotificationChannel,
    next: ChannelState
  ): void {
    setPrefs((prev) => ({ ...prev, [channel]: next }));
    setSavingChannel(channel);
    startTransition(async () => {
      const result = await updateNotificationPreferenceAction({
        workspaceId,
        workspaceSlug,
        channel,
        is_enabled: next.is_enabled,
        config: next.config,
      });
      setSavingChannel(null);
      if (!result.ok) {
        showToast(result.error || "Could not save", false);
      }
    });
  }

  function toggleChannelEnabled(channel: NotificationChannel) {
    const current = prefs[channel];
    persistChannel(channel, { ...current, is_enabled: !current.is_enabled });
  }

  function toggleSeverity(channel: NotificationChannel, sev: NotificationSeverity) {
    const current = prefs[channel];
    const has = current.config.severities.includes(sev);
    const severities = has
      ? current.config.severities.filter((s) => s !== sev)
      : [...current.config.severities, sev];
    persistChannel(channel, {
      ...current,
      config: { ...current.config, severities },
    });
  }

  function toggleEventType(
    channel: NotificationChannel,
    event: NotificationEventType
  ) {
    const current = prefs[channel];
    const has = current.config.event_types.includes(event);
    const event_types = has
      ? current.config.event_types.filter((e) => e !== event)
      : [...current.config.event_types, event];
    persistChannel(channel, {
      ...current,
      config: { ...current.config, event_types },
    });
  }

  function updateEmailDigest(next: DigestConfig | null) {
    const current = prefs.email;
    persistChannel("email", {
      ...current,
      config: { ...current.config, digest: next },
    });
  }

  function updateEmailQuietHours(next: QuietHours | null) {
    const current = prefs.email;
    persistChannel("email", {
      ...current,
      config: { ...current.config, quiet_hours: next },
    });
  }

  function unmuteProfile(profileId: string) {
    const current = prefs.email;
    persistChannel("email", {
      ...current,
      config: {
        ...current.config,
        muted_profile_ids: current.config.muted_profile_ids.filter(
          (id) => id !== profileId
        ),
      },
    });
  }

  const emailPref = prefs.email;
  const quiet = emailPref.config.quiet_hours;
  const digest = emailPref.config.digest;

  return (
    <div className="space-y-8">
      {/* Toast */}
      {toast && (
        <div
          role="status"
          className={cn(
            "fixed right-6 top-6 z-40 rounded-md border px-3 py-2 text-sm shadow-lg",
            toast.ok
              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
              : "border-red-500/40 bg-red-500/10 text-red-300"
          )}
        >
          {toast.msg}
        </div>
      )}

      {/* Channels */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Channels
          </h3>
          {savingChannel && (
            <span className="text-xs text-muted-foreground">Saving…</span>
          )}
        </div>
        <div className="rounded-2xl border border-border/60 bg-card/40 divide-y divide-border/60">
          <ChannelRow
            channel="in_app"
            icon={Bell}
            status="active"
            destination="Notification bell in header"
            enabled={prefs.in_app.is_enabled}
            onToggleEnabled={() => toggleChannelEnabled("in_app")}
            severities={prefs.in_app.config.severities}
            onToggleSeverity={(s) => toggleSeverity("in_app", s)}
          />
          <ChannelRow
            channel="email"
            icon={Mail}
            status="active"
            destination={userEmail}
            enabled={prefs.email.is_enabled}
            onToggleEnabled={() => toggleChannelEnabled("email")}
            severities={prefs.email.config.severities}
            onToggleSeverity={(s) => toggleSeverity("email", s)}
            extra={
              <Button
                type="button"
                variant="outline"
                size="xs"
                onClick={() => showToast("Test email queued (stub)", true)}
                disabled={!prefs.email.is_enabled}
              >
                Send test
              </Button>
            }
          />
          <ChannelRow
            channel="slack"
            icon={Hash}
            status="disconnected"
            destination="Connect a workspace"
            enabled={false}
            onToggleEnabled={() => {}}
            severities={[]}
            onToggleSeverity={() => {}}
            disabled
            disabledHint="Slack delivery ships in a near-term release. Webhook support lands alongside it."
            extra={
              <Button type="button" variant="outline" size="xs" disabled>
                Connect Slack
              </Button>
            }
          />
          <ChannelRow
            channel="webhook"
            icon={Webhook}
            status="disconnected"
            destination="No endpoint configured"
            enabled={false}
            onToggleEnabled={() => {}}
            severities={[]}
            onToggleSeverity={() => {}}
            disabled
            disabledHint="Outbound webhooks are coming soon — you'll be able to POST JSON payloads to your own endpoint."
            extra={
              <Button type="button" variant="outline" size="xs" disabled>
                Add endpoint
              </Button>
            }
          />
        </div>
      </section>

      {/* Rules matrix */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Event routing
        </h3>
        <div className="overflow-hidden rounded-2xl border border-border/60 bg-card/40">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 bg-muted/20">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Event
                </th>
                {CHANNELS_IN_MATRIX.map((ch) => (
                  <th
                    key={ch}
                    className="px-4 py-3 text-center font-medium text-muted-foreground"
                  >
                    {CHANNEL_LABELS[ch]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ALL_EVENT_TYPES.map((event) => (
                <tr
                  key={event}
                  className="border-b border-border/60 last:border-0"
                >
                  <td className="px-4 py-3">
                    <p className="font-medium">{EVENT_TYPE_LABELS[event].label}</p>
                    <p className="text-xs text-muted-foreground">
                      {EVENT_TYPE_LABELS[event].description}
                    </p>
                  </td>
                  {CHANNELS_IN_MATRIX.map((ch) => {
                    const isOn = prefs[ch].config.event_types.includes(event);
                    return (
                      <td key={ch} className="px-4 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => toggleEventType(ch, event)}
                          disabled={!prefs[ch].is_enabled}
                          aria-pressed={isOn}
                          className={cn(
                            "inline-flex h-5 w-5 items-center justify-center rounded border transition-colors",
                            isOn
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border/70 bg-transparent hover:border-primary/50",
                            !prefs[ch].is_enabled && "opacity-40 cursor-not-allowed"
                          )}
                        >
                          {isOn && <Check className="h-3 w-3" />}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted-foreground">
          Events only fire on a channel if its severity filter also matches. A
          disabled channel suppresses everything.
        </p>
      </section>

      {/* Digest + quiet hours */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Email delivery
        </h3>
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Digest */}
          <div className="rounded-2xl border border-border/60 bg-card/40 p-5 space-y-3">
            <div className="space-y-1">
              <p className="text-sm font-medium">Digest schedule</p>
              <p className="text-xs text-muted-foreground">
                Roll individual alerts into one summary. Critical events still
                send immediately regardless of digest.
              </p>
            </div>
            <div className="flex gap-2">
              <DigestChip
                label="Off"
                active={!digest || !digest.enabled}
                onClick={() => updateEmailDigest(null)}
              />
              <DigestChip
                label="Daily"
                active={digest?.enabled === true && digest.schedule === "daily"}
                onClick={() =>
                  updateEmailDigest({ enabled: true, schedule: "daily" })
                }
              />
              <DigestChip
                label="Weekly"
                active={digest?.enabled === true && digest.schedule === "weekly"}
                onClick={() =>
                  updateEmailDigest({ enabled: true, schedule: "weekly" })
                }
              />
            </div>
          </div>

          {/* Quiet hours */}
          <div className="rounded-2xl border border-border/60 bg-card/40 p-5 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1">
                <p className="text-sm font-medium">Quiet hours</p>
                <p className="text-xs text-muted-foreground">
                  Hold email notifications during these hours. Delivery resumes
                  once quiet hours end.
                </p>
              </div>
              <Toggle
                checked={quiet?.enabled === true}
                onChange={(checked) => {
                  if (checked) {
                    updateEmailQuietHours({
                      enabled: true,
                      start: quiet?.start ?? "22:00",
                      end: quiet?.end ?? "08:00",
                      timezone: quiet?.timezone ?? detectedTimezone,
                    });
                  } else if (quiet) {
                    updateEmailQuietHours({ ...quiet, enabled: false });
                  }
                }}
              />
            </div>
            {quiet?.enabled && (
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="qh-start" className="text-xs">
                    Start
                  </Label>
                  <Input
                    id="qh-start"
                    type="time"
                    value={quiet.start}
                    onChange={(e) =>
                      updateEmailQuietHours({ ...quiet, start: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="qh-end" className="text-xs">
                    End
                  </Label>
                  <Input
                    id="qh-end"
                    type="time"
                    value={quiet.end}
                    onChange={(e) =>
                      updateEmailQuietHours({ ...quiet, end: e.target.value })
                    }
                  />
                </div>
                <div className="col-span-2 space-y-1">
                  <Label htmlFor="qh-tz" className="text-xs">
                    Timezone
                  </Label>
                  <Input
                    id="qh-tz"
                    value={quiet.timezone}
                    onChange={(e) =>
                      updateEmailQuietHours({ ...quiet, timezone: e.target.value })
                    }
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Detected: {detectedTimezone}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Muted profiles */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Muted profiles
        </h3>
        <div className="rounded-2xl border border-border/60 bg-card/40 p-5">
          {emailPref.config.muted_profile_ids.length === 0 ? (
            <div className="flex items-start gap-3">
              <BellOff className="mt-0.5 h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm">No profiles muted.</p>
                <p className="text-xs text-muted-foreground">
                  Mute a profile from its detail page to stop alerts without
                  deleting it.
                </p>
              </div>
            </div>
          ) : (
            <ul className="space-y-2">
              {emailPref.config.muted_profile_ids.map((id) => {
                const name = mutedProfileMap[id] ?? "Unknown profile";
                return (
                  <li
                    key={id}
                    className="flex items-center justify-between rounded-lg border border-border/60 bg-card/30 px-3 py-2"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <BellOff className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <Link
                        href={`/app/${workspaceSlug}/profiles/${id}`}
                        className="truncate text-sm hover:underline"
                      >
                        {name}
                      </Link>
                      <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground" />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="xs"
                      onClick={() => unmuteProfile(id)}
                    >
                      Unmute
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}

// -- Sub-components --

interface ChannelRowProps {
  channel: NotificationChannel;
  icon: React.ComponentType<{ className?: string }>;
  status: "active" | "disconnected";
  destination: string;
  enabled: boolean;
  onToggleEnabled: () => void;
  severities: NotificationSeverity[];
  onToggleSeverity: (s: NotificationSeverity) => void;
  extra?: React.ReactNode;
  disabled?: boolean;
  disabledHint?: string;
}

function ChannelRow({
  channel,
  icon: Icon,
  status,
  destination,
  enabled,
  onToggleEnabled,
  severities,
  onToggleSeverity,
  extra,
  disabled,
  disabledHint,
}: ChannelRowProps) {
  return (
    <div className="p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3 min-w-0">
          <div
            className={cn(
              "rounded-md p-2",
              status === "active" ? "bg-emerald-500/10" : "bg-muted/60"
            )}
          >
            <Icon
              className={cn(
                "h-4 w-4",
                status === "active" ? "text-emerald-400" : "text-muted-foreground"
              )}
            />
          </div>
          <div className="min-w-0 space-y-0.5">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium">{CHANNEL_LABELS[channel]}</p>
              {status === "disconnected" && (
                <span className="rounded-full border border-border/60 bg-muted/40 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  Not connected
                </span>
              )}
            </div>
            <p className="truncate text-xs text-muted-foreground">
              {destination}
            </p>
            {disabledHint && (
              <p className="flex items-start gap-1 pt-1 text-xs text-muted-foreground">
                <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
                {disabledHint}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {extra}
          {!disabled && <Toggle checked={enabled} onChange={onToggleEnabled} />}
        </div>
      </div>

      {!disabled && enabled && (
        <div className="mt-4 flex flex-wrap items-center gap-2 pl-11">
          <span className="text-xs text-muted-foreground">Severity:</span>
          {ALL_SEVERITIES.map((sev) => {
            const isOn = severities.includes(sev);
            const style = SEVERITY_STYLE[sev];
            return (
              <button
                key={sev}
                type="button"
                onClick={() => onToggleSeverity(sev)}
                aria-pressed={isOn}
                className={cn(
                  "rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
                  isOn ? style.on : style.off
                )}
              >
                {style.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-5 w-9 items-center rounded-full transition-colors",
        checked ? "bg-primary" : "bg-muted",
        disabled && "opacity-40 cursor-not-allowed"
      )}
    >
      <span
        className={cn(
          "inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform",
          checked ? "translate-x-[18px]" : "translate-x-0.5"
        )}
      />
    </button>
  );
}

function DigestChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
        active
          ? "border-primary bg-primary/10 text-primary"
          : "border-border/60 text-muted-foreground hover:text-foreground hover:border-border"
      )}
    >
      {label}
    </button>
  );
}


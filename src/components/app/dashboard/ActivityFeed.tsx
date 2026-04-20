import Link from "next/link";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Sparkles,
  XCircle,
} from "lucide-react";
import type { ActivityEvent } from "@/lib/queries/workspace-dashboard";
import { formatRelative } from "@/lib/time";

interface ActivityFeedProps {
  events: ActivityEvent[];
  workspaceSlug: string;
}

export function ActivityFeed({ events, workspaceSlug }: ActivityFeedProps) {
  return (
    <section className="flex h-full flex-col rounded-xl border border-border/60 bg-card/40">
      <header className="flex items-center justify-between border-b border-border/60 px-4 py-3">
        <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
          Activity
        </span>
        <span className="text-[10px] text-muted-foreground">last 30 days</span>
      </header>
      {events.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-1 p-6 text-center">
          <p className="text-sm text-muted-foreground">Nothing to report yet.</p>
          <p className="text-xs text-muted-foreground/70">
            Your first sync and detected issues will show up here.
          </p>
        </div>
      ) : (
        <ol className="divide-y divide-border/60">
          {events.map((event) => (
            <ActivityRow key={event.id} event={event} workspaceSlug={workspaceSlug} />
          ))}
        </ol>
      )}
    </section>
  );
}

function ActivityRow({
  event,
  workspaceSlug,
}: {
  event: ActivityEvent;
  workspaceSlug: string;
}) {
  const { icon: Icon, tone } = eventIcon(event);
  const body = (
    <div className="flex items-start gap-3 px-4 py-2.5 transition-colors hover:bg-accent/30">
      <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${tone}`} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm leading-snug text-foreground">{event.headline}</p>
        <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
          {event.subline && <span className="truncate">{event.subline}</span>}
          <span>·</span>
          <span className="tabular-nums">{formatRelative(event.occurredAt)}</span>
        </div>
      </div>
    </div>
  );

  if (event.profileId) {
    return (
      <li>
        <Link
          href={`/app/${workspaceSlug}/profiles/${event.profileId}`}
          className="block"
        >
          {body}
        </Link>
      </li>
    );
  }
  return <li>{body}</li>;
}

function eventIcon(event: ActivityEvent): {
  icon: typeof AlertCircle;
  tone: string;
} {
  switch (event.kind) {
    case "issue_created":
      if (event.severity === "critical") {
        return { icon: AlertCircle, tone: "text-red-500" };
      }
      return { icon: AlertTriangle, tone: "text-yellow-500" };
    case "issue_resolved":
      return { icon: CheckCircle2, tone: "text-emerald-500" };
    case "issue_dismissed":
      return { icon: XCircle, tone: "text-muted-foreground" };
    case "diagnostic_completed":
      return { icon: Sparkles, tone: "text-blue-500" };
    case "sync_completed":
      return { icon: RefreshCw, tone: "text-muted-foreground" };
  }
}

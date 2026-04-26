import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check, Minus, X } from "lucide-react";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";

export const metadata: Metadata = {
  title: "Runmend vs. Claude Cowork — when each is the right tool",
  description:
    "Honest comparison: Claude.ai's native Make.com and n8n connectors plus Cowork Live Artifacts cover single-account hobbyist monitoring. Runmend is for agencies running multi-account, multi-zone, and self-hosted n8n in production.",
};

interface Row {
  capability: string;
  runmend: { mark: "yes" | "partial" | "no"; note: string };
  cowork: { mark: "yes" | "partial" | "no"; note: string };
}

const ROWS: Row[] = [
  {
    capability: "Multiple Make.com accounts",
    runmend: { mark: "yes", note: "One profile per client; all 4 zones (us1, eu1, eu2, us2)" },
    cowork: { mark: "partial", note: "One OAuth account per connector install" },
  },
  {
    capability: "Self-hosted n8n",
    runmend: { mark: "yes", note: "URL + key, no allowlist needed" },
    cowork: { mark: "partial", note: "Native, but self-hosted needs Anthropic IP allowlisting" },
  },
  {
    capability: "Failure detectors",
    runmend: { mark: "yes", note: "Six purpose-built rules with severity + remediation" },
    cowork: { mark: "no", note: "DIY — you prompt Claude per question" },
  },
  {
    capability: "AI post-mortem",
    runmend: { mark: "yes", note: "Claude Sonnet, structured three-part report" },
    cowork: { mark: "yes", note: "Same model, you write the prompt each time" },
  },
  {
    capability: "Audit cadence",
    runmend: { mark: "yes", note: "Vercel Cron every 15 min; up to hourly per profile on Pro" },
    cowork: { mark: "partial", note: "Routines floor at 1h. Pro 5/day, Max 15/day, Team 25/day" },
  },
  {
    capability: "Per-channel alerting",
    runmend: { mark: "yes", note: "Email + Slack, per-profile routing, severity-tuned" },
    cowork: { mark: "no", note: "Notifications surface inside Claude.ai; no email or Slack push" },
  },
  {
    capability: "Persistent history & trend",
    runmend: { mark: "yes", note: "Health snapshots, diagnostic log, notification log" },
    cowork: { mark: "partial", note: "Live Artifacts regenerate; no first-class history store" },
  },
  {
    capability: "Multi-tenant workspaces with roles",
    runmend: { mark: "yes", note: "RBAC, encrypted credentials, team membership" },
    cowork: { mark: "no", note: "Single-user account; Team plan shares Claude, not connector state" },
  },
  {
    capability: "On-call rotation / escalation",
    runmend: { mark: "no", note: "Not built yet (on the roadmap)" },
    cowork: { mark: "no", note: "Not in scope" },
  },
  {
    capability: "Public status pages",
    runmend: { mark: "no", note: "Not built yet (on the roadmap)" },
    cowork: { mark: "no", note: "Not in scope" },
  },
  {
    capability: "Pricing",
    runmend: { mark: "yes", note: "Free / $19 / $49 / $99 lifetime" },
    cowork: { mark: "yes", note: "Bundled in Claude Pro / Max / Team subscriptions" },
  },
];

function MarkIcon({ mark }: { mark: "yes" | "partial" | "no" }) {
  if (mark === "yes") {
    return <Check className="h-4 w-4 text-emerald-500" aria-label="yes" />;
  }
  if (mark === "partial") {
    return <Minus className="h-4 w-4 text-amber-500" aria-label="partial" />;
  }
  return <X className="h-4 w-4 text-muted-foreground/60" aria-label="no" />;
}

export default function VsClaudeCoworkPage() {
  return (
    <main className="min-h-screen">
      <Navbar />

      <section className="max-w-5xl mx-auto px-4 pt-20 pb-12 text-center">
        <p className="text-sm font-medium text-muted-foreground/70 uppercase tracking-wider mb-3">
          Honest comparison
        </p>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl max-w-3xl mx-auto">
          Runmend vs. Claude Cowork — when each is the right tool
        </h1>
        <p className="mt-5 text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          Claude.ai now ships native Make.com and n8n connectors plus Live
          Artifacts for auto-refreshing dashboards. For a lot of people that
          is genuinely enough. Runmend is the tool you reach for when one
          OAuth account and an hourly Routine stop covering the job.
        </p>
      </section>

      <section className="max-w-5xl mx-auto px-4 py-8">
        <div className="rounded-xl border border-border/60 bg-card/40 overflow-hidden">
          <div className="grid grid-cols-12 border-b border-border/60 bg-muted/30 px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <div className="col-span-4 sm:col-span-5">Capability</div>
            <div className="col-span-4 sm:col-span-3 text-center">Runmend</div>
            <div className="col-span-4 sm:col-span-4 text-center">Claude Cowork</div>
          </div>
          {ROWS.map((row) => (
            <div
              key={row.capability}
              className="grid grid-cols-12 border-b border-border/40 last:border-b-0 px-4 py-4 text-sm"
            >
              <div className="col-span-12 sm:col-span-5 font-medium pb-2 sm:pb-0">
                {row.capability}
              </div>
              <div className="col-span-6 sm:col-span-3 flex items-start gap-2 pr-3">
                <span className="mt-0.5">
                  <MarkIcon mark={row.runmend.mark} />
                </span>
                <span className="text-muted-foreground leading-snug">
                  {row.runmend.note}
                </span>
              </div>
              <div className="col-span-6 sm:col-span-4 flex items-start gap-2">
                <span className="mt-0.5">
                  <MarkIcon mark={row.cowork.mark} />
                </span>
                <span className="text-muted-foreground leading-snug">
                  {row.cowork.note}
                </span>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted-foreground/70 text-center">
          <Check className="inline h-3 w-3 text-emerald-500 mr-1" />
          built-in
          <span className="mx-2">·</span>
          <Minus className="inline h-3 w-3 text-amber-500 mr-1" />
          partial / workaround
          <span className="mx-2">·</span>
          <X className="inline h-3 w-3 text-muted-foreground/60 mr-1" />
          not available
        </p>
      </section>

      <section className="border-y border-border/50 bg-muted/20">
        <div className="max-w-5xl mx-auto px-4 py-16">
          <div className="text-center mb-10">
            <p className="text-sm font-medium text-muted-foreground/70 uppercase tracking-wider mb-3">
              Pick the right one
            </p>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Two filters, one honest call
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="rounded-xl border border-border/60 bg-card/40 p-6">
              <h3 className="text-base font-semibold mb-3">
                Use Claude Cowork (and skip Runmend) if&nbsp;…
              </h3>
              <ul className="space-y-2 text-sm text-muted-foreground leading-relaxed">
                <li className="flex gap-2">
                  <span className="text-muted-foreground/50 mt-1">•</span>
                  You run one Make.com account on one zone, or a single n8n
                  cloud workspace.
                </li>
                <li className="flex gap-2">
                  <span className="text-muted-foreground/50 mt-1">•</span>
                  &ldquo;Did this run today?&rdquo; and an hourly check are enough — a
                  failure can wait a day.
                </li>
                <li className="flex gap-2">
                  <span className="text-muted-foreground/50 mt-1">•</span>
                  You&apos;re already on Claude Pro / Max / Team and would rather
                  not add another tool.
                </li>
                <li className="flex gap-2">
                  <span className="text-muted-foreground/50 mt-1">•</span>
                  You&apos;re a solo operator or hobbyist, not running clients&apos;
                  production work.
                </li>
              </ul>
              <a
                href="https://claude.ai"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 mt-5 text-sm font-medium hover:underline"
              >
                Open Claude.ai
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>

            <div className="rounded-xl border border-foreground/20 bg-card/60 p-6 ring-1 ring-foreground/10">
              <h3 className="text-base font-semibold mb-3">
                Use Runmend if&nbsp;…
              </h3>
              <ul className="space-y-2 text-sm text-muted-foreground leading-relaxed">
                <li className="flex gap-2">
                  <span className="text-foreground/40 mt-1">•</span>
                  You manage multiple clients&apos; Make.com or n8n accounts and
                  need them in one place.
                </li>
                <li className="flex gap-2">
                  <span className="text-foreground/40 mt-1">•</span>
                  Your clients live across more than one Make zone (us1, eu1,
                  eu2, us2).
                </li>
                <li className="flex gap-2">
                  <span className="text-foreground/40 mt-1">•</span>
                  You run self-hosted n8n behind a firewall or in a private
                  cloud where allowlisting Anthropic isn&apos;t an option.
                </li>
                <li className="flex gap-2">
                  <span className="text-foreground/40 mt-1">•</span>
                  A failure going unnoticed for an hour costs you a client —
                  you want it in email or Slack, not buried in a chat tab.
                </li>
                <li className="flex gap-2">
                  <span className="text-foreground/40 mt-1">•</span>
                  You need persistent health history and diagnostics you can
                  forward to a client.
                </li>
              </ul>
              <Link
                href="/signup"
                className="inline-flex items-center gap-1.5 mt-5 text-sm font-medium hover:underline"
              >
                Start free on one client
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <p className="mt-8 max-w-3xl mx-auto text-center text-sm text-muted-foreground leading-relaxed">
            They aren&apos;t mutually exclusive. Plenty of agencies will use both
            — Runmend for paging, history, and multi-account triage; Claude
            Cowork for ad-hoc &ldquo;why did this scenario fail?&rdquo; questions on a
            single connected workflow.
          </p>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-4 py-20 text-center">
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Still on the fence?
        </h2>
        <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
          Connect one client on the free tier. If the native connector covers
          you, it&apos;ll be obvious in a week.
        </p>
        <Link
          href="/signup"
          className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground text-sm font-medium h-10 px-6 mt-6 hover:bg-primary/90 transition-colors"
        >
          Try Runmend free
          <ArrowRight className="ml-2 h-4 w-4" />
        </Link>
      </section>

      <Footer />
    </main>
  );
}

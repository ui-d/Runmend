import Link from "next/link";
import { ArrowRight, Hash, Link2, Webhook, Zap } from "lucide-react";
import { SectionHeader } from "@/components/app/settings/SectionHeader";
import { ComingSoonInline } from "@/components/app/settings/ComingSoonInline";

interface PageProps {
  params: Promise<{ workspaceSlug: string }>;
}

export default async function IntegrationsSettingsPage({ params }: PageProps) {
  const { workspaceSlug } = await params;

  return (
    <section className="space-y-6">
      <SectionHeader
        title="Integrations"
        description="Connections to the platforms Runmend monitors, plus the outbound channels it uses to reach your team."
      />

      {/* Platforms — real, links to connections */}
      <div className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Platforms
        </p>
        <Link
          href={`/app/${workspaceSlug}/connections`}
          className="group flex items-center gap-3 rounded-xl border border-border/60 bg-card/40 p-4 transition-colors hover:bg-card/70"
        >
          <div className="rounded-md bg-emerald-500/10 p-2">
            <Link2 className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium">Make.com &amp; n8n connections</p>
            <p className="text-xs text-muted-foreground">
              Manage the platforms Runmend audits — API keys, instance URLs, and
              health status.
            </p>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>

      {/* Outbound — scaffolded */}
      <div className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Outbound
        </p>
        <div className="space-y-2">
          <ComingSoonInline
            icon={Hash}
            title="Slack"
            description="Deliver alerts to a Slack channel with per-severity routing and @-mentions for on-call."
          />
          <ComingSoonInline
            icon={Webhook}
            title="Generic webhook"
            description="Receive signed JSON payloads on your own endpoint for every alert Runmend fires."
          />
          <ComingSoonInline
            icon={Zap}
            title="Linear"
            description="Open a Linear issue automatically when a critical failure is detected."
          />
        </div>
      </div>
    </section>
  );
}

import { Code, Key, Workflow } from "lucide-react";
import { SectionHeader } from "@/components/app/settings/SectionHeader";
import { ComingSoonInline } from "@/components/app/settings/ComingSoonInline";

export default async function ApiSettingsPage() {
  return (
    <section className="space-y-6">
      <SectionHeader
        title="API"
        description="Programmatic access to Runmend data. Coming in a follow-up release."
      />

      <div className="rounded-2xl border border-border/60 bg-card/40 p-6">
        <div className="flex items-start gap-3">
          <div className="rounded-md bg-muted/60 p-2">
            <Key className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-medium">Personal access tokens</h3>
              <span className="rounded-full border border-border/60 bg-muted/40 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                Coming soon
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Generate scoped tokens to read workspace data, trigger syncs on
              demand, and integrate Runmend with your internal dashboards. If
              you need API access before this ships, reply to your welcome
              email.
            </p>
            <button
              type="button"
              disabled
              className="mt-1 inline-flex h-8 items-center gap-1.5 rounded-lg border border-border/60 bg-muted/30 px-3 text-xs font-medium text-muted-foreground disabled:cursor-not-allowed"
            >
              <Key className="h-3.5 w-3.5" />
              Generate token
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <ComingSoonInline
          icon={Code}
          title="REST + OpenAPI spec"
          description="Typed client SDKs for TypeScript and Python, plus a versioned OpenAPI document."
        />
        <ComingSoonInline
          icon={Workflow}
          title="Inbound webhooks"
          description="POST profile events and custom issue types from your own automation tooling."
        />
      </div>
    </section>
  );
}

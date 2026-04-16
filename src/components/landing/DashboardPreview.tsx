import {
  AlertTriangle,
  ShieldAlert,
  Info,
  Activity,
  ChevronRight,
} from "lucide-react";

const clients = [
  {
    name: "Coastal Content Agency",
    platform: "Make.com",
    health: 34,
    workflows: 47,
    issues: { critical: 3, warning: 2, info: 2 },
    topIssue: "Webhook failure — client onboarding stopped 3 days ago",
  },
  {
    name: "GreenLeaf Commerce",
    platform: "Make.com",
    health: 62,
    workflows: 23,
    issues: { critical: 2, warning: 3, info: 1 },
    topIssue: "Google OAuth token expires in 6 days",
  },
  {
    name: "Creator Stack",
    platform: "n8n",
    health: 78,
    workflows: 31,
    issues: { critical: 0, warning: 2, info: 3 },
    topIssue: null,
  },
  {
    name: "InfraFlow DevOps",
    platform: "n8n",
    health: 91,
    workflows: 18,
    issues: { critical: 0, warning: 1, info: 1 },
    topIssue: null,
  },
];

function healthColor(score: number): string {
  if (score >= 80) return "text-emerald-500";
  if (score >= 60) return "text-amber-500";
  return "text-red-500";
}

function healthBg(score: number): string {
  if (score >= 80) return "bg-emerald-500/10";
  if (score >= 60) return "bg-amber-500/10";
  return "bg-red-500/10";
}

function healthDot(score: number): string {
  if (score >= 80) return "bg-emerald-500";
  if (score >= 60) return "bg-amber-500";
  return "bg-red-500";
}

export function DashboardPreview() {
  const totalIssues = clients.reduce(
    (sum, c) => sum + c.issues.critical + c.issues.warning + c.issues.info,
    0
  );
  const criticalCount = clients.reduce(
    (sum, c) => sum + c.issues.critical,
    0
  );

  return (
    <section className="max-w-5xl mx-auto px-4 pb-20">
      {/* Browser chrome */}
      <div className="rounded-xl border border-border/60 bg-background shadow-2xl shadow-black/5 overflow-hidden">
        {/* Title bar */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50 bg-muted/50">
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-red-400/80" />
            <span className="h-3 w-3 rounded-full bg-amber-400/80" />
            <span className="h-3 w-3 rounded-full bg-emerald-400/80" />
          </div>
          <div className="flex-1 flex justify-center">
            <div className="rounded-md bg-muted px-4 py-1 text-xs text-muted-foreground/70 font-mono">
              app.runmend.com
            </div>
          </div>
          <div className="w-[52px]" /> {/* Spacer to center URL bar */}
        </div>

        {/* Dashboard content */}
        <div className="p-4 sm:p-6 space-y-4">
          {/* Dashboard header */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold">All Clients</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {clients.length} accounts monitored
              </p>
            </div>
            <div className="flex items-center gap-3">
              {criticalCount > 0 && (
                <div className="flex items-center gap-1.5 rounded-full bg-red-500/10 px-2.5 py-1 text-xs font-medium text-red-500">
                  <ShieldAlert className="h-3 w-3" />
                  {criticalCount} critical
                </div>
              )}
              <div className="flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
                <Activity className="h-3 w-3" />
                {totalIssues} issues
              </div>
            </div>
          </div>

          {/* Client rows */}
          <div className="space-y-2">
            {clients.map((client) => (
              <div
                key={client.name}
                className="rounded-lg border border-border/50 bg-muted/20 p-3 sm:p-4 hover:bg-muted/40 transition-colors"
              >
                <div className="flex items-center gap-3 sm:gap-4">
                  {/* Health dot */}
                  <div
                    className={`h-2.5 w-2.5 rounded-full shrink-0 ${healthDot(client.health)}`}
                  />

                  {/* Client info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">
                        {client.name}
                      </span>
                      <span className="hidden sm:inline-flex rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground shrink-0">
                        {client.platform}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {client.workflows} workflows
                    </p>
                  </div>

                  {/* Issue badges */}
                  <div className="hidden sm:flex items-center gap-1.5 shrink-0">
                    {client.issues.critical > 0 && (
                      <span className="flex items-center gap-1 rounded bg-red-500/10 px-1.5 py-0.5 text-[10px] font-medium text-red-500">
                        <AlertTriangle className="h-2.5 w-2.5" />
                        {client.issues.critical}
                      </span>
                    )}
                    {client.issues.warning > 0 && (
                      <span className="flex items-center gap-1 rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-500">
                        <AlertTriangle className="h-2.5 w-2.5" />
                        {client.issues.warning}
                      </span>
                    )}
                    {client.issues.info > 0 && (
                      <span className="flex items-center gap-1 rounded bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-medium text-blue-500">
                        <Info className="h-2.5 w-2.5" />
                        {client.issues.info}
                      </span>
                    )}
                  </div>

                  {/* Health score */}
                  <div
                    className={`shrink-0 rounded-md px-2 py-1 text-xs font-bold ${healthColor(client.health)} ${healthBg(client.health)}`}
                  >
                    {client.health}
                  </div>

                  <ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0 hidden sm:block" />
                </div>

                {/* Top issue callout for unhealthy clients */}
                {client.topIssue && (
                  <div className="mt-2 ml-5.5 sm:ml-6.5 flex items-start gap-2 rounded-md bg-red-500/5 border border-red-500/10 px-3 py-2">
                    <ShieldAlert className="h-3.5 w-3.5 text-red-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-red-400 leading-relaxed">
                      {client.topIssue}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

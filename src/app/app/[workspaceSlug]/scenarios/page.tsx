import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceBySlug } from "@/lib/queries/workspaces";
import { getWorkspaceSubscription } from "@/lib/queries/subscriptions";
import { listScenarios } from "@/lib/queries/preflight";
import { resolveEffectivePlan, PLAN_LIMITS } from "@/lib/stripe";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ShieldCheck, Plus } from "lucide-react";

interface PageProps {
  params: Promise<{ workspaceSlug: string }>;
}

export default async function ScenariosPage({ params }: PageProps) {
  const { workspaceSlug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const workspace = await getWorkspaceBySlug(supabase, workspaceSlug);
  if (!workspace) notFound();

  const [scenarios, subscription] = await Promise.all([
    listScenarios(supabase, workspace.id),
    getWorkspaceSubscription(supabase, workspace.id),
  ]);

  const plan = resolveEffectivePlan(subscription);
  const limit = PLAN_LIMITS[plan].preflightScenarios;
  const canCreate = limit === -1 || scenarios.length < limit;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-emerald-500" />
            Pre-flight Check
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Test client workflows before pushing changes or after silent breakage.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="secondary">
            {scenarios.length}
            {limit !== -1 ? ` / ${limit}` : ""} scenarios
          </Badge>
          <Link
            href={canCreate ? `/app/${workspaceSlug}/scenarios/new` : "#"}
            aria-disabled={!canCreate}
            className={cn(
              buttonVariants({ variant: "default" }),
              !canCreate && "pointer-events-none opacity-50",
            )}
          >
            <Plus className="h-4 w-4 mr-1" />
            New scenario
          </Link>
        </div>
      </div>

      {limit === 0 && (
        <Card className="p-4 border-amber-500/30 bg-amber-500/5">
          <p className="text-sm">
            Pre-flight Check is a Pro and Agency feature.{" "}
            <Link className="underline" href={`/app/${workspaceSlug}/billing`}>
              Upgrade
            </Link>{" "}
            to start catching regressions before clients notice.
          </p>
        </Card>
      )}

      {limit !== 0 && scenarios.length === 0 && (
        <Card className="p-12 text-center">
          <ShieldCheck className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
          <h3 className="font-medium mb-1">No scenarios yet</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Create your first pre-flight scenario to start validating workflow outputs.
          </p>
          <Link
            href={`/app/${workspaceSlug}/scenarios/new`}
            className={buttonVariants({ variant: "default" })}
          >
            <Plus className="h-4 w-4 mr-1" />
            New scenario
          </Link>
        </Card>
      )}

      {scenarios.length > 0 && (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-2 font-medium">Name</th>
                <th className="text-left px-4 py-2 font-medium">Workflow</th>
                <th className="text-left px-4 py-2 font-medium">Schedule</th>
                <th className="text-left px-4 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {scenarios.map((s) => (
                <tr key={s.id} className="border-t border-border hover:bg-accent/50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/app/${workspaceSlug}/scenarios/${s.id}`}
                      className="font-medium hover:underline"
                    >
                      {s.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {s.workflow_name ?? s.workflow_external_id}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground font-mono text-xs">
                    {s.schedule_cron ?? "Manual"}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={s.enabled ? "default" : "secondary"}>
                      {s.enabled ? "Enabled" : "Disabled"}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

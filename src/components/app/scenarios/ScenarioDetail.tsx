"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Play } from "lucide-react";
import type { RunRow, ScenarioRow } from "@/lib/preflight/types";

interface ScenarioDetailProps {
  scenario: ScenarioRow;
  workspaceSlug: string;
  recentRuns: RunRow[];
  inputCount: number;
  assertionCount: number;
}

export function ScenarioDetail({
  scenario,
  workspaceSlug,
  recentRuns,
  inputCount,
  assertionCount,
}: ScenarioDetailProps) {
  const router = useRouter();
  const [running, setRunning] = useState(false);

  async function triggerRun() {
    if (running) return;
    setRunning(true);
    try {
      const res = await fetch(`/api/scenarios/${scenario.id}/run`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Failed to trigger run");
        return;
      }
      toast.success(
        `Run finished: ${data.run.status} (${data.run.passedCount}/${data.run.totalInputs} passed)`,
      );
      router.push(
        `/app/${workspaceSlug}/scenarios/${scenario.id}/runs/${data.run.runId}`,
      );
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Run failed");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {scenario.name}
          </h1>
          {scenario.description && (
            <p className="text-sm text-muted-foreground mt-1">
              {scenario.description}
            </p>
          )}
          <div className="flex gap-2 mt-3 text-xs text-muted-foreground">
            <Badge variant="secondary">
              {scenario.workflow_name ?? scenario.workflow_external_id}
            </Badge>
            <Badge variant="secondary">{inputCount} inputs</Badge>
            <Badge variant="secondary">{assertionCount} assertions</Badge>
            <Badge variant="secondary">
              cost cap ${(scenario.cost_cap_cents / 100).toFixed(2)}
            </Badge>
          </div>
        </div>
        <Button onClick={triggerRun} disabled={running || inputCount === 0}>
          <Play className="h-4 w-4 mr-1" />
          {running ? "Running..." : "Run now"}
        </Button>
      </div>

      <Card className="overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/30">
          <h2 className="font-medium text-sm">Recent runs</h2>
        </div>
        {recentRuns.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No runs yet. Click &quot;Run now&quot; to trigger your first run.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/20 text-muted-foreground text-xs">
              <tr>
                <th className="text-left px-4 py-2 font-medium">Started</th>
                <th className="text-left px-4 py-2 font-medium">Status</th>
                <th className="text-left px-4 py-2 font-medium">Pass rate</th>
                <th className="text-left px-4 py-2 font-medium">Cost</th>
                <th className="text-left px-4 py-2 font-medium">Trigger</th>
              </tr>
            </thead>
            <tbody>
              {recentRuns.map((r) => (
                <tr key={r.id} className="border-t border-border hover:bg-accent/40">
                  <td className="px-4 py-2 font-mono text-xs">
                    <Link
                      href={`/app/${workspaceSlug}/scenarios/${scenario.id}/runs/${r.id}`}
                      className="hover:underline"
                    >
                      {new Date(r.started_at).toLocaleString()}
                    </Link>
                  </td>
                  <td className="px-4 py-2">
                    <RunStatusBadge status={r.status} />
                  </td>
                  <td className="px-4 py-2">
                    {r.pass_rate !== null
                      ? `${Math.round(r.pass_rate * 100)}%`
                      : "—"}
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">
                    ${(r.total_cost_cents / 100).toFixed(2)}
                  </td>
                  <td className="px-4 py-2 text-muted-foreground capitalize">
                    {r.triggered_by}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}

function RunStatusBadge({ status }: { status: string }) {
  const variant =
    status === "passed"
      ? "default"
      : status === "failed" || status === "errored" || status === "cost_capped"
        ? "destructive"
        : "secondary";
  return (
    <Badge variant={variant} className="capitalize">
      {status.replace("_", " ")}
    </Badge>
  );
}

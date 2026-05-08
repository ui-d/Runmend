"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Json } from "@/lib/database.types";
import type { RunResultRow, RunRow } from "@/lib/preflight/types";

const DiffViewer = dynamic(() => import("react-diff-viewer-continued"), {
  ssr: false,
});

interface InputLookup {
  id: string;
  label: string | null;
}

interface RunResultsViewProps {
  run: RunRow;
  results: RunResultRow[];
  inputs: InputLookup[];
  baselineByInputId: Record<string, Json | null>;
}

export function RunResultsView({
  run,
  results,
  inputs,
  baselineByInputId,
}: RunResultsViewProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const inputLabel = (id: string) =>
    inputs.find((i) => i.id === id)?.label ?? id.slice(0, 8);

  return (
    <div className="space-y-4">
      <SummaryCards run={run} />
      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/30 text-muted-foreground text-xs">
            <tr>
              <th className="text-left px-4 py-2 font-medium">Input</th>
              <th className="text-left px-4 py-2 font-medium">Result</th>
              <th className="text-left px-4 py-2 font-medium">Latency</th>
              <th className="text-left px-4 py-2 font-medium">Failures</th>
            </tr>
          </thead>
          <tbody>
            {results.map((r) => {
              const isExpanded = expandedId === r.id;
              const failedAssertions = Array.isArray(r.assertion_results)
                ? (r.assertion_results as Array<{ passed: boolean; message?: string }>).filter(
                    (a) => !a.passed,
                  )
                : [];
              return (
                <tr key={r.id} className="border-t border-border align-top">
                  <td className="px-4 py-2">
                    <button
                      type="button"
                      onClick={() => setExpandedId(isExpanded ? null : r.id)}
                      className="hover:underline text-left"
                    >
                      {inputLabel(r.input_id)}
                    </button>
                  </td>
                  <td className="px-4 py-2">
                    <Badge variant={r.passed ? "default" : "destructive"}>
                      {r.passed ? "Passed" : "Failed"}
                    </Badge>
                    {isExpanded && r.output_data && (
                      <div className="mt-3">
                        <DiffViewer
                          oldValue={JSON.stringify(
                            baselineByInputId[r.input_id] ?? null,
                            null,
                            2,
                          )}
                          newValue={JSON.stringify(r.output_data, null, 2)}
                          splitView
                          hideLineNumbers
                          useDarkTheme
                          leftTitle="Baseline"
                          rightTitle="Current"
                        />
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {r.latency_ms ? `${r.latency_ms}ms` : "—"}
                  </td>
                  <td className="px-4 py-2 text-xs text-muted-foreground">
                    {failedAssertions.length === 0
                      ? "—"
                      : failedAssertions
                          .map((a) => a.message ?? "(no message)")
                          .join("; ")}
                    {r.error_message && (
                      <div className="text-destructive mt-1">{r.error_message}</div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function SummaryCards({ run }: { run: RunRow }) {
  const stats = [
    { label: "Status", value: run.status.replace("_", " ") },
    { label: "Total inputs", value: String(run.total_inputs) },
    {
      label: "Pass rate",
      value:
        run.pass_rate !== null
          ? `${Math.round(run.pass_rate * 100)}%`
          : "—",
    },
    { label: "Failed", value: String(run.failed_count) },
    { label: "Errored", value: String(run.errored_count) },
    { label: "Cost", value: `$${(run.total_cost_cents / 100).toFixed(2)}` },
  ];
  return (
    <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
      {stats.map((s) => (
        <Card key={s.label} className="p-3">
          <div className="text-xs text-muted-foreground">{s.label}</div>
          <div className="text-lg font-semibold capitalize mt-1">{s.value}</div>
        </Card>
      ))}
    </div>
  );
}

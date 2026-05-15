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

interface AssertionOutcome {
  assertion_id: string;
  assertion_type: string;
  passed: boolean;
  severity: "fail" | "warn";
  message: string | null;
  reason?: string;
  details?: Record<string, unknown> | null;
  costCents?: number;
}

function asOutcomes(value: Json | null): AssertionOutcome[] {
  return Array.isArray(value) ? (value as unknown as AssertionOutcome[]) : [];
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
              <th className="text-left px-4 py-2 font-medium">Assertions</th>
            </tr>
          </thead>
          <tbody>
            {results.map((r) => {
              const isExpanded = expandedId === r.id;
              const outcomes = asOutcomes(r.assertion_results);
              const failed = outcomes.filter((a) => !a.passed);
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
                    {isExpanded && (
                      <div
                        className="mt-3 space-y-3"
                        data-testid="assertion-detail"
                      >
                        {outcomes.map((o, i) => (
                          <AssertionOutcomeView key={o.assertion_id ?? i} o={o} />
                        ))}
                        {r.output_data ? (
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
                        ) : null}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {r.latency_ms ? `${r.latency_ms}ms` : "—"}
                  </td>
                  <td className="px-4 py-2 text-xs text-muted-foreground">
                    {failed.length === 0
                      ? "—"
                      : failed.map((a) => a.message ?? "(no message)").join("; ")}
                    {r.error_message && (
                      <div className="text-destructive mt-1">
                        {r.error_message}
                      </div>
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

/** Per-assertion detail, dispatched by type. Types 1-4 fall back to the message. */
function AssertionOutcomeView({ o }: { o: AssertionOutcome }) {
  if (o.assertion_type === "latency_under_ms") {
    return <LatencyBar o={o} />;
  }
  if (o.assertion_type === "cost_under_cents") {
    return <CostDetail o={o} />;
  }
  if (o.assertion_type === "llm_judge") {
    return <JudgeDetail o={o} />;
  }
  return (
    <div className="text-xs">
      <span className="font-medium">{o.assertion_type}</span>{" "}
      <StatusPill o={o} />
      {o.message ? (
        <span className="text-muted-foreground"> — {o.message}</span>
      ) : null}
    </div>
  );
}

function StatusPill({ o }: { o: AssertionOutcome }) {
  if (o.passed) return <Badge variant="default">Passed</Badge>;
  if (o.severity === "warn") return <Badge variant="secondary">Warn</Badge>;
  return <Badge variant="destructive">Failed</Badge>;
}

function num(d: Record<string, unknown> | null | undefined, k: string): number | null {
  const v = d?.[k];
  return typeof v === "number" ? v : null;
}

function LatencyBar({ o }: { o: AssertionOutcome }) {
  const latency = num(o.details, "latency_ms");
  const max = num(o.details, "max_ms");
  const pct =
    latency !== null && max !== null && max > 0
      ? Math.min(100, Math.round((latency / max) * 100))
      : 0;
  return (
    <div className="text-xs" data-testid="latency-bar">
      <div className="flex items-center justify-between mb-1">
        <span className="font-medium">Latency</span>
        <span className="text-muted-foreground">
          {latency ?? "—"}ms / {max ?? "—"}ms
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full ${o.passed ? "bg-emerald-500" : "bg-destructive"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function CostDetail({ o }: { o: AssertionOutcome }) {
  if (o.reason === "platform_unsupported") {
    return (
      <div className="text-xs space-y-1" data-testid="make-cost-gap">
        <Badge variant="secondary">Not available on Make</Badge>
        <p className="text-muted-foreground">{o.message}</p>
      </div>
    );
  }
  const total = num(o.details, "total_cents");
  const breakdown = Array.isArray(o.details?.breakdown)
    ? (o.details!.breakdown as Array<Record<string, unknown>>)
    : [];
  const warnings = Array.isArray(o.details?.warnings)
    ? (o.details!.warnings as string[])
    : [];
  return (
    <div className="text-xs space-y-1" data-testid="cost-breakdown">
      <div className="flex items-center gap-2">
        <span className="font-medium">Cost</span>
        <StatusPill o={o} />
        <span className="text-muted-foreground">
          {total !== null ? `${total}¢` : "—"}
        </span>
      </div>
      {breakdown.length > 0 && (
        <details>
          <summary className="cursor-pointer text-muted-foreground">
            Per-node breakdown ({breakdown.length})
          </summary>
          <table className="mt-1 w-full">
            <tbody>
              {breakdown.map((b, i) => (
                <tr key={i} className="border-t border-border/50">
                  <td className="py-1 pr-2">{String(b.node ?? "node")}</td>
                  <td className="py-1 pr-2 text-muted-foreground">
                    {String(b.model ?? "—")}
                  </td>
                  <td className="py-1 text-right">
                    {typeof b.cents === "number"
                      ? `${b.cents.toFixed(4)}¢`
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      )}
      {warnings.length > 0 && (
        <p className="text-amber-600 dark:text-amber-500">
          {warnings.join("; ")}
        </p>
      )}
    </div>
  );
}

function JudgeDetail({ o }: { o: AssertionOutcome }) {
  if (o.reason === "judge_unavailable" || o.reason === "judge_prompt_too_large") {
    return (
      <div className="text-xs space-y-1" data-testid="judge-unavailable">
        <Badge variant="secondary">Judge unavailable</Badge>
        <p className="text-muted-foreground">{o.message}</p>
      </div>
    );
  }
  const score = num(o.details, "score");
  const confidence = String(o.details?.confidence ?? "");
  const reasoning = String(o.details?.reasoning ?? o.message ?? "");
  const confidenceVariant =
    confidence === "high"
      ? "default"
      : confidence === "medium"
        ? "secondary"
        : "outline";
  return (
    <div className="text-xs space-y-2" data-testid="judge-detail">
      <div className="flex items-center gap-2">
        <span className="font-medium">LLM judge</span>
        <Badge
          variant={o.passed ? "default" : "destructive"}
          data-testid="judge-score"
        >
          Score {score ?? "—"}
        </Badge>
        {confidence && (
          <Badge variant={confidenceVariant} data-testid="judge-confidence">
            {confidence} confidence
          </Badge>
        )}
      </div>
      {reasoning && (
        <p className="rounded-md border border-border bg-muted/40 p-2 leading-relaxed text-muted-foreground">
          {reasoning}
        </p>
      )}
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
        run.pass_rate !== null ? `${Math.round(run.pass_rate * 100)}%` : "—",
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

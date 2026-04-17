"use client";

import { useState } from "react";
import Link from "next/link";
import {
  RefreshCw,
  History,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  DiagnosticNarrative as DiagnosticNarrativeType,
  HealthStatus,
  getHealthColorClasses,
  getHealthLabel,
} from "@/lib/types";

interface DiagnosticNarrativeProps {
  narrative: DiagnosticNarrativeType | null;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  historyUrl?: string;
  healthStatus?: HealthStatus;
}

const MAX_RECOMMENDATION_BULLETS = 5;

export function DiagnosticNarrative({
  narrative,
  isLoading,
  error,
  onRetry,
  historyUrl,
  healthStatus,
}: DiagnosticNarrativeProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between gap-2 mb-5">
          <div className="flex items-center gap-2 min-w-0">
            <Sparkles className="h-4 w-4 text-muted-foreground shrink-0" />
            <h2 className="text-sm font-medium">AI Diagnostic</h2>
            {healthStatus && <HealthPill status={healthStatus} />}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {historyUrl && narrative && (
              <Link href={historyUrl}>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-muted-foreground"
                >
                  <History className="h-3 w-3 mr-1" />
                  History
                </Button>
              </Link>
            )}
            {narrative && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onRetry}
                className="text-xs text-muted-foreground"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Regenerate
              </Button>
            )}
          </div>
        </div>

        {isLoading && <LoadingSkeleton />}

        {error && (
          <div className="text-center py-8">
            <p className="text-sm text-destructive mb-3">{error}</p>
            <Button variant="outline" size="sm" onClick={onRetry}>
              <RefreshCw className="h-3 w-3 mr-1" />
              Try again
            </Button>
          </div>
        )}

        {narrative && !isLoading && (
          <div className="space-y-5">
            <OverallSummary text={narrative.overallHealth} />
            <CriticalFinding text={narrative.mostDangerousIssue} />
            <Recommendations text={narrative.recommendations} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function HealthPill({ status }: { status: HealthStatus }) {
  const colors = getHealthColorClasses(status);
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${colors.text} ${colors.border}/40 bg-transparent`}
    >
      {getHealthLabel(status)}
    </span>
  );
}

function OverallSummary({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const trimmed = text.trim();
  const isLong = trimmed.length > 160;

  return (
    <div>
      <SectionLabel>Summary</SectionLabel>
      <p
        className={`text-sm leading-relaxed ${
          expanded || !isLong ? "" : "line-clamp-2"
        }`}
      >
        {trimmed}
      </p>
      {isLong && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {expanded ? "Show less" : "Show more"}
        </button>
      )}
    </div>
  );
}

function CriticalFinding({ text }: { text: string }) {
  return (
    <div className="rounded-md border-l-4 border-l-red-500 bg-red-500/5 p-3">
      <div className="flex items-start gap-2">
        <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-red-500/80 mb-1">
            Critical Finding
          </p>
          <p className="text-sm leading-snug">{text.trim()}</p>
        </div>
      </div>
    </div>
  );
}

function Recommendations({ text }: { text: string }) {
  const bullets = splitIntoBullets(text);

  return (
    <div>
      <SectionLabel>Recommendations</SectionLabel>
      {bullets.length > 1 ? (
        <ul className="space-y-2">
          {bullets.map((bullet, i) => (
            <li key={i} className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
              <span className="text-sm leading-snug">{bullet}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm leading-relaxed">{text.trim()}</p>
      )}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-wider mb-2">
      {children}
    </p>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-5">
      <div>
        <Skeleton className="h-3 w-20 mb-2" />
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-3/4" />
      </div>
      <div className="rounded-md border-l-4 border-l-red-500/50 bg-red-500/5 p-3 space-y-2">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-3 w-32 mb-2" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-11/12" />
        <Skeleton className="h-4 w-4/5" />
      </div>
    </div>
  );
}

function splitIntoBullets(text: string): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  // Split on sentence boundaries: period/!/? followed by whitespace + capital letter
  const sentences = trimmed
    .split(/(?<=[.!?])\s+(?=[A-Z0-9])/)
    .map((s) => s.trim())
    .filter(Boolean);

  if (sentences.length <= 1) return [trimmed];

  return sentences.slice(0, MAX_RECOMMENDATION_BULLETS);
}

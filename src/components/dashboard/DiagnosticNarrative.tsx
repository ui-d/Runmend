"use client";

import Link from "next/link";
import { RefreshCw, History } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { DiagnosticNarrative as DiagnosticNarrativeType } from "@/lib/types";

interface DiagnosticNarrativeProps {
  narrative: DiagnosticNarrativeType | null;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  historyUrl?: string;
}

export function DiagnosticNarrative({
  narrative,
  isLoading,
  error,
  onRetry,
  historyUrl,
}: DiagnosticNarrativeProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-medium text-muted-foreground">
            AI Diagnostic
          </h2>
          <div className="flex items-center gap-1">
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

        {isLoading && (
          <div className="space-y-6">
            <div>
              <p className="text-xs font-medium text-muted-foreground/50 mb-2">
                Generating diagnostic...
              </p>
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-3/4" />
            </div>
            <div>
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-5/6" />
            </div>
            <div>
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </div>
        )}

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
          <div className="space-y-6">
            <div>
              <p className="text-xs font-medium text-muted-foreground/50 uppercase tracking-wider mb-2">
                Overall Assessment
              </p>
              <p className="text-sm leading-relaxed">
                {narrative.overallHealth}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium text-red-500/70 uppercase tracking-wider mb-2">
                Critical Finding
              </p>
              <p className="text-sm leading-relaxed">
                {narrative.mostDangerousIssue}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium text-muted-foreground/50 uppercase tracking-wider mb-2">
                Recommendations
              </p>
              <p className="text-sm leading-relaxed">
                {narrative.recommendations}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

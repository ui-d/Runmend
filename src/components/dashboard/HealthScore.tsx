"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  getHealthStatus,
  getHealthColorClasses,
  getHealthLabel,
} from "@/lib/types";

interface HealthScoreProps {
  score: number;
}

export function HealthScore({ score }: HealthScoreProps) {
  const status = getHealthStatus(score);
  const colors = getHealthColorClasses(status);
  const label = getHealthLabel(status);

  return (
    <Card>
      <CardContent className="p-6">
        <h2 className="text-sm font-medium text-muted-foreground mb-4">
          Automation Health Score
        </h2>

        <div className="flex items-end gap-3 mb-4">
          <span className={`text-5xl font-bold tabular-nums ${colors.text}`}>
            {score}
          </span>
          <span className="text-2xl text-muted-foreground mb-1">/100</span>
        </div>

        <div className="w-full h-3 rounded-full bg-muted overflow-hidden mb-4">
          <div
            className={`h-full rounded-full transition-all duration-1000 ease-out ${colors.bg}`}
            style={{ width: `${score}%` }}
          />
        </div>

        <Badge
          variant="outline"
          className={`${colors.text} border-current`}
        >
          {label}
        </Badge>
      </CardContent>
    </Card>
  );
}

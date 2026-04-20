import type { SparklineBucket } from "@/lib/queries/connections";

interface ConnectionSyncSparklineProps {
  buckets: SparklineBucket[];
  height?: number;
}

/**
 * 24 hourly bars of execution activity: each bar scales to the busiest
 * hour's total, failed runs stack in the destructive color on top of
 * successful ones. Empty bars render as a 1px baseline so the row keeps
 * shape even on quiet connections.
 */
export function ConnectionSyncSparkline({
  buckets,
  height = 28,
}: ConnectionSyncSparklineProps) {
  const max = buckets.reduce((m, b) => Math.max(m, b.total), 0);

  if (max === 0) {
    return (
      <div
        className="flex w-full items-center text-[10px] text-muted-foreground/70"
        style={{ height }}
      >
        No executions in the last 24h
      </div>
    );
  }

  return (
    <div
      className="flex w-full items-end gap-[2px]"
      style={{ height }}
      aria-label="24 hour execution activity"
    >
      {buckets.map((b) => {
        const ratio = b.total === 0 ? 0 : b.total / max;
        const failedRatio = b.total === 0 ? 0 : b.failed / b.total;
        const barHeight = Math.max(2, Math.round(ratio * height));
        const failedHeight = Math.round(barHeight * failedRatio);
        const successHeight = barHeight - failedHeight;
        return (
          <div
            key={b.hour}
            className="relative flex-1 overflow-hidden rounded-sm bg-muted/60"
            style={{ height: barHeight || 2 }}
            title={`Hour ${b.hour}: ${b.total} runs, ${b.failed} failed`}
          >
            {successHeight > 0 && (
              <div
                className="absolute inset-x-0 bottom-0 bg-emerald-500/80"
                style={{ height: successHeight }}
              />
            )}
            {failedHeight > 0 && (
              <div
                className="absolute inset-x-0 bg-red-500/80"
                style={{ bottom: successHeight, height: failedHeight }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

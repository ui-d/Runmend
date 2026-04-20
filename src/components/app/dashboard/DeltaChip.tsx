import { Minus, TrendingDown, TrendingUp } from "lucide-react";

interface DeltaChipProps {
  delta: number | null;
  size?: "xs" | "sm";
}

/**
 * Shared trend-delta indicator. Null = render nothing (caller controls
 * spacing). Positive = green up arrow, negative = red down arrow, zero =
 * muted "flat".
 */
export function DeltaChip({ delta, size = "xs" }: DeltaChipProps) {
  if (delta === null) return null;
  const text = size === "xs" ? "text-[10px]" : "text-xs";
  const icon = size === "xs" ? "h-2.5 w-2.5" : "h-3 w-3";

  if (delta === 0) {
    return (
      <span
        className={`inline-flex items-center gap-0.5 ${text} text-muted-foreground`}
      >
        <Minus className={icon} />
        flat
      </span>
    );
  }
  const positive = delta > 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 font-medium tabular-nums ${text} ${
        positive ? "text-emerald-500" : "text-red-500"
      }`}
    >
      {positive ? (
        <TrendingUp className={icon} />
      ) : (
        <TrendingDown className={icon} />
      )}
      {positive ? "+" : ""}
      {delta}
    </span>
  );
}

import {
  healthSeverity,
  healthSeverityClasses,
  sparklinePath,
  type SparklinePoint,
} from "@/lib/dashboard/derivations";
import { DeltaChip } from "@/components/app/dashboard/DeltaChip";

interface HealthCellProps {
  score: number;
  sparkline: SparklinePoint[];
  delta: number | null;
}

const W = 64;
const H = 20;

/**
 * The most information-dense cell in the table: score (color-coded), inline
 * 14-day sparkline, and trend delta — same column footprint as the old "60
 * Warning" plain text cell.
 */
export function HealthCell({ score, sparkline, delta }: HealthCellProps) {
  const sev = healthSeverity(score);
  const colors = healthSeverityClasses(sev);
  const geometry = sparklinePath(sparkline, W, H, 2);
  const showSpark = geometry.points.length >= 2;

  return (
    <span className="inline-flex items-center gap-2">
      <span className={`text-base font-semibold tabular-nums ${colors.text}`}>
        {score}
      </span>
      {showSpark ? (
        <svg
          viewBox={`0 0 ${W} ${H}`}
          width={W}
          height={H}
          className="shrink-0"
          preserveAspectRatio="none"
          aria-hidden
        >
          <path
            d={geometry.pathD}
            fill="none"
            strokeWidth={1.25}
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`${colors.stroke} stroke-current`}
          />
        </svg>
      ) : (
        <span className="text-[10px] text-muted-foreground/60" style={{ width: W }}>
          —
        </span>
      )}
      <DeltaChip delta={delta} />
    </span>
  );
}

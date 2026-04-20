"use client";

import {
  AutomationIssue,
  getHealthStatus,
  getHealthColorClasses,
  getHealthLabel,
} from "@/lib/types";

interface HealthHeroProps {
  score: number;
  issues: AutomationIssue[];
}

const WIDTH = 260;
const HEIGHT = 168;
const CX = WIDTH / 2;
const CY = 142;
const OUTER_RADIUS = 104;
const TRACK_WIDTH = 10;
const PROGRESS_WIDTH = 14;
const TICK_OUTER = OUTER_RADIUS + 6;
const TICK_INNER = OUTER_RADIUS - PROGRESS_WIDTH - 4;

const LOW_THRESHOLD = 40;
const MID_THRESHOLD = 70;

export function HealthHero({ score, issues }: HealthHeroProps) {
  const clamped = Math.max(0, Math.min(100, score));
  const status = getHealthStatus(clamped);
  const colors = getHealthColorClasses(status);
  const summary = buildSummary(clamped, issues.length);

  const redTrack = describeArc(CX, CY, OUTER_RADIUS, -180, scoreToAngle(LOW_THRESHOLD));
  const amberTrack = describeArc(
    CX,
    CY,
    OUTER_RADIUS,
    scoreToAngle(LOW_THRESHOLD),
    scoreToAngle(MID_THRESHOLD),
  );
  const greenTrack = describeArc(CX, CY, OUTER_RADIUS, scoreToAngle(MID_THRESHOLD), 0);

  const scoreAngle = scoreToAngle(clamped);
  const progressArc = describeArc(CX, CY, OUTER_RADIUS, -180, scoreAngle);
  const headPoint = polarToCartesian(CX, CY, OUTER_RADIUS, scoreAngle);

  const tickPoints = [LOW_THRESHOLD, MID_THRESHOLD].map((value) => {
    const angle = scoreToAngle(value);
    return {
      value,
      outer: polarToCartesian(CX, CY, TICK_OUTER, angle),
      inner: polarToCartesian(CX, CY, TICK_INNER, angle),
      label: polarToCartesian(CX, CY, TICK_OUTER + 10, angle),
    };
  });

  return (
    <section className="rounded-2xl border border-border/60 bg-card/60 p-6 sm:p-8">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:gap-10">
        <div
          className="relative shrink-0"
          style={{ width: WIDTH, height: HEIGHT }}
        >
          <svg
            width={WIDTH}
            height={HEIGHT}
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            aria-label={`Health score ${clamped} out of 100`}
            role="img"
          >
            <path
              d={redTrack}
              fill="none"
              strokeWidth={TRACK_WIDTH}
              strokeLinecap="butt"
              className="stroke-red-500/25"
            />
            <path
              d={amberTrack}
              fill="none"
              strokeWidth={TRACK_WIDTH}
              strokeLinecap="butt"
              className="stroke-yellow-500/25"
            />
            <path
              d={greenTrack}
              fill="none"
              strokeWidth={TRACK_WIDTH}
              strokeLinecap="butt"
              className="stroke-emerald-500/25"
            />

            <path
              d={progressArc}
              fill="none"
              strokeWidth={PROGRESS_WIDTH}
              strokeLinecap="round"
              className={`${colors.text} stroke-current transition-[d] duration-700 ease-out`}
            />

            <circle
              cx={headPoint.x}
              cy={headPoint.y}
              r={5}
              className={`${colors.text} fill-current`}
            />
            <circle
              cx={headPoint.x}
              cy={headPoint.y}
              r={2}
              className="fill-background"
            />

            {tickPoints.map((t) => (
              <g key={t.value}>
                <line
                  x1={t.inner.x}
                  y1={t.inner.y}
                  x2={t.outer.x}
                  y2={t.outer.y}
                  strokeWidth={1}
                  className="stroke-muted-foreground/40"
                />
                <text
                  x={t.label.x}
                  y={t.label.y + 3}
                  textAnchor="middle"
                  className="fill-muted-foreground text-[10px] tabular-nums"
                >
                  {t.value}
                </text>
              </g>
            ))}
          </svg>

          <div
            className="pointer-events-none absolute inset-x-0 flex flex-col items-center"
            style={{ top: "52%" }}
          >
            <div className="flex items-baseline gap-1">
              <span
                className={`text-[44px] font-bold tabular-nums leading-none ${colors.text}`}
              >
                {clamped}
              </span>
              <span className="text-sm font-medium text-muted-foreground/60">
                /100
              </span>
            </div>
            <span
              className={`mt-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] ${colors.text}`}
            >
              {getHealthLabel(status)}
            </span>
          </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <h2 className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Automation health
          </h2>
          <p className={`text-xl font-semibold leading-snug ${colors.text}`}>
            {summary.headline}
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {summary.detail}
          </p>
        </div>
      </div>
    </section>
  );
}

function scoreToAngle(score: number): number {
  // 0 → -180° (left), 100 → 0° (right), sweeping clockwise over the top.
  return -180 + (Math.max(0, Math.min(100, score)) / 100) * 180;
}

function polarToCartesian(
  cx: number,
  cy: number,
  radius: number,
  angleDeg: number,
): { x: number; y: number } {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(rad),
    y: cy + radius * Math.sin(rad),
  };
}

function describeArc(
  cx: number,
  cy: number,
  radius: number,
  startAngle: number,
  endAngle: number,
): string {
  if (endAngle === startAngle) {
    const pt = polarToCartesian(cx, cy, radius, startAngle);
    return `M ${pt.x} ${pt.y}`;
  }
  const start = polarToCartesian(cx, cy, radius, startAngle);
  const end = polarToCartesian(cx, cy, radius, endAngle);
  const largeArc = Math.abs(endAngle - startAngle) > 180 ? 1 : 0;
  const sweep = endAngle > startAngle ? 1 : 0;
  return [
    "M",
    start.x,
    start.y,
    "A",
    radius,
    radius,
    0,
    largeArc,
    sweep,
    end.x,
    end.y,
  ].join(" ");
}

interface Summary {
  headline: string;
  detail: string;
}

function buildSummary(score: number, issueCount: number): Summary {
  if (score >= MID_THRESHOLD) {
    return {
      headline: "Everything is running cleanly.",
      detail:
        issueCount === 0
          ? "No open issues across the 6 detectors."
          : `${issueCount} low-severity finding${issueCount === 1 ? "" : "s"} — nothing urgent.`,
    };
  }
  if (score >= LOW_THRESHOLD) {
    return {
      headline: "Needs attention soon.",
      detail:
        issueCount === 1
          ? "1 issue is pulling the score down — open it below to decide."
          : `${issueCount} issues are pulling the score down — open them below to decide.`,
    };
  }
  return {
    headline: "Something is badly broken.",
    detail:
      issueCount === 1
        ? "1 critical finding is blocking healthy operation."
        : `${issueCount} findings are blocking healthy operation.`,
  };
}

"use client";

import { useMemo } from "react";
import { useInView } from "./useInView";
import { useReducedMotion } from "./useReducedMotion";

type Tone = "critical" | "warning" | "ok" | "muted";

interface SparklineProps {
  data: number[];
  tone?: Tone;
  width?: number;
  height?: number;
  className?: string;
}

const toneColor: Record<Tone, string> = {
  critical: "#ef4444",
  warning: "#f59e0b",
  ok: "#10b981",
  muted: "#71717a",
};

export function Sparkline({
  data,
  tone = "muted",
  width = 80,
  height = 24,
  className = "",
}: SparklineProps) {
  const { ref, inView } = useInView<SVGSVGElement>();
  const reduced = useReducedMotion();

  const { path, area } = useMemo(() => {
    if (data.length < 2) return { path: "", area: "" };
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const stepX = width / (data.length - 1);
    const points = data.map((v, i) => {
      const x = i * stepX;
      const y = height - ((v - min) / range) * (height - 4) - 2;
      return [x, y] as const;
    });
    const path = points
      .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`)
      .join(" ");
    const area = `${path} L${width},${height} L0,${height} Z`;
    return { path, area };
  }, [data, width, height]);

  const color = toneColor[tone];
  const animate = !reduced && inView;

  return (
    <svg
      ref={ref}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`spark-fill-${tone}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d={area}
        fill={`url(#spark-fill-${tone})`}
        style={{
          opacity: animate ? 1 : reduced ? 1 : 0,
          transition: "opacity 800ms ease-out 400ms",
        }}
      />
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          strokeDasharray: 400,
          strokeDashoffset: animate ? 0 : reduced ? 0 : 400,
          transition: "stroke-dashoffset 1400ms cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      />
    </svg>
  );
}

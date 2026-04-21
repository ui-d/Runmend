"use client";

import { useEffect, useState } from "react";
import { useInView } from "./useInView";
import { useReducedMotion } from "./useReducedMotion";

interface CountUpProps {
  to: number;
  from?: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  className?: string;
  format?: (value: number) => string;
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function CountUp({
  to,
  from = 0,
  duration = 1400,
  prefix = "",
  suffix = "",
  decimals = 0,
  className = "",
  format,
}: CountUpProps) {
  const { ref, inView } = useInView<HTMLSpanElement>();
  const reduced = useReducedMotion();
  const [value, setValue] = useState<number>(reduced ? to : from);

  useEffect(() => {
    if (!inView) return;
    if (reduced) {
      setValue(to);
      return;
    }

    let raf = 0;
    const start = performance.now();
    const delta = to - from;

    const tick = (now: number) => {
      const elapsed = now - start;
      const t = Math.min(1, elapsed / duration);
      const eased = easeOutCubic(t);
      setValue(from + delta * eased);
      if (t < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        setValue(to);
      }
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, reduced, from, to, duration]);

  const display = format
    ? format(value)
    : `${prefix}${value.toFixed(decimals)}${suffix}`;

  return (
    <span ref={ref} className={className}>
      {display}
    </span>
  );
}

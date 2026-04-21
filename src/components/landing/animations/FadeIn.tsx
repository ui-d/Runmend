"use client";

import type { ReactNode } from "react";
import { useInView } from "./useInView";
import { useReducedMotion } from "./useReducedMotion";

interface FadeInProps {
  children: ReactNode;
  delay?: number;
  className?: string;
  as?: "div" | "section" | "li" | "article";
}

export function FadeIn({
  children,
  delay = 0,
  className = "",
  as: Tag = "div",
}: FadeInProps) {
  const { ref, inView } = useInView<HTMLDivElement>();
  const reduced = useReducedMotion();

  const shouldAnimate = !reduced;
  const visible = !shouldAnimate || inView;

  const style = shouldAnimate
    ? {
        transitionDelay: `${delay}ms`,
        transitionDuration: "700ms",
        transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
        transitionProperty: "opacity, transform",
      }
    : undefined;

  const classes = [
    className,
    shouldAnimate ? (visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4") : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <Tag ref={ref as never} className={classes} style={style}>
      {children}
    </Tag>
  );
}

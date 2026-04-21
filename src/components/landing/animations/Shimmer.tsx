import type { ReactNode } from "react";

interface ShimmerProps {
  children: ReactNode;
  className?: string;
}

export function Shimmer({ children, className = "" }: ShimmerProps) {
  return (
    <span className={`relative inline-flex isolate ${className}`}>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 rounded-[inherit] animate-shimmer"
        style={{
          backgroundImage:
            "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.08) 50%, transparent 100%)",
          backgroundSize: "200% 100%",
          backgroundRepeat: "no-repeat",
        }}
      />
      {children}
    </span>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useInView } from "./useInView";
import { useReducedMotion } from "./useReducedMotion";

interface TypewriterProps {
  text: string;
  speed?: number;
  delay?: number;
  className?: string;
  showCaret?: boolean;
  onDone?: () => void;
}

export function Typewriter({
  text,
  speed = 18,
  delay = 0,
  className = "",
  showCaret = true,
  onDone,
}: TypewriterProps) {
  const { ref, inView } = useInView<HTMLSpanElement>();
  const reduced = useReducedMotion();
  const [shown, setShown] = useState<string>("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!inView) return;
    if (reduced) {
      setShown(text);
      setDone(true);
      onDone?.();
      return;
    }

    let cancelled = false;
    const kickoff = setTimeout(() => {
      let i = 0;
      const id = setInterval(() => {
        if (cancelled) return;
        i += 1;
        setShown(text.slice(0, i));
        if (i >= text.length) {
          clearInterval(id);
          setDone(true);
          onDone?.();
        }
      }, speed);
      return () => clearInterval(id);
    }, delay);

    return () => {
      cancelled = true;
      clearTimeout(kickoff);
    };
  }, [inView, reduced, text, speed, delay, onDone]);

  return (
    <span ref={ref} className={className}>
      {shown}
      {showCaret && !done && (
        <span
          aria-hidden="true"
          className="inline-block w-[0.5ch] bg-current align-baseline animate-caret-blink ml-[1px]"
          style={{ height: "1em", transform: "translateY(2px)" }}
        />
      )}
    </span>
  );
}

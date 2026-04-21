"use client";

import { useEffect, useRef, useState } from "react";

interface Options {
  rootMargin?: string;
  threshold?: number;
  once?: boolean;
}

export function useInView<T extends Element>(
  options: Options = {},
): { ref: React.RefObject<T>; inView: boolean } {
  const { rootMargin = "0px 0px -10% 0px", threshold = 0.1, once = true } =
    options;
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          if (once) observer.unobserve(entry.target);
        } else if (!once) {
          setInView(false);
        }
      },
      { rootMargin, threshold },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [rootMargin, threshold, once]);

  return { ref, inView };
}

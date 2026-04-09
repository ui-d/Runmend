"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { DiagnosticNarrative } from "@/lib/types";

interface UseDiagnosticReturn {
  narrative: DiagnosticNarrative | null;
  isLoading: boolean;
  error: string | null;
  retry: () => void;
}

export function useDiagnostic(profileId: string): UseDiagnosticReturn {
  const [narrative, setNarrative] = useState<DiagnosticNarrative | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchDiagnostic = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsLoading(true);
    setError(null);
    setNarrative(null);

    try {
      const response = await fetch("/api/diagnostic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to generate diagnostic");
      }

      const data = await response.json();
      setNarrative(data.narrative);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      setError(
        err instanceof Error ? err.message : "Failed to generate diagnostic"
      );
    } finally {
      setIsLoading(false);
    }
  }, [profileId]);

  useEffect(() => {
    fetchDiagnostic();
    return () => abortRef.current?.abort();
  }, [fetchDiagnostic]);

  return { narrative, isLoading, error, retry: fetchDiagnostic };
}

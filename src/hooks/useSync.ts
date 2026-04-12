"use client";

import { useState, useCallback } from "react";

interface SyncResult {
  automationsUpserted: number;
  executionsInserted: number;
  issuesDetected: number;
  healthScore: number;
  errors: string[];
}

export function useSync(profileId: string) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastResult, setLastResult] = useState<SyncResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sync = useCallback(async () => {
    setIsSyncing(true);
    setError(null);

    try {
      const res = await fetch(`/api/sync/${profileId}`, { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Sync failed");
      }

      setLastResult(data.result);
      return data.result as SyncResult;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Sync failed";
      setError(message);
      return null;
    } finally {
      setIsSyncing(false);
    }
  }, [profileId]);

  return { sync, isSyncing, lastResult, error };
}

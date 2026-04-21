"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import { Button } from "@/components/ui/button";

export default function WorkspaceError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error, { tags: { boundary: "workspace" } });
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-8 text-center">
      <h2 className="text-xl font-semibold">Something went wrong</h2>
      <p className="max-w-md text-sm text-muted-foreground">
        We hit an unexpected error loading this workspace. The team has been
        notified. You can retry or head back to your workspace list.
      </p>
      {error.digest ? (
        <p className="text-xs text-muted-foreground">
          Error ID: <code>{error.digest}</code>
        </p>
      ) : null}
      <div className="flex gap-2">
        <Button onClick={() => reset()}>Retry</Button>
        <Button variant="outline" onClick={() => (window.location.href = "/app")}>
          Back to workspaces
        </Button>
      </div>
    </div>
  );
}

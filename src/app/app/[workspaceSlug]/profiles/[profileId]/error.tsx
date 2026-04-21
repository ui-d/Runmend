"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import { Button } from "@/components/ui/button";

export default function ProfileError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error, { tags: { boundary: "profile_detail" } });
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-8 text-center">
      <h2 className="text-lg font-semibold">Couldn&apos;t load this profile</h2>
      <p className="max-w-md text-sm text-muted-foreground">
        We ran into an error fetching the latest diagnostic data. Retry in a
        moment, or return to the profile list.
      </p>
      <div className="flex gap-2">
        <Button onClick={() => reset()}>Retry</Button>
        <Button
          variant="outline"
          onClick={() => window.history.back()}
        >
          Go back
        </Button>
      </div>
    </div>
  );
}

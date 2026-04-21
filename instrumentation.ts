import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Validate required env vars in production at boot so deploys fail
    // loudly instead of 500-ing on first request. Runs only in the
    // nodejs runtime; edge workers don't have the full env anyway.
    const { assertProductionEnv } = await import("@/lib/env");
    assertProductionEnv();

    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      tracesSampleRate: 0.1,
      enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
    });
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      tracesSampleRate: 0.1,
      enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
    });
  }
}

export const onRequestError = Sentry.captureRequestError;

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const STORAGE_KEY = "runmend-consent";
const CONSENT_EVENT = "runmend-consent-changed";

export type ConsentValue = "accept" | "decline";

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== "accept" && stored !== "decline") {
      setVisible(true);
    }
  }, []);

  function choose(value: ConsentValue) {
    localStorage.setItem(STORAGE_KEY, value);
    window.dispatchEvent(
      new CustomEvent(CONSENT_EVENT, { detail: value }),
    );
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Cookie consent"
      className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-3xl rounded-lg border border-border bg-background/95 p-4 shadow-lg backdrop-blur md:inset-x-auto md:left-4 md:right-4"
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <p className="text-sm text-muted-foreground">
          We use cookies for product analytics (PostHog) to improve Runmend.
          Functional cookies required for login always stay on. See our{" "}
          <Link
            href="/privacy"
            className="underline underline-offset-2 hover:text-foreground"
          >
            privacy policy
          </Link>
          .
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => choose("decline")}
            className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted"
          >
            Decline
          </button>
          <button
            type="button"
            onClick={() => choose("accept")}
            className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground hover:bg-primary/90"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}

export { STORAGE_KEY as CONSENT_STORAGE_KEY, CONSENT_EVENT };

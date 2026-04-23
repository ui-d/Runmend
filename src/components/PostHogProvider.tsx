"use client";

import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";
import { useEffect, useState } from "react";
import {
  CONSENT_EVENT,
  CONSENT_STORAGE_KEY,
  type ConsentValue,
} from "@/components/CookieConsent";

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const [consent, setConsent] = useState<ConsentValue | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(CONSENT_STORAGE_KEY);
    if (stored === "accept" || stored === "decline") {
      setConsent(stored);
    }

    function onChange(event: Event) {
      const detail = (event as CustomEvent<ConsentValue>).detail;
      if (detail === "accept" || detail === "decline") setConsent(detail);
    }
    window.addEventListener(CONSENT_EVENT, onChange);
    return () => window.removeEventListener(CONSENT_EVENT, onChange);
  }, []);

  useEffect(() => {
    if (consent !== "accept") return;
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;
    if (!key || !host) return;

    posthog.init(key, {
      api_host: host,
      capture_pageview: true,
      capture_pageleave: true,
    });
  }, [consent]);

  return <PHProvider client={posthog}>{children}</PHProvider>;
}

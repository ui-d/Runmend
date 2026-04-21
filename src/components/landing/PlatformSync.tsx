"use client";

import { RefreshCw } from "lucide-react";
import { FadeIn } from "./animations/FadeIn";

export function PlatformSync() {
  return (
    <section className="max-w-5xl mx-auto px-4 py-20">
      <FadeIn>
        <div className="relative mx-auto max-w-3xl rounded-2xl border border-border/50 bg-muted/10 px-6 py-10 overflow-hidden">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-60"
            style={{
              background:
                "radial-gradient(50% 80% at 50% 50%, rgba(139,92,246,0.06), transparent 70%)",
            }}
          />
          <div className="relative flex flex-col sm:flex-row items-center justify-between gap-6 sm:gap-10">
            {/* Make.com tile */}
            <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-background/80 backdrop-blur-sm shadow-lg px-5 py-4">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/15">
                <svg
                  viewBox="0 0 24 24"
                  className="h-5 w-5 text-violet-400"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M13.5 2L4 7.5V16.5L13.5 22L23 16.5V7.5L13.5 2ZM13.5 5.5L19 8.5L13.5 11.5L8 8.5L13.5 5.5Z" />
                </svg>
              </span>
              <div>
                <p className="text-sm font-semibold">Make.com</p>
                <p className="text-[10px] text-muted-foreground font-mono">
                  us1 · eu1 · eu2
                </p>
              </div>
              <span className="h-2 w-2 rounded-full bg-emerald-500 ml-2" />
            </div>

            {/* Line + hub */}
            <div className="relative flex-1 w-full sm:w-auto">
              <div className="relative h-10 flex items-center">
                <span
                  aria-hidden="true"
                  className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-px"
                  style={{
                    backgroundImage:
                      "repeating-linear-gradient(90deg, hsl(var(--border)) 0 6px, transparent 6px 12px)",
                  }}
                />
                <div className="relative z-10 mx-auto flex items-center gap-2 rounded-full border border-border/60 bg-background px-3 py-1.5 shadow-lg">
                  <RefreshCw className="h-3 w-3 text-emerald-400" />
                  <span className="text-[11px] font-mono text-muted-foreground">
                    sync · every 15 min
                  </span>
                </div>
                <span
                  aria-hidden="true"
                  className="absolute top-1/2 -translate-y-1/2 h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)] animate-travel-pulse"
                />
                <span
                  aria-hidden="true"
                  className="absolute top-1/2 -translate-y-1/2 h-1.5 w-1.5 rounded-full bg-violet-400 shadow-[0_0_8px_rgba(167,139,250,0.6)] animate-travel-pulse"
                  style={{ animationDelay: "1.4s" }}
                />
              </div>
            </div>

            {/* n8n tile */}
            <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-background/80 backdrop-blur-sm shadow-lg px-5 py-4">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/15">
                <svg
                  viewBox="0 0 24 24"
                  className="h-5 w-5 text-orange-400"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15h-2v-2h2v2zm0-4h-2V7h2v6zm4 4h-2v-2h2v2zm0-4h-2V7h2v6z" />
                </svg>
              </span>
              <div>
                <p className="text-sm font-semibold">n8n</p>
                <p className="text-[10px] text-muted-foreground font-mono">
                  self-hosted
                </p>
              </div>
              <span className="h-2 w-2 rounded-full bg-emerald-500 ml-2" />
            </div>
          </div>

          <div className="relative mt-8 text-center">
            <p className="text-sm text-muted-foreground">
              One key per platform. Runmend never stores credentials in plaintext —{" "}
              <span className="text-foreground">AES-256-GCM at rest</span>, read
              only when a sync fires.
            </p>
          </div>
        </div>
      </FadeIn>
    </section>
  );
}

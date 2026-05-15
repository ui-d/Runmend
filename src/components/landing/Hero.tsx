import Link from "next/link";
import { ArrowRight, Sparkles, Radar, ShieldCheck } from "lucide-react";

export function Hero() {
  return (
    <section className="relative flex flex-col items-center text-center px-4 pt-24 pb-16 overflow-hidden">
      {/* Aurora backdrop */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
      >
        <div
          className="absolute inset-0 animate-aurora"
          style={{
            background:
              "radial-gradient(45% 55% at 20% 10%, rgba(239,68,68,0.08), transparent 60%), radial-gradient(40% 60% at 80% 0%, rgba(139,92,246,0.08), transparent 60%), radial-gradient(55% 45% at 50% 100%, rgba(56,189,248,0.05), transparent 60%)",
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage:
              "linear-gradient(hsl(var(--border)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border)) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
            maskImage:
              "radial-gradient(ellipse at 50% 0%, black 40%, transparent 80%)",
            WebkitMaskImage:
              "radial-gradient(ellipse at 50% 0%, black 40%, transparent 80%)",
          }}
        />
      </div>

      <div className="inline-flex flex-wrap items-center justify-center gap-x-2 gap-y-1.5 rounded-full border border-border/50 bg-muted/50 px-4 py-1.5 text-sm text-muted-foreground mb-8">
        <span className="relative flex h-3 w-3">
          <span className="absolute inline-flex h-full w-full animate-pulse-ring rounded-full bg-red-400 opacity-75" />
          <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500" />
        </span>
        Built for agencies running client automations on
        <span className="inline-flex items-center gap-1 rounded-md border border-violet-500/30 bg-violet-500/10 px-1.5 py-0.5 text-xs font-semibold text-violet-300">
          <svg viewBox="0 0 24 24" className="h-3 w-3" fill="currentColor" aria-hidden="true">
            <path d="M13.5 2L4 7.5V16.5L13.5 22L23 16.5V7.5L13.5 2ZM13.5 5.5L19 8.5L13.5 11.5L8 8.5L13.5 5.5Z" />
          </svg>
          Make
        </span>
        <span className="inline-flex items-center gap-1 rounded-md border border-orange-500/30 bg-orange-500/10 px-1.5 py-0.5 text-xs font-semibold text-orange-300">
          <svg viewBox="0 0 24 24" className="h-3 w-3" fill="currentColor" aria-hidden="true">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15h-2v-2h2v2zm0-4h-2V7h2v6zm4 4h-2v-2h2v2zm0-4h-2V7h2v6z" />
          </svg>
          n8n
        </span>
      </div>

      <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl max-w-4xl">
        A client workflow just failed.{" "}
        <span className="text-muted-foreground">Runmend noticed —</span>{" "}
        <span className="bg-gradient-to-r from-foreground via-foreground to-muted-foreground bg-clip-text text-transparent">
          and already knows why.
        </span>
      </h1>

      <p className="mt-6 text-lg text-muted-foreground max-w-2xl leading-relaxed">
        Every 15 minutes Runmend re-audits every client&apos;s Make.com and
        n8n workspace, catches silent failures across six rules, and asks
        Claude to write the post-mortem before you open the tab.
      </p>

      <div className="flex flex-col sm:flex-row items-center gap-3 mt-10">
        <Link
          href="/signup"
          className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground text-sm font-medium h-10 px-6 hover:bg-primary/90 transition-colors"
        >
          Start monitoring free
          <ArrowRight className="ml-2 h-4 w-4" />
        </Link>
        <a
          href="#demo"
          className="inline-flex items-center justify-center rounded-md border border-input bg-background text-sm font-medium h-10 px-6 hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          See a live demo
        </a>
      </div>

      <p className="mt-5 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        <Sparkles className="h-3 w-3" />
        Free forever on 1 profile · Claude Sonnet diagnostics included
      </p>

      <div className="mt-12 grid w-full max-w-3xl grid-cols-1 gap-3 sm:grid-cols-2">
        <a
          href="#detectors"
          className="group rounded-xl border border-border/50 bg-muted/40 p-4 text-left transition-colors hover:border-border hover:bg-muted/60"
        >
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Radar className="h-4 w-4 text-red-400" />
            Detect what broke
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
            Six always-on detectors plus a Claude post-mortem after every
            15-minute sync.
          </p>
        </a>
        <a
          href="#preflight"
          className="group rounded-xl border border-border/50 bg-muted/40 p-4 text-left transition-colors hover:border-border hover:bg-muted/60"
        >
          <div className="flex items-center gap-2 text-sm font-semibold">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            Prevent what&apos;s about to
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
            Pre-flight Check replays real inputs and asserts output quality,
            latency &amp; cost before you ship a change.
          </p>
        </a>
      </div>
    </section>
  );
}

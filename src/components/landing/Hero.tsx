import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function Hero() {
  return (
    <section className="relative flex flex-col items-center text-center px-4 pt-24 pb-20 overflow-hidden">
      {/* Floating platform badges — desktop only */}
      <div
        className="hidden lg:flex absolute right-[5%] xl:right-[10%] top-32 flex-col gap-5"
        aria-hidden="true"
      >
        <div className="animate-float rounded-xl border border-border/50 bg-background/80 backdrop-blur-sm shadow-lg px-4 py-3 flex items-center gap-3 rotate-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10">
            <svg viewBox="0 0 24 24" className="h-4 w-4 text-violet-500" fill="currentColor">
              <path d="M13.5 2L4 7.5V16.5L13.5 22L23 16.5V7.5L13.5 2ZM13.5 5.5L19 8.5L13.5 11.5L8 8.5L13.5 5.5Z" />
            </svg>
          </span>
          <div className="text-left">
            <p className="text-sm font-semibold">Make</p>
            <p className="text-[10px] text-muted-foreground">Connected</p>
          </div>
          <span className="h-2 w-2 rounded-full bg-emerald-500 ml-1" />
        </div>

        <div className="animate-float-delayed rounded-xl border border-border/50 bg-background/80 backdrop-blur-sm shadow-lg px-4 py-3 flex items-center gap-3 -rotate-2 ml-6">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/10">
            <svg viewBox="0 0 24 24" className="h-4 w-4 text-orange-500" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15h-2v-2h2v2zm0-4h-2V7h2v6zm4 4h-2v-2h2v2zm0-4h-2V7h2v6z" />
            </svg>
          </span>
          <div className="text-left">
            <p className="text-sm font-semibold">n8n</p>
            <p className="text-[10px] text-muted-foreground">Connected</p>
          </div>
          <span className="h-2 w-2 rounded-full bg-emerald-500 ml-1" />
        </div>
      </div>

      <div className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-muted/50 px-4 py-1.5 text-sm text-muted-foreground mb-8">
        <span className="relative flex h-3 w-3">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
          <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500" />
        </span>
        Built for agencies running client automations
      </div>

      <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl max-w-4xl">
        A client workflow just failed.{" "}
        <span className="text-muted-foreground">
          Nobody noticed.
        </span>
      </h1>

      <p className="mt-6 text-lg text-muted-foreground max-w-2xl leading-relaxed">
        Expired credentials. Dead webhooks. Empty fields. Runmend catches
        silent failures across every client&apos;s Make.com and n8n account
        — before they Slack you about it.
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
          See the demo
        </a>
      </div>
    </section>
  );
}

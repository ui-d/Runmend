import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function CTA() {
  return (
    <section className="max-w-6xl mx-auto px-4 py-20">
      <div className="text-center rounded-2xl border border-border/50 bg-muted/30 px-6 py-20">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Stop firefighting. Start monitoring.
        </h2>
        <p className="mt-4 text-muted-foreground max-w-xl mx-auto">
          Start in under a minute. The free tier watches 1 profile and ships
          3 Claude-powered diagnostics a month — no credit card, no catch.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-8">
          <Link
            href="/signup"
            className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground text-sm font-medium h-10 px-6 hover:bg-primary/90 transition-colors"
          >
            Get started free
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
          <a
            href="#demo"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background text-sm font-medium h-10 px-6 hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            Try the demo
          </a>
        </div>
        <p className="mt-4 text-xs text-muted-foreground/50">
          Free plan available. No credit card required.{" "}
          <Link
            href="/pricing"
            className="text-muted-foreground/70 hover:text-muted-foreground underline underline-offset-2 transition-colors"
          >
            See pricing
          </Link>
        </p>
      </div>
    </section>
  );
}

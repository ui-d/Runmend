import { ArrowRight } from "lucide-react";

export function CTA() {
  return (
    <section className="max-w-5xl mx-auto px-4 py-20">
      <div className="text-center rounded-2xl border border-border/50 bg-muted/30 px-6 py-16">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Stop guessing. Start monitoring.
        </h2>
        <p className="mt-4 text-muted-foreground max-w-xl mx-auto">
          Connect your Zapier, Make.com, or n8n instance and get your first
          automation health report in under 2 minutes.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-8">
          <a
            href="#demo"
            className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground text-sm font-medium h-10 px-6 hover:bg-primary/90 transition-colors"
          >
            Try the demo
            <ArrowRight className="ml-2 h-4 w-4" />
          </a>
        </div>
        <p className="mt-4 text-xs text-muted-foreground/50">
          No account required. Explore four real-world audit profiles.
        </p>
      </div>
    </section>
  );
}

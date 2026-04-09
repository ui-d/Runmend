import { ArrowDown } from "lucide-react";

export function Hero() {
  return (
    <section className="flex flex-col items-center text-center px-4 pt-24 pb-20">
      <div className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-muted/50 px-4 py-1.5 text-sm text-muted-foreground mb-8">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
        </span>
        Monitoring Zapier &amp; Make.com workflows
      </div>

      <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl max-w-4xl">
        Your automations are probably broken.{" "}
        <span className="text-muted-foreground">
          You just don&apos;t know it yet.
        </span>
      </h1>

      <p className="mt-6 text-lg text-muted-foreground max-w-2xl leading-relaxed">
        Credentials expire silently. Webhooks stop firing. Fields map to empty
        strings. FlowCheck catches the failures your automation platform
        won&apos;t tell you about — before your customers do.
      </p>

      <div className="flex flex-col sm:flex-row items-center gap-3 mt-10">
        <a
          href="#demo"
          className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground text-sm font-medium h-10 px-6 hover:bg-primary/90 transition-colors"
        >
          See it in action
          <ArrowDown className="ml-2 h-4 w-4" />
        </a>
        <a
          href="#how-it-works"
          className="inline-flex items-center justify-center rounded-md border border-input bg-background text-sm font-medium h-10 px-6 hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          How it works
        </a>
      </div>
    </section>
  );
}

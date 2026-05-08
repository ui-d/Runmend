"use client";

import { Quote } from "lucide-react";
import { FadeIn } from "./animations/FadeIn";

interface Testimonial {
  quote: string;
  attribution: string;
}

const testimonials: Testimonial[] = [
  {
    quote:
      "We had a Make scenario quietly returning 200s with empty payloads for nine days before a client noticed. Runmend would have flagged it the same morning. That is the whole pitch.",
    attribution: "Marta, Ops lead at a 14-client Make.com agency",
  },
  {
    quote:
      "Half our incidents are expired Google or Stripe creds nobody remembers connecting. We stopped finding out from clients.",
    attribution: "Tomas, Founder, n8n consultancy (8 retainer clients)",
  },
  {
    quote:
      "The Claude diagnostic doesn't just say 'error rate is 12%' — it tells the junior on call which scenario to open first and why. Cut our triage time in half.",
    attribution: "Sam, Automation lead at a SaaS-services agency",
  },
];

export function Testimonials() {
  return (
    <section
      id="testimonials"
      className="border-y border-border/50 bg-muted/30"
    >
      <div className="max-w-5xl mx-auto px-4 py-20">
        <FadeIn>
          <div className="text-center mb-10">
            <p className="text-sm font-medium text-muted-foreground/70 uppercase tracking-wider mb-3">
              From our pilot agencies
            </p>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Built with the people who actually live in Make.com at 2am
            </h2>
            <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">
              Three agencies have been running Runmend against real client
              workspaces while we built it. Here is what they told us mattered.
            </p>
          </div>
        </FadeIn>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {testimonials.map((t, i) => (
            <FadeIn key={t.attribution} delay={i * 90}>
              <figure className="h-full rounded-xl border border-border/60 bg-card/30 p-5 flex flex-col">
                <Quote
                  aria-hidden="true"
                  className="h-4 w-4 text-muted-foreground/60 mb-3"
                />
                <blockquote className="text-sm text-foreground/85 italic leading-relaxed flex-1">
                  &ldquo;{t.quote}&rdquo;
                </blockquote>
                <figcaption className="mt-4 text-[11px] text-muted-foreground border-t border-border/40 pt-3">
                  — {t.attribution}
                </figcaption>
              </figure>
            </FadeIn>
          ))}
        </div>

        <FadeIn delay={400}>
          <p className="mt-8 text-center text-[11px] text-muted-foreground">
            Quotes paraphrased from pilot conversations. Names anonymized at
            request.
          </p>
        </FadeIn>
      </div>
    </section>
  );
}

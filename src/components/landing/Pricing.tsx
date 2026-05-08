"use client";

import Link from "next/link";
import { Check, Sparkles, Infinity as InfinityIcon } from "lucide-react";
import { FadeIn } from "./animations/FadeIn";

interface Plan {
  id: "free" | "starter" | "pro" | "agency" | "ltd";
  name: string;
  price: string;
  priceSuffix?: string;
  tagline: string;
  features: string[];
  cta: { label: string; href: string; variant: "primary" | "outline" };
  highlight?: boolean;
}

const plans: Plan[] = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    priceSuffix: "/mo",
    tagline: "Monitor one workspace.",
    features: [
      "1 profile",
      "1 sync per day",
      "3 AI reports per month",
      "All 6 detectors",
    ],
    cta: { label: "Start free", href: "/signup", variant: "outline" },
  },
  {
    id: "starter",
    name: "Starter",
    price: "$19",
    priceSuffix: "/mo",
    tagline: "For one agency, a handful of clients.",
    features: [
      "5 profiles",
      "4 syncs per day",
      "20 AI reports per month",
      "Email + in-app alerts",
    ],
    cta: { label: "Choose Starter", href: "/signup", variant: "outline" },
  },
  {
    id: "pro",
    name: "Pro",
    price: "$49",
    priceSuffix: "/mo",
    tagline: "Scales with your whole client book.",
    features: [
      "25 profiles",
      "24 syncs per day (every hour)",
      "Unlimited AI reports",
      "Per-profile alert routing",
    ],
    cta: { label: "Choose Pro", href: "/signup", variant: "primary" },
    highlight: true,
  },
  {
    id: "agency",
    name: "Agency",
    price: "$149",
    priceSuffix: "/mo",
    tagline: "For agencies with 50–100 client automations.",
    features: [
      "100 profiles",
      "96 syncs per day (every 15 min)",
      "Unlimited AI reports",
      "Slack + custom alert rules",
      "Priority support",
    ],
    cta: {
      label: "Contact us",
      href: "mailto:hello@runmend.com?subject=Runmend%20Agency%20plan",
      variant: "outline",
    },
  },
  {
    id: "ltd",
    name: "Lifetime",
    price: "$99",
    priceSuffix: "once",
    tagline: "Pro tier, forever. Limited seats.",
    features: [
      "Pro limits, permanently",
      "One-time payment",
      "VAT-ready invoices",
      "Grandfathered into future features",
    ],
    cta: { label: "Claim a seat", href: "/pricing#ltd", variant: "outline" },
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="border-y border-border/50 bg-muted/20">
      <div className="max-w-5xl mx-auto px-4 py-20">
        <FadeIn>
          <div className="text-center mb-10">
            <p className="text-sm font-medium text-muted-foreground/70 uppercase tracking-wider mb-3">
              Pricing
            </p>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Pricing scales with your client book, not your features.
            </h2>
            <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">
              Every plan ships the same six detectors, the same AI
              post-mortems, and the same multi-zone coverage. Higher tiers
              just monitor more clients, more often.
            </p>
          </div>
        </FadeIn>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {plans.map((plan, i) => {
            const isLtd = plan.id === "ltd";
            return (
              <FadeIn key={plan.id} delay={i * 90}>
                <div
                  className={`relative h-full rounded-xl border p-5 flex flex-col ${
                    plan.highlight
                      ? "border-foreground/70 bg-background shadow-xl shadow-black/30"
                      : "border-border/60 bg-card/30"
                  } ${isLtd ? "overflow-hidden" : ""}`}
                >
                  {isLtd && (
                    <>
                      <div
                        aria-hidden="true"
                        className="pointer-events-none absolute -inset-px rounded-xl"
                        style={{
                          background:
                            "linear-gradient(135deg, rgba(139,92,246,0.35), rgba(236,72,153,0.25), rgba(56,189,248,0.25))",
                          padding: "1px",
                          WebkitMask:
                            "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
                          WebkitMaskComposite: "xor",
                          maskComposite: "exclude",
                          opacity: 0.9,
                        }}
                      />
                      <span className="absolute top-3 right-3 inline-flex items-center gap-1 rounded-full bg-foreground text-background px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider">
                        <InfinityIcon className="h-2.5 w-2.5" />
                        Lifetime
                      </span>
                    </>
                  )}
                  {plan.highlight && !isLtd && (
                    <span className="absolute top-3 right-3 inline-flex items-center rounded-full bg-foreground text-background px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider">
                      Most popular
                    </span>
                  )}

                  <div className="relative">
                    <p className="text-sm font-semibold">{plan.name}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 min-h-[2.5em]">
                      {plan.tagline}
                    </p>

                    <div className="mt-4 flex items-baseline gap-1">
                      <span className="text-3xl font-bold tracking-tight">
                        {plan.price}
                      </span>
                      {plan.priceSuffix && (
                        <span className="text-xs text-muted-foreground">
                          {plan.priceSuffix}
                        </span>
                      )}
                    </div>
                  </div>

                  <ul className="relative mt-5 space-y-2 text-sm flex-1">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2">
                        <Check className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                        <span className="text-foreground/80">{f}</span>
                      </li>
                    ))}
                  </ul>

                  <Link
                    href={plan.cta.href}
                    className={`relative mt-6 inline-flex items-center justify-center rounded-md text-sm font-medium h-9 px-4 transition-colors ${
                      plan.cta.variant === "primary"
                        ? "bg-primary text-primary-foreground hover:bg-primary/90"
                        : "border border-input bg-background hover:bg-accent hover:text-accent-foreground"
                    }`}
                  >
                    {plan.cta.label}
                  </Link>

                  {isLtd && (
                    <p className="relative mt-2 text-[10px] text-center text-muted-foreground">
                      <Sparkles className="inline h-2.5 w-2.5 mr-1" />
                      Limited to 20 lifetime seats
                    </p>
                  )}
                </div>
              </FadeIn>
            );
          })}
        </div>

        <FadeIn delay={400}>
          <p className="mt-8 text-center text-xs text-muted-foreground">
            Full comparison at{" "}
            <Link href="/pricing" className="underline underline-offset-4 hover:text-foreground">
              /pricing
            </Link>
            . Enterprise and white-label on request.
          </p>
        </FadeIn>
      </div>
    </section>
  );
}

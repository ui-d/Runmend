"use client";

import { AlertTriangle, Clock, DollarSign } from "lucide-react";
import { CountUp } from "./animations/CountUp";
import { FadeIn } from "./animations/FadeIn";

const stats = [
  {
    icon: AlertTriangle,
    value: 61,
    suffix: "%",
    label: "of automation users have had a workflow fail silently",
    sublabel: "without any notification from the platform",
  },
  {
    icon: Clock,
    value: 4.2,
    decimals: 1,
    suffix: " days",
    label: "average time to notice a broken automation",
    sublabel: "when no monitoring is in place",
  },
  {
    icon: DollarSign,
    value: 12400,
    prefix: "$",
    label: "average revenue lost per silent failure",
    sublabel: "in unbilled work and missed orders",
  },
];

export function Stats() {
  return (
    <section className="border-y border-border/50 bg-muted/30">
      <div className="max-w-5xl mx-auto px-4 py-16">
        <FadeIn>
          <p className="text-center text-sm font-medium text-muted-foreground/70 uppercase tracking-wider mb-10">
            Built to catch what Make and n8n don&apos;t surface
          </p>
        </FadeIn>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {stats.map((stat, i) => (
            <FadeIn key={stat.label} delay={i * 120}>
              <div className="text-center">
                <stat.icon className="h-5 w-5 mx-auto mb-3 text-muted-foreground/50" />
                <p className="text-3xl font-bold tracking-tight">
                  <CountUp
                    to={stat.value}
                    decimals={stat.decimals ?? 0}
                    prefix={stat.prefix ?? ""}
                    suffix={stat.suffix ?? ""}
                    format={
                      stat.value >= 1000
                        ? (v) =>
                            `${stat.prefix ?? ""}${Math.round(v).toLocaleString()}${stat.suffix ?? ""}`
                        : undefined
                    }
                  />
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {stat.label}
                </p>
                <p className="text-xs text-muted-foreground/50">
                  {stat.sublabel}
                </p>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}

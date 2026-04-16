import Link from "next/link";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";
import { PRICING_PLANS, PLAN_LABELS } from "@/data/pricing";

export function PricingCards() {
  return (
    <section className="max-w-5xl mx-auto px-4 pb-20">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {PRICING_PLANS.map((plan) => (
          <Card
            key={plan.id}
            className={`flex flex-col ${plan.highlighted ? "border-primary shadow-md" : ""}`}
          >
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold">{PLAN_LABELS[plan.id]}</h3>
                {plan.highlighted && (
                  <Badge className="text-xs">Most popular</Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {plan.description}
              </p>
              <div className="mt-4">
                {plan.price !== null ? (
                  <p className="text-3xl font-bold">
                    ${plan.price}
                    <span className="text-sm font-normal text-muted-foreground">
                      /mo
                    </span>
                  </p>
                ) : (
                  <p className="text-3xl font-bold">Custom</p>
                )}
              </div>
            </CardHeader>

            <CardContent className="flex-1">
              <ul className="space-y-2.5">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm">
                    <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                    {feature}
                  </li>
                ))}
              </ul>
            </CardContent>

            <CardFooter className="pt-4">
              {plan.cta.href.startsWith("mailto:") ? (
                <a href={plan.cta.href} className="w-full">
                  <Button variant="outline" className="w-full">
                    {plan.cta.label}
                  </Button>
                </a>
              ) : (
                <Link href={plan.cta.href} className="w-full">
                  <Button
                    variant={plan.highlighted ? "default" : "outline"}
                    className="w-full"
                  >
                    {plan.cta.label}
                  </Button>
                </Link>
              )}
            </CardFooter>
          </Card>
        ))}
      </div>
    </section>
  );
}

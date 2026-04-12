"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PLAN_LABELS, PLAN_PRICES, type PlanId } from "@/lib/stripe";
import { Check, ExternalLink } from "lucide-react";

interface BillingPageClientProps {
  plan: string;
  status: string;
  workspaceId: string;
  periodEnd: string | null;
}

export function BillingPageClient({
  plan,
  status,
  workspaceId,
  periodEnd,
}: BillingPageClientProps) {
  const [loading, setLoading] = useState<string | null>(null);

  async function handleCheckout(targetPlan: string) {
    setLoading(targetPlan);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId, plan: targetPlan }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } finally {
      setLoading(null);
    }
  }

  async function handlePortal() {
    setLoading("portal");
    try {
      const res = await fetch("/api/billing/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } finally {
      setLoading(null);
    }
  }

  const plans: { id: PlanId; features: string[] }[] = [
    {
      id: "free",
      features: ["1 profile", "1 sync/day", "3 diagnostics/month"],
    },
    {
      id: "starter",
      features: ["5 profiles", "4 syncs/day", "20 diagnostics/month", "Email notifications"],
    },
    {
      id: "pro",
      features: ["25 profiles", "24 syncs/day", "Unlimited diagnostics", "Priority support"],
    },
  ];

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Billing</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your subscription and plan
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Current Plan</CardTitle>
          <CardDescription>
            {PLAN_LABELS[plan as PlanId] ?? "Free"} plan
            {status === "past_due" && (
              <Badge variant="outline" className="ml-2 text-red-500 border-red-500">
                Past due
              </Badge>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {periodEnd && plan !== "free" && (
            <p className="text-sm text-muted-foreground mb-3">
              Current period ends:{" "}
              {new Date(periodEnd).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          )}
          {plan !== "free" && (
            <Button variant="outline" size="sm" onClick={handlePortal} disabled={loading === "portal"}>
              <ExternalLink className="mr-2 h-3 w-3" />
              {loading === "portal" ? "Loading..." : "Manage subscription"}
            </Button>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {plans.map((p) => {
          const isCurrent = p.id === plan;
          const price = PLAN_PRICES[p.id];

          return (
            <Card
              key={p.id}
              className={isCurrent ? "border-primary" : ""}
            >
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center justify-between">
                  {PLAN_LABELS[p.id]}
                  {isCurrent && (
                    <Badge variant="outline" className="text-xs">
                      Current
                    </Badge>
                  )}
                </CardTitle>
                <p className="text-2xl font-bold">
                  {price ? `$${price.monthly}` : "$0"}
                  <span className="text-sm font-normal text-muted-foreground">
                    /mo
                  </span>
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                <ul className="space-y-2">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm">
                      <Check className="h-3 w-3 text-emerald-500 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                {!isCurrent && p.id !== "free" && (
                  <Button
                    className="w-full"
                    size="sm"
                    onClick={() => handleCheckout(p.id)}
                    disabled={loading === p.id}
                  >
                    {loading === p.id ? "Loading..." : `Upgrade to ${PLAN_LABELS[p.id]}`}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

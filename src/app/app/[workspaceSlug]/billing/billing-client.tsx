"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PLAN_LABELS, PLAN_PRICES, type PlanId } from "@/lib/stripe";
import type { WorkspaceUsage, LtdAllocation } from "@/lib/queries/usage";
import type { InvoiceSummary } from "@/app/api/billing/invoices/route";
import {
  Check,
  ExternalLink,
  CreditCard,
  FileText,
  Receipt,
  Sparkles,
  ShieldCheck,
} from "lucide-react";

interface BillingPageClientProps {
  workspaceId: string;
  rawPlan: string;
  effectivePlan: PlanId;
  isLtd: boolean;
  ltdPurchasedAt: string | null;
  status: string;
  periodEnd: string | null;
  taxId: string | null;
  taxIdCountry: string | null;
  billingCountry: string | null;
  hasStripeCustomer: boolean;
  usage: WorkspaceUsage;
  ltd: LtdAllocation;
}

const DISPLAY_PLANS: { id: PlanId; features: string[] }[] = [
  {
    id: "free",
    features: ["1 client profile", "1 sync/day", "3 AI reports/month"],
  },
  {
    id: "starter",
    features: [
      "5 client profiles",
      "4 syncs/day",
      "20 AI reports/month",
      "Email alerts",
    ],
  },
  {
    id: "pro",
    features: [
      "25 client profiles",
      "24 syncs/day",
      "Unlimited AI reports",
      "Priority support",
    ],
  },
];

function formatMoney(amountInCents: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amountInCents / 100);
}

function formatInvoiceDate(epochSeconds: number): string {
  return new Date(epochSeconds * 1000).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function BillingPageClient({
  workspaceId,
  effectivePlan,
  isLtd,
  ltdPurchasedAt,
  status,
  periodEnd,
  taxId,
  taxIdCountry,
  billingCountry,
  hasStripeCustomer,
  usage,
  ltd,
}: BillingPageClientProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [invoices, setInvoices] = useState<InvoiceSummary[] | null>(null);

  useEffect(() => {
    if (!hasStripeCustomer) {
      setInvoices([]);
      return;
    }
    let cancelled = false;
    fetch(`/api/billing/invoices?workspaceId=${workspaceId}`)
      .then((r) => (r.ok ? r.json() : { invoices: [] }))
      .then((data) => {
        if (!cancelled) setInvoices(data.invoices ?? []);
      })
      .catch(() => {
        if (!cancelled) setInvoices([]);
      });
    return () => {
      cancelled = true;
    };
  }, [workspaceId, hasStripeCustomer]);

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

  async function handleClaimLtd() {
    setLoading("ltd");
    try {
      const res = await fetch("/api/billing/claim-ltd", {
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

  const hasAnyPaidRelationship = hasStripeCustomer;

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Billing</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {isLtd
            ? "Lifetime access — no renewal, no recurring charges"
            : "Manage your subscription, plan, and invoices"}
          {" · secured by Stripe"}
        </p>
      </div>

      {/* Top card: LTD state or current plan */}
      {isLtd ? (
        <LtdHolderCard
          purchasedAt={ltdPurchasedAt}
          onManage={handlePortal}
          canManage={hasStripeCustomer}
          managing={loading === "portal"}
        />
      ) : (
        <CurrentPlanCard
          effectivePlan={effectivePlan}
          status={status}
          periodEnd={periodEnd}
          usage={usage}
          onManage={handlePortal}
          canManage={effectivePlan !== "free" && hasStripeCustomer}
          managing={loading === "portal"}
        />
      )}

      {/* LTD callout (hidden for holders) */}
      {!isLtd && (
        <LtdCallout
          allocation={ltd}
          loading={loading === "ltd"}
          onClaim={handleClaimLtd}
        />
      )}

      {/* Plan grid */}
      <div className="space-y-2">
        <h2 className="text-sm font-medium text-muted-foreground">
          {isLtd ? "Your plan includes" : "Choose a plan"}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {DISPLAY_PLANS.map((p) => {
            const isCurrent = p.id === effectivePlan;
            const price = PLAN_PRICES[p.id];
            const isStarter = p.id === "starter";

            return (
              <Card
                key={p.id}
                className={
                  isCurrent
                    ? "border-primary"
                    : isStarter && !isLtd
                      ? "border-emerald-500/60 border-2 relative"
                      : ""
                }
              >
                {isStarter && !isLtd && !isCurrent && (
                  <div className="absolute -top-2.5 left-4 px-2 py-0.5 rounded-full bg-emerald-500 text-xs font-medium text-black">
                    Recommended
                  </div>
                )}
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center justify-between">
                    {PLAN_LABELS[p.id]}
                    {isCurrent && (
                      <Badge variant="outline" className="text-xs">
                        {isLtd ? "Lifetime" : "Current"}
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
                  {!isCurrent && p.id !== "free" && !isLtd && (
                    <Button
                      className="w-full"
                      size="sm"
                      onClick={() => handleCheckout(p.id)}
                      disabled={loading === p.id}
                    >
                      {loading === p.id
                        ? "Loading..."
                        : `Upgrade to ${PLAN_LABELS[p.id]}`}
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Billing essentials row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <PaymentMethodTile
          hasStripeCustomer={hasStripeCustomer}
          onManage={handlePortal}
          loading={loading === "portal"}
        />
        <BillingDetailsTile
          taxId={taxId}
          taxIdCountry={taxIdCountry}
          billingCountry={billingCountry}
          hasStripeCustomer={hasStripeCustomer}
          onManage={handlePortal}
          loading={loading === "portal"}
        />
        <InvoicesTile invoices={invoices} hasAnyRelationship={hasAnyPaidRelationship} />
      </div>
    </div>
  );
}

function UsageRow({
  label,
  used,
  limit,
  trailing,
}: {
  label: string;
  used: number;
  limit: number;
  trailing?: string;
}) {
  const isUnlimited = limit === -1;
  const ratio = isUnlimited ? 0 : Math.min(1, used / Math.max(1, limit));
  const atLimit = !isUnlimited && used >= limit;
  const nearLimit = !isUnlimited && !atLimit && ratio >= 0.7;
  const barColor = atLimit
    ? "bg-red-500"
    : nearLimit
      ? "bg-yellow-500"
      : "bg-emerald-500";

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="tabular-nums text-foreground">
          {isUnlimited ? `${used}` : `${used}/${limit}`}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full transition-all ${barColor}`}
          style={{ width: isUnlimited ? "10%" : `${Math.max(4, ratio * 100)}%` }}
        />
      </div>
      {trailing && (
        <p className="text-[11px] text-muted-foreground">{trailing}</p>
      )}
    </div>
  );
}

function CurrentPlanCard({
  effectivePlan,
  status,
  periodEnd,
  usage,
  onManage,
  canManage,
  managing,
}: {
  effectivePlan: PlanId;
  status: string;
  periodEnd: string | null;
  usage: WorkspaceUsage;
  onManage: () => void;
  canManage: boolean;
  managing: boolean;
}) {
  const resetsAt = new Date(usage.periodEnd).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  const profilesAtCap = usage.profiles.used >= usage.profiles.limit;
  const diagsLimit = usage.diagnosticsThisMonth.limit;
  const diagsAtCap =
    diagsLimit !== -1 && usage.diagnosticsThisMonth.used >= diagsLimit;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              {PLAN_LABELS[effectivePlan]} plan
              {status === "past_due" && (
                <Badge
                  variant="outline"
                  className="text-red-500 border-red-500"
                >
                  Past due
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Usage resets {resetsAt}
              {periodEnd && effectivePlan !== "free" && (
                <>
                  {" · "}
                  renews{" "}
                  {new Date(periodEnd).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </>
              )}
            </CardDescription>
          </div>
          {canManage && (
            <Button
              variant="outline"
              size="sm"
              onClick={onManage}
              disabled={managing}
            >
              <ExternalLink className="mr-2 h-3 w-3" />
              {managing ? "Loading..." : "Manage"}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <UsageRow
          label="Client profiles"
          used={usage.profiles.used}
          limit={usage.profiles.limit}
          trailing={profilesAtCap ? "At limit — upgrade to add more" : undefined}
        />
        <UsageRow
          label="AI reports this month"
          used={usage.diagnosticsThisMonth.used}
          limit={usage.diagnosticsThisMonth.limit}
          trailing={
            diagsAtCap
              ? "At limit — resets next month"
              : diagsLimit === -1
                ? "Unlimited"
                : `${Math.max(0, diagsLimit - usage.diagnosticsThisMonth.used)} remaining this month`
          }
        />
      </CardContent>
    </Card>
  );
}

function LtdHolderCard({
  purchasedAt,
  onManage,
  canManage,
  managing,
}: {
  purchasedAt: string | null;
  onManage: () => void;
  canManage: boolean;
  managing: boolean;
}) {
  const paidLabel = purchasedAt
    ? new Date(purchasedAt).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : null;

  return (
    <Card className="border-emerald-500/50 bg-gradient-to-r from-emerald-500/10 to-transparent">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-emerald-500" />
              Lifetime · $99 paid
              {paidLabel && (
                <span className="text-xs font-normal text-muted-foreground">
                  on {paidLabel}
                </span>
              )}
            </CardTitle>
            <CardDescription>
              Pro-tier limits forever — no renewal, no recurring charges.
            </CardDescription>
          </div>
          {canManage && (
            <Button
              variant="outline"
              size="sm"
              onClick={onManage}
              disabled={managing}
            >
              <ExternalLink className="mr-2 h-3 w-3" />
              {managing ? "Loading..." : "Manage"}
            </Button>
          )}
        </div>
      </CardHeader>
    </Card>
  );
}

function LtdCallout({
  allocation,
  onClaim,
  loading,
}: {
  allocation: LtdAllocation;
  onClaim: () => void;
  loading: boolean;
}) {
  return (
    <div className="rounded-lg border border-border bg-card/70 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div className="flex items-start gap-3">
        <div className="mt-0.5">
          <Sparkles className="h-5 w-5 text-emerald-400" />
        </div>
        <div className="space-y-0.5">
          <p className="text-sm font-medium">
            Lifetime deal · <span className="text-emerald-400">$99</span> one-time
          </p>
          <p className="text-xs text-muted-foreground">
            Pro-tier limits forever ·{" "}
            <span className="text-foreground">
              {allocation.seatsRemaining} of {allocation.totalSeats}
            </span>{" "}
            seats left · closes when sold out
          </p>
        </div>
      </div>
      <Button
        size="sm"
        onClick={onClaim}
        disabled={loading || allocation.soldOut}
        className="bg-emerald-500 text-black hover:bg-emerald-400"
      >
        {allocation.soldOut
          ? "Sold out"
          : loading
            ? "Loading..."
            : "Claim LTD"}
      </Button>
    </div>
  );
}

function PaymentMethodTile({
  hasStripeCustomer,
  onManage,
  loading,
}: {
  hasStripeCustomer: boolean;
  onManage: () => void;
  loading: boolean;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground flex items-center gap-2">
          <CreditCard className="h-3 w-3" />
          Payment method
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-sm font-medium">
          {hasStripeCustomer ? "Managed in Stripe" : "Not added"}
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={onManage}
          disabled={loading || !hasStripeCustomer}
          className="w-full"
        >
          {hasStripeCustomer
            ? loading
              ? "Loading..."
              : "Update card"
            : "Add card on next purchase"}
        </Button>
      </CardContent>
    </Card>
  );
}

function BillingDetailsTile({
  taxId,
  taxIdCountry,
  billingCountry,
  hasStripeCustomer,
  onManage,
  loading,
}: {
  taxId: string | null;
  taxIdCountry: string | null;
  billingCountry: string | null;
  hasStripeCustomer: boolean;
  onManage: () => void;
  loading: boolean;
}) {
  const country = billingCountry ?? taxIdCountry ?? null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground flex items-center gap-2">
          <ShieldCheck className="h-3 w-3" />
          Billing details
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-sm font-medium">
          {country ? country : "No billing country"}{" "}
          <span className="text-muted-foreground">
            · {taxId ? taxId : "No VAT ID"}
          </span>
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={onManage}
          disabled={loading || !hasStripeCustomer}
          className="w-full"
        >
          {taxId
            ? "Edit VAT ID"
            : hasStripeCustomer
              ? "Add VAT ID"
              : "Added at checkout"}
        </Button>
      </CardContent>
    </Card>
  );
}

function InvoicesTile({
  invoices,
  hasAnyRelationship,
}: {
  invoices: InvoiceSummary[] | null;
  hasAnyRelationship: boolean;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground flex items-center gap-2">
          <Receipt className="h-3 w-3" />
          Invoices
        </CardTitle>
      </CardHeader>
      <CardContent>
        {invoices === null ? (
          <p className="text-xs text-muted-foreground">Loading…</p>
        ) : invoices.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            {hasAnyRelationship
              ? "No invoices yet"
              : "PDFs appear here after your first charge"}
          </p>
        ) : (
          <ul className="space-y-2 max-h-40 overflow-y-auto">
            {invoices.slice(0, 5).map((inv) => (
              <li
                key={inv.id}
                className="flex items-center justify-between text-xs"
              >
                <div className="min-w-0">
                  <p className="tabular-nums truncate">
                    {inv.number ?? inv.id.slice(0, 10)}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {formatInvoiceDate(inv.created)} ·{" "}
                    {formatMoney(inv.amountPaid, inv.currency)}
                  </p>
                </div>
                {inv.invoicePdf && (
                  <a
                    href={inv.invoicePdf}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-primary hover:underline"
                  >
                    <FileText className="h-3 w-3" />
                    PDF
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

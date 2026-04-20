import Stripe from "stripe";
import type { Database } from "@/lib/database.types";

type SubscriptionRow = Database["public"]["Tables"]["subscriptions"]["Row"];

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", {
      apiVersion: "2026-03-25.dahlia",
      typescript: true,
    });
  }
  return _stripe;
}

/** @deprecated Use getStripe() for lazy initialization */
export const stripe = {
  get checkout() { return getStripe().checkout; },
  get billingPortal() { return getStripe().billingPortal; },
  get customers() { return getStripe().customers; },
  get subscriptions() { return getStripe().subscriptions; },
  get webhooks() { return getStripe().webhooks; },
} as unknown as Stripe;

export const PLAN_LIMITS = {
  free: { profiles: 1, syncsPerDay: 1, diagnosticsPerMonth: 3 },
  starter: { profiles: 5, syncsPerDay: 4, diagnosticsPerMonth: 20 },
  pro: { profiles: 25, syncsPerDay: 24, diagnosticsPerMonth: -1 },
  enterprise: { profiles: -1, syncsPerDay: -1, diagnosticsPerMonth: -1 },
} as const;

export type PlanId = keyof typeof PLAN_LIMITS;

export const PLAN_LABELS: Record<PlanId, string> = {
  free: "Free",
  starter: "Starter",
  pro: "Pro",
  enterprise: "Enterprise",
};

export const PLAN_PRICES: Record<string, { monthly: number }> = {
  starter: { monthly: 19 },
  pro: { monthly: 49 },
};

/** Stripe Price IDs — set these after creating products in Stripe dashboard */
export const STRIPE_PRICE_IDS: Record<string, string> = {
  starter: process.env.STRIPE_PRICE_STARTER ?? "",
  pro: process.env.STRIPE_PRICE_PRO ?? "",
};

export const STRIPE_PRICE_LTD: string = process.env.STRIPE_PRICE_LTD ?? "";

/**
 * Effective plan for the purpose of limit enforcement and UI.
 * LTD holders are always treated as Pro, regardless of the `plan` column.
 */
export function resolveEffectivePlan(
  subscription: Pick<SubscriptionRow, "plan" | "is_ltd"> | null | undefined
): PlanId {
  if (subscription?.is_ltd) return "pro";
  const raw = subscription?.plan ?? "free";
  return (PLAN_LABELS[raw as PlanId] ? (raw as PlanId) : "free");
}

export function checkPlanLimit(
  plan: string,
  resource: "profiles" | "syncsPerDay" | "diagnosticsPerMonth",
  currentCount: number
): { allowed: boolean; limit: number } {
  const limits = PLAN_LIMITS[plan as PlanId] ?? PLAN_LIMITS.free;
  const limit = limits[resource];
  if (limit === -1) return { allowed: true, limit: -1 };
  return { allowed: currentCount < limit, limit };
}

export async function getOrCreateStripeCustomer(
  workspaceId: string,
  email: string,
  existingCustomerId?: string
): Promise<string> {
  if (existingCustomerId && !existingCustomerId.startsWith("pending_")) {
    return existingCustomerId;
  }

  const customer = await stripe.customers.create({
    email,
    metadata: { workspace_id: workspaceId },
  });

  return customer.id;
}

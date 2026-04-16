import { PLAN_LIMITS, PLAN_PRICES, PLAN_LABELS, type PlanId } from "@/lib/stripe";

// ---------- Plan card data ----------

interface PlanCardData {
  id: PlanId;
  description: string;
  price: number | null;
  highlighted: boolean;
  cta: { label: string; href: string };
  features: string[];
}

export const PRICING_PLANS: PlanCardData[] = [
  {
    id: "free",
    description: "For individuals testing the waters",
    price: 0,
    highlighted: false,
    cta: { label: "Get started free", href: "/signup" },
    features: [
      `${PLAN_LIMITS.free.profiles} client profile`,
      `${PLAN_LIMITS.free.syncsPerDay} sync per day`,
      `${PLAN_LIMITS.free.diagnosticsPerMonth} AI reports per month`,
      "All monitoring checks",
      "Community support",
    ],
  },
  {
    id: "starter",
    description: "For freelancers managing a few clients",
    price: PLAN_PRICES.starter.monthly,
    highlighted: false,
    cta: { label: "Start free trial", href: "/signup" },
    features: [
      `${PLAN_LIMITS.starter.profiles} client profiles`,
      `${PLAN_LIMITS.starter.syncsPerDay} syncs per day`,
      `${PLAN_LIMITS.starter.diagnosticsPerMonth} AI reports per month`,
      "All monitoring checks",
      "Email alerts",
      "Email support",
    ],
  },
  {
    id: "pro",
    description: "For agencies scaling automation work",
    price: PLAN_PRICES.pro.monthly,
    highlighted: true,
    cta: { label: "Start free trial", href: "/signup" },
    features: [
      `${PLAN_LIMITS.pro.profiles} client profiles`,
      `${PLAN_LIMITS.pro.syncsPerDay} syncs per day`,
      "Unlimited AI reports",
      "All monitoring checks",
      "Email & Slack alerts",
      "Custom alert rules",
      "Priority support",
    ],
  },
  {
    id: "enterprise",
    description: "For teams with advanced needs",
    price: null,
    highlighted: false,
    cta: { label: "Contact sales", href: "mailto:hello@runmend.com" },
    features: [
      "Unlimited profiles",
      "Unlimited syncs",
      "Unlimited AI reports",
      "All monitoring checks",
      "All alert channels",
      "Dedicated account manager",
      "Custom onboarding",
    ],
  },
];

// ---------- Feature comparison table ----------

type FeatureValue = string | number | boolean;

interface ComparisonFeature {
  name: string;
  values: Record<PlanId, FeatureValue>;
}

interface ComparisonCategory {
  name: string;
  features: ComparisonFeature[];
}

function formatLimit(n: number): FeatureValue {
  return n === -1 ? "Unlimited" : n;
}

export const COMPARISON_TABLE: ComparisonCategory[] = [
  {
    name: "Usage limits",
    features: [
      {
        name: "Client profiles",
        values: {
          free: formatLimit(PLAN_LIMITS.free.profiles),
          starter: formatLimit(PLAN_LIMITS.starter.profiles),
          pro: formatLimit(PLAN_LIMITS.pro.profiles),
          enterprise: formatLimit(PLAN_LIMITS.enterprise.profiles),
        },
      },
      {
        name: "Syncs per day",
        values: {
          free: formatLimit(PLAN_LIMITS.free.syncsPerDay),
          starter: formatLimit(PLAN_LIMITS.starter.syncsPerDay),
          pro: formatLimit(PLAN_LIMITS.pro.syncsPerDay),
          enterprise: formatLimit(PLAN_LIMITS.enterprise.syncsPerDay),
        },
      },
      {
        name: "AI reports per month",
        values: {
          free: formatLimit(PLAN_LIMITS.free.diagnosticsPerMonth),
          starter: formatLimit(PLAN_LIMITS.starter.diagnosticsPerMonth),
          pro: formatLimit(PLAN_LIMITS.pro.diagnosticsPerMonth),
          enterprise: formatLimit(PLAN_LIMITS.enterprise.diagnosticsPerMonth),
        },
      },
    ],
  },
  {
    name: "Monitoring",
    features: [
      {
        name: "Expiring credentials",
        values: { free: true, starter: true, pro: true, enterprise: true },
      },
      {
        name: "Broken webhooks",
        values: { free: true, starter: true, pro: true, enterprise: true },
      },
      {
        name: "Empty field mappings",
        values: { free: true, starter: true, pro: true, enterprise: true },
      },
      {
        name: "Rate limit warnings",
        values: { free: true, starter: true, pro: true, enterprise: true },
      },
      {
        name: "Zombie automation detection",
        values: { free: true, starter: true, pro: true, enterprise: true },
      },
    ],
  },
  {
    name: "Alerts & reporting",
    features: [
      {
        name: "Email alerts",
        values: { free: false, starter: true, pro: true, enterprise: true },
      },
      {
        name: "Slack notifications",
        values: { free: false, starter: false, pro: true, enterprise: true },
      },
      {
        name: "Custom alert rules",
        values: { free: false, starter: false, pro: true, enterprise: true },
      },
      {
        name: "Exportable reports",
        values: { free: false, starter: false, pro: true, enterprise: true },
      },
    ],
  },
  {
    name: "Support",
    features: [
      {
        name: "Community support",
        values: { free: true, starter: true, pro: true, enterprise: true },
      },
      {
        name: "Email support",
        values: { free: false, starter: true, pro: true, enterprise: true },
      },
      {
        name: "Priority support",
        values: { free: false, starter: false, pro: true, enterprise: true },
      },
      {
        name: "Dedicated account manager",
        values: { free: false, starter: false, pro: false, enterprise: true },
      },
      {
        name: "Custom onboarding",
        values: { free: false, starter: false, pro: false, enterprise: true },
      },
    ],
  },
];

export { PLAN_LABELS, type PlanId };

// ---------- FAQ ----------

interface FAQItem {
  question: string;
  answer: string;
}

export const PRICING_FAQ: FAQItem[] = [
  {
    question: "Is there a free trial?",
    answer:
      "Yes. All paid plans come with a 14-day free trial. You can explore every feature before being charged. No credit card required to start.",
  },
  {
    question: "Can I switch plans later?",
    answer:
      "Absolutely. You can upgrade or downgrade at any time from your workspace billing settings. Changes take effect immediately, and we prorate the difference.",
  },
  {
    question: "What happens when I hit my plan limit?",
    answer:
      "You will see a prompt to upgrade. Your existing data and monitoring stay intact — we never delete anything. You just cannot add new profiles or run additional syncs beyond your limit until you upgrade.",
  },
  {
    question: "Can I cancel anytime?",
    answer:
      "Yes. There are no long-term contracts. Cancel from your billing settings and your subscription ends at the current billing period. You keep access until then.",
  },
  {
    question: "What payment methods do you accept?",
    answer:
      "We accept all major credit and debit cards through Stripe, including Visa, Mastercard, and American Express.",
  },
  {
    question: "Do you offer annual billing?",
    answer:
      "Not yet, but it is on our roadmap. When we launch annual plans, they will come with a discount. Stay tuned.",
  },
];

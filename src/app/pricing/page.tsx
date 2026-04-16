import type { Metadata } from "next";
import { Navbar } from "@/components/landing/Navbar";
import { PricingHero } from "@/components/pricing/PricingHero";
import { PricingCards } from "@/components/pricing/PricingCards";
import { ComparisonTable } from "@/components/pricing/ComparisonTable";
import { PricingFAQ } from "@/components/pricing/PricingFAQ";
import { PricingCTA } from "@/components/pricing/PricingCTA";
import { Footer } from "@/components/landing/Footer";

export const metadata: Metadata = {
  title: "Pricing — Runmend",
  description:
    "Simple, transparent pricing for automation health monitoring. Start free, upgrade when you need more.",
};

export default function PricingPage() {
  return (
    <main className="min-h-screen">
      <Navbar />
      <PricingHero />
      <PricingCards />
      <ComparisonTable />
      <PricingFAQ />
      <PricingCTA />
      <Footer />
    </main>
  );
}

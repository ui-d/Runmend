import { ChevronDown } from "lucide-react";
import { PRICING_FAQ } from "@/data/pricing";

export function PricingFAQ() {
  return (
    <section className="max-w-3xl mx-auto px-4 py-20">
      <div className="text-center mb-12">
        <p className="text-sm font-medium text-muted-foreground/70 uppercase tracking-wider mb-3">
          FAQ
        </p>
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Common questions
        </h2>
      </div>

      <div className="divide-y divide-border/50">
        {PRICING_FAQ.map((item) => (
          <details key={item.question} className="group py-4">
            <summary className="flex cursor-pointer items-center justify-between text-sm font-medium hover:text-foreground transition-colors list-none [&::-webkit-details-marker]:hidden">
              {item.question}
              <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0 ml-4 transition-transform group-open:rotate-180" />
            </summary>
            <p className="text-sm text-muted-foreground mt-3 leading-relaxed pr-8">
              {item.answer}
            </p>
          </details>
        ))}
      </div>
    </section>
  );
}

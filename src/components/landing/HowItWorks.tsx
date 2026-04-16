import { Link2, Search, Wrench } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const steps = [
  {
    icon: Link2,
    step: "01",
    title: "Connect your platform",
    description:
      "Link your client's Make.com or n8n instance. Runmend reads automations, execution logs, and connection statuses — read-only, nothing is modified.",
  },
  {
    icon: Search,
    step: "02",
    title: "Get an instant health audit",
    description:
      "Our engine scans every workflow for silent failures, expiring credentials, broken field mappings, and wasted tasks. Each issue includes business impact and severity.",
  },
  {
    icon: Wrench,
    step: "03",
    title: "Fix with AI-guided steps",
    description:
      "For each issue, Runmend generates a specific, actionable fix — not generic advice. AI diagnostics explain what broke, why it matters, and exactly how to resolve it.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="max-w-5xl mx-auto px-4 py-20">
      <div className="text-center mb-12">
        <p className="text-sm font-medium text-muted-foreground/70 uppercase tracking-wider mb-3">
          How it works
        </p>
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Three steps to healthy automations
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {steps.map((item) => (
          <Card key={item.step} className="relative overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-muted">
                  <item.icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <span className="text-xs font-mono text-muted-foreground/50">
                  {item.step}
                </span>
              </div>
              <h3 className="text-lg font-semibold mb-2">{item.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {item.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}

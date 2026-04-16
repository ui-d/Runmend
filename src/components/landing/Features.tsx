import {
  KeyRound,
  Webhook,
  FileWarning,
  Gauge,
  Ghost,
  Brain,
} from "lucide-react";

const features = [
  {
    icon: KeyRound,
    title: "Expiring credentials",
    description:
      "Detects OAuth tokens and API keys approaching expiration before they silently kill your workflows.",
  },
  {
    icon: Webhook,
    title: "Broken webhooks",
    description:
      "Catches webhook endpoints that stopped receiving payloads — the #1 cause of silent automation death.",
  },
  {
    icon: FileWarning,
    title: "Empty field mappings",
    description:
      "Finds fields producing empty strings from API schema changes, shifted spreadsheet columns, or renamed properties.",
  },
  {
    icon: Gauge,
    title: "Rate limit warnings",
    description:
      "Monitors API usage against rate limits so your automations don't hit walls during peak traffic.",
  },
  {
    icon: Ghost,
    title: "Zombie automations",
    description:
      "Identifies abandoned workflows still running from old migrations, wasting tasks and cluttering your account.",
  },
  {
    icon: Brain,
    title: "AI diagnostics",
    description:
      "Generates plain-English analysis of your automation health with prioritized, step-by-step remediation plans.",
  },
];

export function Features() {
  return (
    <section id="features" className="border-y border-border/50 bg-muted/30">
      <div className="max-w-5xl mx-auto px-4 py-20">
        <div className="text-center mb-12">
          <p className="text-sm font-medium text-muted-foreground/70 uppercase tracking-wider mb-3">
            What we detect
          </p>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Six failure modes, one dashboard
          </h2>
          <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">
            Runmend monitors the issues that automation platforms surface
            poorly or not at all — across every client account you manage.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
          {features.map((feature) => (
            <div key={feature.title} className="space-y-2">
              <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-muted mb-3">
                <feature.icon className="h-5 w-5 text-muted-foreground" />
              </div>
              <h3 className="text-sm font-semibold">{feature.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

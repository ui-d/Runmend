import { AlertTriangle, Clock, DollarSign } from "lucide-react";

const stats = [
  {
    icon: AlertTriangle,
    value: "61%",
    label: "of Zapier users have had a Zap fail silently",
    sublabel: "without any notification",
  },
  {
    icon: Clock,
    value: "4.2 days",
    label: "average time to notice a broken automation",
    sublabel: "when no monitoring is in place",
  },
  {
    icon: DollarSign,
    value: "$12,400",
    label: "average revenue lost per silent failure",
    sublabel: "in unbilled work and missed orders",
  },
];

export function Stats() {
  return (
    <section className="border-y border-border/50 bg-muted/30">
      <div className="max-w-5xl mx-auto px-4 py-16">
        <p className="text-center text-sm font-medium text-muted-foreground/70 uppercase tracking-wider mb-10">
          The silent automation crisis
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {stats.map((stat) => (
            <div key={stat.value} className="text-center">
              <stat.icon className="h-5 w-5 mx-auto mb-3 text-muted-foreground/50" />
              <p className="text-3xl font-bold tracking-tight">{stat.value}</p>
              <p className="mt-1 text-sm text-muted-foreground">{stat.label}</p>
              <p className="text-xs text-muted-foreground/50">{stat.sublabel}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

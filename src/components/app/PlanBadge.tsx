import { Badge } from "@/components/ui/badge";
import { PLAN_LABELS, type PlanId } from "@/lib/stripe";

interface PlanBadgeProps {
  plan: string;
}

export function PlanBadge({ plan }: PlanBadgeProps) {
  const label = PLAN_LABELS[plan as PlanId] ?? "Free";
  const isPaid = plan !== "free";

  return (
    <Badge
      variant="outline"
      className={`text-xs ${
        isPaid
          ? "text-emerald-500 border-emerald-500"
          : "text-muted-foreground"
      }`}
    >
      {label}
    </Badge>
  );
}

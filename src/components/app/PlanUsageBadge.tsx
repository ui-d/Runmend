import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { PLAN_LABELS, PLAN_LIMITS, type PlanId } from "@/lib/stripe";

interface PlanUsageBadgeProps {
  plan: string;
  isLtd?: boolean;
  profileCount: number;
  workspaceSlug: string;
}

const RING_SIZE = 28;
const RING_STROKE = 3;

export function PlanUsageBadge({ plan, isLtd = false, profileCount, workspaceSlug }: PlanUsageBadgeProps) {
  const planId = (PLAN_LABELS[plan as PlanId] ? (plan as PlanId) : "free") as PlanId;
  const label = isLtd ? "Lifetime" : PLAN_LABELS[planId];
  const limit = PLAN_LIMITS[planId].profiles;
  const isUnlimited = limit === -1;
  const isPaid = isLtd || planId !== "free";
  const usageRatio = isUnlimited ? 0 : Math.min(1, profileCount / limit);
  const atLimit = !isUnlimited && profileCount >= limit;

  const radius = (RING_SIZE - RING_STROKE) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - usageRatio);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        {!isUnlimited && (
          <div className="relative shrink-0" style={{ width: RING_SIZE, height: RING_SIZE }}>
            <svg width={RING_SIZE} height={RING_SIZE} viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}>
              <circle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={radius}
                fill="none"
                strokeWidth={RING_STROKE}
                className="stroke-muted"
              />
              <circle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={radius}
                fill="none"
                strokeWidth={RING_STROKE}
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
                transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
                className={
                  atLimit
                    ? "stroke-red-500"
                    : usageRatio > 0.7
                      ? "stroke-yellow-500"
                      : "stroke-emerald-500"
                }
              />
            </svg>
          </div>
        )}
        <Badge
          variant="outline"
          className={`text-xs ${isPaid ? "text-emerald-500 border-emerald-500" : "text-muted-foreground"}`}
        >
          {label}
        </Badge>
      </div>
      <div className="space-y-0.5 text-[11px] text-muted-foreground">
        <p className="tabular-nums">
          <span className="text-foreground">{profileCount}</span>
          {isUnlimited ? " profiles" : ` of ${limit} profiles`}
        </p>
        {atLimit && (
          <Link
            href={`/app/${workspaceSlug}/billing`}
            className="inline-block text-[11px] font-medium text-primary hover:underline"
          >
            Upgrade for more →
          </Link>
        )}
      </div>
    </div>
  );
}

import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface ComingSoonInlineProps {
  icon: LucideIcon;
  title: string;
  description: string;
  badge?: string;
  className?: string;
}

export function ComingSoonInline({
  icon: Icon,
  title,
  description,
  badge = "Coming soon",
  className,
}: ComingSoonInlineProps) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-xl border border-border/60 bg-card/30 p-4",
        className
      )}
    >
      <div className="mt-0.5 rounded-md bg-muted/60 p-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium">{title}</p>
          <span className="rounded-full border border-border/60 bg-muted/40 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            {badge}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

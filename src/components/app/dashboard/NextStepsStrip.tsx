import Link from "next/link";
import { Bell, CheckCircle2, Circle, Link2, Plus, Users, Zap } from "lucide-react";
import type { ComponentType, SVGProps } from "react";

export interface NextStepsState {
  hasConnection: boolean;
  hasProfile: boolean;
  hasSchedule: boolean;
  hasAlerts: boolean;
  hasTeammates: boolean;
}

interface NextStepsStripProps {
  workspaceSlug: string;
  state: NextStepsState;
}

interface StepDef {
  id: string;
  title: string;
  description: string;
  cta: string;
  href: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  done: boolean;
}

export function NextStepsStrip({ workspaceSlug, state }: NextStepsStripProps) {
  const steps: StepDef[] = [
    {
      id: "connect",
      title: "Connect a platform",
      description: "Link Make.com or n8n so Runmend can read your automations.",
      cta: "Connect",
      href: `/app/${workspaceSlug}/connections`,
      icon: Link2,
      done: state.hasConnection,
    },
    {
      id: "profile",
      title: "Create a profile",
      description: "Profiles group automations by client or project.",
      cta: "New profile",
      href: `/app/${workspaceSlug}/profiles/new`,
      icon: Plus,
      done: state.hasProfile,
    },
    {
      id: "schedule",
      title: "Enable auto-sync",
      description: "Let Runmend audit on its own — no clicks required.",
      cta: "Set schedule",
      href: `/app/${workspaceSlug}/profiles`,
      icon: Zap,
      done: state.hasSchedule,
    },
    {
      id: "alerts",
      title: "Set up alerts",
      description: "Get pinged when a detector trips or health drops.",
      cta: "Configure",
      href: `/app/${workspaceSlug}/settings`,
      icon: Bell,
      done: state.hasAlerts,
    },
    {
      id: "team",
      title: "Invite teammates",
      description: "Share monitoring access with your team.",
      cta: "Invite",
      href: `/app/${workspaceSlug}/settings`,
      icon: Users,
      done: state.hasTeammates,
    },
  ];

  const remaining = steps.filter((s) => !s.done);
  if (remaining.length === 0) return null;

  const completedCount = steps.length - remaining.length;

  return (
    <section className="rounded-xl border border-border/60 bg-card/40 p-5">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Next steps
          </span>
          <p className="mt-1 text-sm font-medium text-foreground">
            Finish setting up your workspace
          </p>
        </div>
        <span className="text-xs text-muted-foreground tabular-nums">
          {completedCount}/{steps.length} done
        </span>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {steps.map((step) => (
          <StepRow key={step.id} step={step} />
        ))}
      </div>
    </section>
  );
}

function StepRow({ step }: { step: StepDef }) {
  const Icon = step.icon;
  const StatusIcon = step.done ? CheckCircle2 : Circle;

  return (
    <Link
      href={step.href}
      className={`flex items-start gap-3 rounded-lg border p-3 transition-colors ${
        step.done
          ? "border-emerald-500/30 bg-emerald-500/5 text-muted-foreground"
          : "border-border/60 bg-background/40 hover:border-foreground/20"
      }`}
    >
      <StatusIcon
        className={`mt-0.5 h-4 w-4 shrink-0 ${
          step.done ? "text-emerald-500" : "text-muted-foreground/60"
        }`}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <Icon className="h-3.5 w-3.5 text-muted-foreground" />
          <span className={`text-sm font-medium ${step.done ? "line-through decoration-muted-foreground/40" : "text-foreground"}`}>
            {step.title}
          </span>
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">{step.description}</p>
        {!step.done && (
          <span className="mt-1.5 inline-block text-xs font-medium text-primary">
            {step.cta} →
          </span>
        )}
      </div>
    </Link>
  );
}

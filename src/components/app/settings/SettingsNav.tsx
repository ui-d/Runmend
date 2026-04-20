"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AlertTriangle,
  Bell,
  Building2,
  Database,
  Key,
  Plug,
  Shield,
  User,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SettingsNavProps {
  workspaceSlug: string;
}

const NAV_SECTIONS = [
  {
    group: "Workspace",
    items: [
      { label: "Workspace", href: "/workspace", icon: Building2 },
      { label: "Team", href: "/team", icon: Users },
      { label: "Integrations", href: "/integrations", icon: Plug },
    ],
  },
  {
    group: "You",
    items: [
      { label: "Account", href: "/account", icon: User },
      { label: "Alerts", href: "/alerts", icon: Bell },
    ],
  },
  {
    group: "Advanced",
    items: [
      { label: "API", href: "/api", icon: Key },
      { label: "Security", href: "/security", icon: Shield },
      { label: "Data", href: "/data", icon: Database },
      { label: "Danger zone", href: "/danger", icon: AlertTriangle, danger: true },
    ],
  },
] as const;

export function SettingsNav({ workspaceSlug }: SettingsNavProps) {
  const pathname = usePathname();
  const base = `/app/${workspaceSlug}/settings`;

  return (
    <nav className="lg:sticky lg:top-4 lg:self-start space-y-6">
      {NAV_SECTIONS.map((section) => (
        <div key={section.group} className="space-y-1">
          <p className="px-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/70">
            {section.group}
          </p>
          <div className="space-y-0.5">
            {section.items.map((item) => {
              const href = `${base}${item.href}`;
              const isActive = pathname.startsWith(href);
              const Icon = item.icon;
              const isDanger = "danger" in item && item.danger;
              return (
                <Link
                  key={item.label}
                  href={href}
                  className={cn(
                    "flex items-center gap-2.5 rounded-md px-3 py-1.5 text-sm transition-colors",
                    isActive
                      ? isDanger
                        ? "bg-red-500/10 text-red-400 font-medium"
                        : "bg-accent text-accent-foreground font-medium"
                      : isDanger
                        ? "text-red-400/70 hover:bg-red-500/10 hover:text-red-400"
                        : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

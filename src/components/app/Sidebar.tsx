"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Link2, Settings, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarProps {
  workspaceSlug: string;
}

const navItems = [
  { label: "Dashboard", href: "", icon: LayoutDashboard },
  { label: "Profiles", href: "/profiles", icon: BarChart3 },
  { label: "Connections", href: "/connections", icon: Link2 },
  { label: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar({ workspaceSlug }: SidebarProps) {
  const pathname = usePathname();
  const basePath = `/app/${workspaceSlug}`;

  return (
    <aside className="w-56 border-r border-border bg-card/50 flex flex-col">
      <div className="p-4 border-b border-border">
        <Link href="/" className="text-lg font-bold tracking-tight">
          flow<span className="text-muted-foreground">check</span>
        </Link>
      </div>
      <nav className="flex-1 p-2 space-y-1">
        {navItems.map((item) => {
          const href = `${basePath}${item.href}`;
          const isActive =
            item.href === ""
              ? pathname === basePath
              : pathname.startsWith(href);

          return (
            <Link
              key={item.label}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                isActive
                  ? "bg-accent text-accent-foreground font-medium"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

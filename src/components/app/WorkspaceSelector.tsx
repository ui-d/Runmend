"use client";

import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { useState, useRef, useEffect } from "react";

interface Workspace {
  id: string;
  name: string;
  slug: string;
}

interface WorkspaceSelectorProps {
  workspaces: Workspace[];
  currentSlug: string;
}

export function WorkspaceSelector({
  workspaces,
  currentSlug,
}: WorkspaceSelectorProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const current = workspaces.find((w) => w.slug === currentSlug);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (workspaces.length <= 1) {
    return (
      <span className="text-sm font-medium truncate">
        {current?.name ?? "Workspace"}
      </span>
    );
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 text-sm font-medium hover:text-foreground transition-colors"
      >
        {current?.name ?? "Workspace"}
        <ChevronDown className="h-3 w-3" />
      </button>
      {open && (
        <div className="absolute left-0 mt-1 w-48 rounded-md border border-border bg-card shadow-lg z-50">
          {workspaces.map((ws) => (
            <button
              key={ws.id}
              onClick={() => {
                router.push(`/app/${ws.slug}`);
                setOpen(false);
              }}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors ${
                ws.slug === currentSlug ? "bg-accent/50 font-medium" : ""
              }`}
            >
              {ws.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

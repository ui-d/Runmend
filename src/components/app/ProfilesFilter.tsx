"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { Search } from "lucide-react";

interface ProfilesFilterProps {
  workspaceSlug: string;
  currentFilters: {
    q?: string;
    platform?: string;
    status?: string;
    sort?: string;
  };
}

export function ProfilesFilter({
  workspaceSlug,
  currentFilters,
}: ProfilesFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const updateFilter = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value && value !== "all") {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      router.push(`/app/${workspaceSlug}/profiles?${params.toString()}`);
    },
    [router, searchParams, workspaceSlug]
  );

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search profiles..."
          defaultValue={currentFilters.q ?? ""}
          onChange={(e) => updateFilter("q", e.target.value)}
          className="w-full h-9 pl-9 pr-3 rounded-md border border-input bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        />
      </div>

      <select
        value={currentFilters.platform ?? "all"}
        onChange={(e) => updateFilter("platform", e.target.value)}
        className="h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
      >
        <option value="all">All Platforms</option>
        <option value="make">Make.com</option>
        <option value="n8n">n8n</option>
      </select>

      <select
        value={currentFilters.status ?? "all"}
        onChange={(e) => updateFilter("status", e.target.value)}
        className="h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
      >
        <option value="all">All Statuses</option>
        <option value="critical">Critical</option>
        <option value="warning">Warning</option>
        <option value="stable">Stable</option>
        <option value="excellent">Excellent</option>
      </select>

      <select
        value={currentFilters.sort ?? "name"}
        onChange={(e) => updateFilter("sort", e.target.value)}
        className="h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
      >
        <option value="name">Sort: Name</option>
        <option value="health-asc">Sort: Health (Low first)</option>
        <option value="health-desc">Sort: Health (High first)</option>
        <option value="issues">Sort: Most Issues</option>
      </select>
    </div>
  );
}

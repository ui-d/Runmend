"use client";

import { useState } from "react";
import { ConnectionCard } from "@/components/app/ConnectionCard";
import { ConnectMakeDialog } from "@/components/app/ConnectMakeDialog";
import { ConnectN8nDialog } from "@/components/app/ConnectN8nDialog";
import type { Database } from "@/lib/database.types";

type ConnectionRow = Database["public"]["Tables"]["platform_connections"]["Row"];

const PLATFORMS = [
  {
    id: "make" as const,
    label: "Make.com",
    description: "Connect via API token. Supports scenarios and execution logs.",
  },
  {
    id: "n8n" as const,
    label: "n8n",
    description: "Connect your self-hosted n8n instance via API key.",
  },
  {
    id: "zapier" as const,
    label: "Zapier",
    description: "OAuth integration. Requires Zapier Partner Program access.",
  },
];

interface ConnectionsClientProps {
  workspaceId: string;
  connections: ConnectionRow[];
}

export function ConnectionsClient({
  workspaceId,
  connections,
}: ConnectionsClientProps) {
  const [makeDialogOpen, setMakeDialogOpen] = useState(false);
  const [n8nDialogOpen, setN8nDialogOpen] = useState(false);

  function getConnection(platform: string): ConnectionRow | null {
    return connections.find((c) => c.platform === platform) ?? null;
  }

  function handleConnect(platform: string) {
    if (platform === "make") setMakeDialogOpen(true);
    else if (platform === "n8n") setN8nDialogOpen(true);
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {PLATFORMS.map((p) => (
          <ConnectionCard
            key={p.id}
            platformLabel={p.label}
            platformDescription={p.description}
            connection={getConnection(p.id)}
            onConnect={() => handleConnect(p.id)}
            disabled={p.id === "zapier"}
          />
        ))}
      </div>

      <ConnectMakeDialog
        open={makeDialogOpen}
        onOpenChange={setMakeDialogOpen}
        workspaceId={workspaceId}
      />
      <ConnectN8nDialog
        open={n8nDialogOpen}
        onOpenChange={setN8nDialogOpen}
        workspaceId={workspaceId}
      />
    </>
  );
}

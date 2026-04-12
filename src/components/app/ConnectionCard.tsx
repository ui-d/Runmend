"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle, XCircle, Unplug } from "lucide-react";
import type { Database } from "@/lib/database.types";

type ConnectionRow = Database["public"]["Tables"]["platform_connections"]["Row"];

interface ConnectionCardProps {
  platformLabel: string;
  platformDescription: string;
  connection: ConnectionRow | null;
  onConnect: () => void;
  disabled?: boolean;
}

export function ConnectionCard({
  platformLabel,
  platformDescription,
  connection,
  onConnect,
  disabled,
}: ConnectionCardProps) {
  const [testing, setTesting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const router = useRouter();

  async function handleTest() {
    if (!connection) return;
    setTesting(true);
    try {
      await fetch(`/api/connections/${connection.id}/test`, { method: "POST" });
      router.refresh();
    } finally {
      setTesting(false);
    }
  }

  async function handleDisconnect() {
    if (!connection) return;
    setDisconnecting(true);
    try {
      await fetch(`/api/connections/${connection.id}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setDisconnecting(false);
    }
  }

  const status = connection?.status;
  const isConnected = status === "active";
  const isError = status === "error";

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{platformLabel}</CardTitle>
          {connection && (
            <Badge
              variant="outline"
              className={
                isConnected
                  ? "text-emerald-500 border-emerald-500"
                  : isError
                    ? "text-red-500 border-red-500"
                    : "text-yellow-500 border-yellow-500"
              }
            >
              {isConnected ? "Active" : isError ? "Error" : status}
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground">{platformDescription}</p>
      </CardHeader>
      <CardContent>
        {connection?.error_message && (
          <p className="text-xs text-destructive mb-3">
            {connection.error_message}
          </p>
        )}

        {connection?.last_synced_at && (
          <p className="text-xs text-muted-foreground mb-3">
            Last synced:{" "}
            {new Date(connection.last_synced_at).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        )}

        {connection ? (
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleTest}
              disabled={testing}
            >
              {testing ? (
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              ) : isConnected ? (
                <CheckCircle className="mr-1 h-3 w-3" />
              ) : (
                <XCircle className="mr-1 h-3 w-3" />
              )}
              Test
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleDisconnect}
              disabled={disconnecting}
              className="text-destructive hover:text-destructive"
            >
              {disconnecting ? (
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              ) : (
                <Unplug className="mr-1 h-3 w-3" />
              )}
              Disconnect
            </Button>
          </div>
        ) : (
          <Button size="sm" onClick={onConnect} disabled={disabled}>
            Connect
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

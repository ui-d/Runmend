"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface ConnectedConnection {
  id: string;
  platform: "make" | "n8n";
  displayName: string;
}

interface MakeAuthFormProps {
  workspaceId: string;
  defaultDisplayName: string;
  allowRenameAccount: boolean;
  onSuccess: () => void;
  onBack?: () => void;
  onConnected?: (connection: ConnectedConnection) => void;
}

export function MakeAuthForm({
  workspaceId,
  defaultDisplayName,
  allowRenameAccount,
  onSuccess,
  onBack,
  onConnected,
}: MakeAuthFormProps) {
  const [apiKey, setApiKey] = useState("");
  const [zone, setZone] = useState("us1");
  const [displayName, setDisplayName] = useState(defaultDisplayName);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const label = displayName.trim() || "Primary";
      const res = await fetch("/api/connections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId,
          platform: "make",
          apiKey,
          zone,
          displayName: label,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to connect");

      toast.success(`Make.com · ${label} connected`);
      setApiKey("");
      if (onConnected && data.connection?.id) {
        onConnected({
          id: data.connection.id,
          platform: "make",
          displayName: label,
        });
      }
      router.refresh();
      onSuccess();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Connection failed";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {allowRenameAccount && (
        <div className="space-y-2">
          <Label htmlFor="displayName">Account label</Label>
          <Input
            id="displayName"
            type="text"
            placeholder="e.g. Client A, Agency sandbox"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
            maxLength={60}
          />
          <p className="text-xs text-muted-foreground">
            Shown on the connections page so you can tell multiple accounts
            apart.
          </p>
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="apiKey">API Token</Label>
        <Input
          id="apiKey"
          type="password"
          placeholder="Paste your Make.com API token"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="zone">Region</Label>
        <select
          id="zone"
          value={zone}
          onChange={(e) => setZone(e.target.value)}
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <option value="us1">US (us1.make.com)</option>
          <option value="eu1">EU (eu1.make.com)</option>
          <option value="eu2">EU 2 (eu2.make.com)</option>
        </select>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex justify-between gap-2">
        {onBack ? (
          <Button
            type="button"
            variant="ghost"
            onClick={onBack}
            disabled={loading}
          >
            Back
          </Button>
        ) : (
          <span />
        )}
        <Button type="submit" disabled={loading || !apiKey}>
          {loading ? "Connecting..." : "Connect"}
        </Button>
      </div>
    </form>
  );
}

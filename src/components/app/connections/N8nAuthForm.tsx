"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface N8nAuthFormProps {
  workspaceId: string;
  defaultDisplayName: string;
  allowRenameAccount: boolean;
  onSuccess: () => void;
  onBack?: () => void;
}

export function N8nAuthForm({
  workspaceId,
  defaultDisplayName,
  allowRenameAccount,
  onSuccess,
  onBack,
}: N8nAuthFormProps) {
  const [instanceUrl, setInstanceUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
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
          platform: "n8n",
          apiKey,
          instanceUrl,
          displayName: label,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to connect");

      toast.success(`n8n · ${label} connected`);
      setApiKey("");
      setInstanceUrl("");
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
          <Label htmlFor="n8nDisplayName">Account label</Label>
          <Input
            id="n8nDisplayName"
            type="text"
            placeholder="e.g. Client A, Staging"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
            maxLength={60}
          />
          <p className="text-xs text-muted-foreground">
            Shown on the connections page so you can tell multiple instances
            apart.
          </p>
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="instanceUrl">Instance URL</Label>
        <Input
          id="instanceUrl"
          type="url"
          placeholder="https://n8n.yourdomain.com"
          value={instanceUrl}
          onChange={(e) => setInstanceUrl(e.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="n8nApiKey">API Key</Label>
        <Input
          id="n8nApiKey"
          type="password"
          placeholder="Your n8n API key"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          required
        />
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
        <Button type="submit" disabled={loading || !apiKey || !instanceUrl}>
          {loading ? "Connecting..." : "Connect"}
        </Button>
      </div>
    </form>
  );
}

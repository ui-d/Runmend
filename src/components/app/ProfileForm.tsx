"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ConnectionOption {
  id: string;
  platform: string;
  displayName: string;
  status: string;
}

interface ProfileFormProps {
  workspaceId: string;
  workspaceSlug: string;
  currentProfileCount?: number;
  plan?: string;
  profileLimit?: number;
  connections: ConnectionOption[];
}

export function ProfileForm({
  workspaceId,
  workspaceSlug,
  currentProfileCount,
  plan,
  profileLimit,
  connections,
}: ProfileFormProps) {
  const atLimit =
    profileLimit !== undefined &&
    profileLimit !== -1 &&
    currentProfileCount !== undefined &&
    currentProfileCount >= profileLimit;
  const [name, setName] = useState("");
  const [platform, setPlatform] = useState<"make" | "n8n">("make");
  const [industry, setIndustry] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const platformConnections = useMemo(
    () => connections.filter((c) => c.platform === platform),
    [connections, platform],
  );

  const [connectionId, setConnectionId] = useState<string>(
    platformConnections[0]?.id ?? "",
  );

  // Keep the selection valid when the platform changes.
  const effectiveConnectionId = platformConnections.some(
    (c) => c.id === connectionId,
  )
    ? connectionId
    : (platformConnections[0]?.id ?? "");

  const hasConnection = platformConnections.length > 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (!effectiveConnectionId) {
        throw new Error(
          "Add a connection for this platform before creating a profile.",
        );
      }
      const supabase = createClient();
      const { data, error: insertError } = await supabase
        .from("automation_profiles")
        .insert({
          workspace_id: workspaceId,
          name,
          platform,
          connection_id: effectiveConnectionId,
          industry: industry || null,
          description: description || null,
        })
        .select()
        .single();

      if (insertError) throw insertError;
      router.push(`/app/${workspaceSlug}/profiles/${data.id}`);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to create profile";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  if (atLimit) {
    return (
      <Card className="max-w-lg border-yellow-500/30 bg-yellow-500/5">
        <CardContent className="p-6 text-center">
          <p className="text-sm font-medium mb-2">Client profile limit reached</p>
          <p className="text-xs text-muted-foreground mb-4">
            Your {plan ?? "free"} plan allows up to {profileLimit} client profile
            {profileLimit !== 1 ? "s" : ""}. Upgrade to monitor more clients.
          </p>
          <Button
            onClick={() =>
              (window.location.href = `/app/${workspaceSlug}/billing`)
            }
            size="sm"
          >
            Upgrade plan
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-lg">
      <CardHeader>
        <CardTitle>New Automation Profile</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Client / Project name</Label>
            <Input
              id="name"
              placeholder="e.g. Acme Corp, Marketing Ops"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="platform">Platform</Label>
            <select
              id="platform"
              value={platform}
              onChange={(e) =>
                setPlatform(e.target.value as "make" | "n8n")
              }
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="make">Make.com</option>
              <option value="n8n">n8n</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="connection">Connection</Label>
            {hasConnection ? (
              <>
                <select
                  id="connection"
                  value={effectiveConnectionId}
                  onChange={(e) => setConnectionId(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  {platformConnections.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.displayName}
                      {c.status !== "active" ? ` (${c.status})` : ""}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">
                  Pick the{" "}
                  {platform === "make" ? "Make.com" : "n8n"} account this
                  client lives in.{" "}
                  <Link
                    href={`/app/${workspaceSlug}/connections`}
                    className="underline underline-offset-2 hover:text-foreground"
                  >
                    Add another account
                  </Link>
                  .
                </p>
              </>
            ) : (
              <div className="rounded-md border border-yellow-500/30 bg-yellow-500/5 p-3 text-xs">
                <p className="mb-2 font-medium">
                  No {platform === "make" ? "Make.com" : "n8n"} connection yet.
                </p>
                <p className="mb-2 text-muted-foreground">
                  Connect the account this client uses before creating the
                  profile.
                </p>
                <Link
                  href={`/app/${workspaceSlug}/connections`}
                  className="inline-flex items-center text-foreground underline underline-offset-2"
                >
                  Open connections →
                </Link>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="industry">Client&apos;s industry (optional)</Label>
            <Input
              id="industry"
              placeholder="e.g. E-commerce, SaaS, Marketing"
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Input
              id="description"
              placeholder="Brief description of this client's automation stack"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex gap-3">
            <Button type="submit" disabled={loading || !hasConnection}>
              {loading ? "Creating..." : "Create Profile"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

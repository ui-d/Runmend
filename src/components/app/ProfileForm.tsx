"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ProfileFormProps {
  workspaceId: string;
  workspaceSlug: string;
  currentProfileCount?: number;
  plan?: string;
  profileLimit?: number;
}

export function ProfileForm({
  workspaceId,
  workspaceSlug,
  currentProfileCount,
  plan,
  profileLimit,
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = createClient();
      const { data, error: insertError } = await supabase
        .from("automation_profiles")
        .insert({
          workspace_id: workspaceId,
          name,
          platform,
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
          <p className="text-sm font-medium mb-2">Profile limit reached</p>
          <p className="text-xs text-muted-foreground mb-4">
            Your {plan ?? "free"} plan allows up to {profileLimit} profile
            {profileLimit !== 1 ? "s" : ""}. Upgrade to create more.
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
            <Label htmlFor="name">Profile name</Label>
            <Input
              id="name"
              placeholder="e.g. Marketing Automations"
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
            <Label htmlFor="industry">Industry (optional)</Label>
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
              placeholder="Brief description of this automation stack"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex gap-3">
            <Button type="submit" disabled={loading}>
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

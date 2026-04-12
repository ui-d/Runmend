"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Zap } from "lucide-react";

interface UpgradePromptProps {
  feature: string;
  currentPlan: string;
  limit: number;
  workspaceId: string;
}

export function UpgradePrompt({
  feature,
  currentPlan,
  limit,
  workspaceId,
}: UpgradePromptProps) {
  const [loading, setLoading] = useState(false);

  const targetPlan = currentPlan === "free" ? "starter" : "pro";

  async function handleUpgrade() {
    setLoading(true);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId, plan: targetPlan }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="border-yellow-500/30 bg-yellow-500/5">
      <CardContent className="p-4 flex items-center gap-4">
        <div className="h-10 w-10 rounded-lg bg-yellow-500/10 flex items-center justify-center shrink-0">
          <Zap className="h-5 w-5 text-yellow-500" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium">
            You&apos;ve reached the {feature} limit
          </p>
          <p className="text-xs text-muted-foreground">
            Your {currentPlan} plan allows up to {limit} {feature}. Upgrade to
            get more.
          </p>
        </div>
        <Button size="sm" onClick={handleUpgrade} disabled={loading}>
          {loading ? "Loading..." : `Upgrade to ${targetPlan}`}
        </Button>
      </CardContent>
    </Card>
  );
}

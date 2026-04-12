"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Link2, BarChart3, Zap } from "lucide-react";

interface OnboardingWizardProps {
  workspaceSlug: string;
  hasConnections: boolean;
  hasProfiles: boolean;
}

const STEPS = [
  {
    id: "welcome",
    title: "Set up your workspace",
    description: "Get your automation monitoring running in 3 steps. Monitor all your clients from one dashboard.",
    icon: Zap,
  },
  {
    id: "connect",
    title: "Connect your client's platform",
    description: "Link a Make.com or n8n account. One connection monitors all scenarios in that account.",
    icon: Link2,
  },
  {
    id: "profile",
    title: "Create a client profile",
    description: "Each profile represents a client or project you're monitoring. You can add more later.",
    icon: BarChart3,
  },
];

export function OnboardingWizard({
  workspaceSlug,
  hasConnections,
  hasProfiles,
}: OnboardingWizardProps) {
  // Auto-advance based on state
  let currentStep = 0;
  if (hasConnections) currentStep = 2;
  if (hasConnections && hasProfiles) currentStep = 3;

  const [step, setStep] = useState(currentStep);

  if (step >= 3) return null;

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="text-center pb-2">
        <div className="flex justify-center gap-2 mb-4">
          {STEPS.map((s, i) => (
            <div
              key={s.id}
              className={`h-1.5 w-12 rounded-full ${
                i <= step ? "bg-primary" : "bg-muted"
              }`}
            />
          ))}
        </div>
        <div className="flex justify-center mb-2">
          {step < STEPS.length && (
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
              {(() => {
                const Icon = STEPS[step].icon;
                return <Icon className="h-6 w-6 text-primary" />;
              })()}
            </div>
          )}
        </div>
        <CardTitle className="text-xl">
          {step < STEPS.length ? STEPS[step].title : ""}
        </CardTitle>
        <CardDescription>
          {step < STEPS.length ? STEPS[step].description : ""}
        </CardDescription>
      </CardHeader>
      <CardContent className="text-center pb-6">
        {step === 0 && (
          <Button onClick={() => setStep(1)}>Get started</Button>
        )}
        {step === 1 && (
          <div className="flex justify-center gap-3">
            <Link href={`/app/${workspaceSlug}/connections`}>
              <Button>
                <Link2 className="mr-2 h-4 w-4" />
                Connect a platform
              </Button>
            </Link>
            <Button variant="ghost" onClick={() => setStep(2)}>
              Skip for now
            </Button>
          </div>
        )}
        {step === 2 && (
          <div className="flex justify-center gap-3">
            <Link href={`/app/${workspaceSlug}/profiles/new`}>
              <Button>
                <BarChart3 className="mr-2 h-4 w-4" />
                Create a profile
              </Button>
            </Link>
            {hasConnections && (
              <div className="flex items-center gap-1 text-xs text-emerald-500">
                <CheckCircle className="h-3 w-3" />
                Platform connected
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { updateAccountNameAction } from "@/app/app/[workspaceSlug]/settings/actions";

interface AccountFormProps {
  workspaceSlug: string;
  email: string;
  initialFullName: string | null;
}

export function AccountForm({
  workspaceSlug,
  email,
  initialFullName,
}: AccountFormProps) {
  const router = useRouter();
  const [fullName, setFullName] = useState(initialFullName ?? "");
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [signingOut, setSigningOut] = useState(false);

  const initial = initialFullName ?? "";
  const isDirty = fullName.trim() !== initial.trim();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isDirty) return;
    startTransition(async () => {
      const result = await updateAccountNameAction({
        fullName: fullName.trim(),
        workspaceSlug,
      });
      if (result.ok) {
        setStatus("saved");
        setErrorMsg(null);
        setTimeout(() => setStatus("idle"), 2000);
      } else {
        setStatus("error");
        setErrorMsg(result.error);
      }
    });
  }

  async function handleSignOut() {
    setSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="full-name">Full name</Label>
          <div className="flex gap-2">
            <Input
              id="full-name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your name"
              disabled={pending}
              maxLength={80}
              className="max-w-sm"
            />
            <Button type="submit" disabled={!isDirty || pending} size="sm">
              {pending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : status === "saved" ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  Saved
                </>
              ) : (
                "Save"
              )}
            </Button>
          </div>
          {errorMsg && <p className="text-xs text-red-400">{errorMsg}</p>}
        </div>

        <div className="space-y-1.5">
          <Label>Email address</Label>
          <div className="flex h-8 max-w-sm items-center rounded-lg border border-input bg-muted/30 px-2.5 text-sm text-muted-foreground">
            {email}
          </div>
          <p className="text-xs text-muted-foreground">
            Email changes aren&apos;t supported yet — sign up again with a new address
            if you need to move accounts.
          </p>
        </div>
      </form>

      <div className="rounded-xl border border-border/60 bg-card/30 p-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium">Sign out</p>
            <p className="text-xs text-muted-foreground">
              End this session on this device.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleSignOut}
            disabled={signingOut}
          >
            <LogOut className="h-3.5 w-3.5" />
            {signingOut ? "Signing out…" : "Sign out"}
          </Button>
        </div>
      </div>
    </div>
  );
}

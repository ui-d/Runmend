"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ProfileForm } from "@/components/app/ProfileForm";

interface ConnectionOption {
  id: string;
  platform: string;
  displayName: string;
  status: string;
}

interface NewProfileButtonProps {
  workspaceId: string;
  workspaceSlug: string;
  currentProfileCount: number;
  plan: string;
  profileLimit: number;
  connections: ConnectionOption[];
  initialConnectionId?: string;
  initialOpen?: boolean;
  label?: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg";
  className?: string;
}

export function NewProfileButton({
  workspaceId,
  workspaceSlug,
  currentProfileCount,
  plan,
  profileLimit,
  connections,
  initialConnectionId,
  initialOpen = false,
  label = "New profile",
  variant = "default",
  size = "default",
  className,
}: NewProfileButtonProps) {
  const [open, setOpen] = useState(initialOpen);
  const router = useRouter();

  useEffect(() => {
    if (initialOpen) setOpen(true);
  }, [initialOpen]);

  function handleSuccess(profileId: string) {
    setOpen(false);
    router.push(`/app/${workspaceSlug}/profiles/${profileId}`);
  }

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={() => setOpen(true)}
        className={className}
      >
        <Plus className="mr-2 h-4 w-4" />
        {label}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New automation profile</DialogTitle>
            <DialogDescription>
              Group automations by client or project to track health.
            </DialogDescription>
          </DialogHeader>
          <ProfileForm
            workspaceId={workspaceId}
            workspaceSlug={workspaceSlug}
            currentProfileCount={currentProfileCount}
            plan={plan}
            profileLimit={profileLimit}
            connections={connections}
            initialConnectionId={initialConnectionId}
            onSuccess={handleSuccess}
            onCancel={() => setOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}

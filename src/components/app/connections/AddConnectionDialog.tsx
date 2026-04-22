"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  CONNECTED_PLATFORMS,
  type CatalogSlug,
} from "@/lib/connections/catalog";
import { ConnectorLogo } from "./ConnectorLogo";
import { MakeAuthForm, type ConnectedConnection } from "./MakeAuthForm";
import { N8nAuthForm } from "./N8nAuthForm";

type LivePlatform = "make" | "n8n";

function isLivePlatform(slug: CatalogSlug | null): slug is LivePlatform {
  return slug === "make" || slug === "n8n";
}

interface AddConnectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  workspaceSlug: string;
  presetPlatform?: LivePlatform | null;
  defaultDisplayName?: string;
  allowRenameAccount?: boolean;
  onConnected?: (connection: ConnectedConnection) => void;
}

/**
 * Two-step modal: platform picker → auth form. Skips the picker when
 * `presetPlatform` is supplied (entry from "Add another"), in which case the
 * Back button is suppressed since there's no picker to return to.
 */
export function AddConnectionDialog({
  open,
  onOpenChange,
  workspaceId,
  workspaceSlug,
  presetPlatform = null,
  defaultDisplayName = "Primary",
  allowRenameAccount = false,
  onConnected,
}: AddConnectionDialogProps) {
  const [platform, setPlatform] = useState<LivePlatform | null>(presetPlatform);

  useEffect(() => {
    if (open) setPlatform(presetPlatform);
  }, [open, presetPlatform]);

  function handleSuccess() {
    onOpenChange(false);
  }

  function handleBackToPicker() {
    setPlatform(null);
  }

  const title = platform === null ? "Add connection" : platform === "make" ? "Connect Make.com" : "Connect n8n";
  const description =
    platform === null
      ? "Choose a platform to start monitoring."
      : platform === "make"
        ? "Enter your Make.com API token. Use an organization-level token to monitor scenarios across teams."
        : "Enter your n8n instance URL and API key. Self-hosted instances must be reachable from our servers.";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {platform === null && (
          <PlatformPicker
            workspaceSlug={workspaceSlug}
            onPick={(slug) => {
              if (isLivePlatform(slug)) setPlatform(slug);
            }}
            onClose={() => onOpenChange(false)}
          />
        )}

        {platform === "make" && (
          <MakeAuthForm
            workspaceId={workspaceId}
            defaultDisplayName={defaultDisplayName}
            allowRenameAccount={allowRenameAccount}
            onSuccess={handleSuccess}
            onBack={presetPlatform ? undefined : handleBackToPicker}
            onConnected={onConnected}
          />
        )}

        {platform === "n8n" && (
          <N8nAuthForm
            workspaceId={workspaceId}
            defaultDisplayName={defaultDisplayName}
            allowRenameAccount={allowRenameAccount}
            onSuccess={handleSuccess}
            onBack={presetPlatform ? undefined : handleBackToPicker}
            onConnected={onConnected}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

interface PlatformPickerProps {
  workspaceSlug: string;
  onPick: (slug: CatalogSlug) => void;
  onClose: () => void;
}

function PlatformPicker({ workspaceSlug, onPick, onClose }: PlatformPickerProps) {
  return (
    <>
      <div className="grid gap-2">
        {CONNECTED_PLATFORMS.map((entry) => (
          <button
            key={entry.slug}
            type="button"
            onClick={() => onPick(entry.slug)}
            className="flex items-center gap-3 rounded-lg border border-border/60 bg-card/40 px-4 py-3 text-left transition-colors hover:border-foreground/40 hover:bg-card/70"
          >
            <ConnectorLogo slug={entry.slug} size={28} />
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">
                {entry.label}
              </p>
              <p className="text-xs text-muted-foreground">
                {entry.authTypeLabel}
              </p>
            </div>
          </button>
        ))}
      </div>
      <div className="flex items-center justify-between border-t border-border/60 pt-3 text-xs text-muted-foreground">
        <Link
          href={`/app/${workspaceSlug}/roadmap`}
          onClick={onClose}
          className="hover:text-foreground"
        >
          Don&apos;t see yours? Request a platform →
        </Link>
        <button
          type="button"
          onClick={onClose}
          className="hover:text-foreground"
        >
          Cancel
        </button>
      </div>
    </>
  );
}

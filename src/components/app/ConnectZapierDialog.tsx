"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";

interface ConnectZapierDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
}

const PAYLOAD_EXAMPLE = `{
  "zapId": "123456",
  "zapName": "My Zap Name",
  "status": "success",
  "startedAt": "2026-04-12T10:00:00Z",
  "errorMessage": ""
}`;

export function ConnectZapierDialog({
  open,
  onOpenChange,
  workspaceId,
}: ConnectZapierDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [webhookUrl, setWebhookUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const router = useRouter();

  async function handleConnect() {
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/connections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId, platform: "zapier" }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to connect");

      const token = data.connection.webhook_token;
      setWebhookUrl(`${window.location.origin}/api/webhooks/zapier/${token}`);
      router.refresh();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Connection failed";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    if (!webhookUrl) return;
    await navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleClose(isOpen: boolean) {
    if (!isOpen) {
      setWebhookUrl(null);
      setError(null);
      setCopied(false);
    }
    onOpenChange(isOpen);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Connect Zapier</DialogTitle>
          <DialogDescription>
            {webhookUrl
              ? "Your webhook URL is ready. Add it to your Zaps to start monitoring."
              : "FlowCheck monitors your Zaps via webhooks. Click Connect to generate a unique webhook URL."}
          </DialogDescription>
        </DialogHeader>

        {!webhookUrl ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Unlike Make.com or n8n, Zapier requires adding a webhook action to
              each Zap you want to monitor. After connecting, you&apos;ll get a
              URL and setup instructions.
            </p>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleClose(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleConnect} disabled={loading}>
                {loading ? "Connecting..." : "Connect"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Webhook URL */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Webhook URL</label>
              <div className="flex gap-2">
                <code className="flex-1 rounded-md border bg-muted px-3 py-2 text-xs break-all">
                  {webhookUrl}
                </code>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCopy}
                  className="shrink-0"
                >
                  {copied ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Setup instructions */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Setup Instructions</label>
              <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                <li>Open a Zap you want to monitor in Zapier</li>
                <li>Add a new action step at the end of your Zap</li>
                <li>
                  Choose <strong>Webhooks by Zapier</strong> &rarr;{" "}
                  <strong>POST</strong>
                </li>
                <li>Paste the webhook URL above into the URL field</li>
                <li>
                  Set <strong>Payload Type</strong> to <strong>Json</strong>
                </li>
                <li>Add the data fields shown below</li>
              </ol>
            </div>

            {/* Payload format */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Payload Fields</label>
              <div className="rounded-md border bg-muted p-3 text-xs">
                <table className="w-full">
                  <tbody className="divide-y divide-border">
                    <tr>
                      <td className="py-1 font-mono font-medium">zapId</td>
                      <td className="py-1 text-muted-foreground">
                        A unique ID for this Zap (use the Zap&apos;s URL ID or
                        any label)
                      </td>
                    </tr>
                    <tr>
                      <td className="py-1 font-mono font-medium">zapName</td>
                      <td className="py-1 text-muted-foreground">
                        Name of the Zap (e.g. &quot;Send Slack on new
                        lead&quot;)
                      </td>
                    </tr>
                    <tr>
                      <td className="py-1 font-mono font-medium">status</td>
                      <td className="py-1 text-muted-foreground">
                        <code>success</code> or <code>error</code>
                      </td>
                    </tr>
                    <tr>
                      <td className="py-1 font-mono font-medium">startedAt</td>
                      <td className="py-1 text-muted-foreground">
                        Timestamp in ISO 8601 format (use Zapier&apos;s
                        date/time formatter)
                      </td>
                    </tr>
                    <tr>
                      <td className="py-1 font-mono font-medium">
                        errorMessage
                      </td>
                      <td className="py-1 text-muted-foreground">
                        Error details (leave empty for success)
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Example payload */}
            <details className="group">
              <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground">
                Example JSON payload
              </summary>
              <pre className="mt-2 rounded-md border bg-muted p-3 text-xs overflow-x-auto">
                {PAYLOAD_EXAMPLE}
              </pre>
            </details>

            <div className="flex justify-end">
              <Button onClick={() => handleClose(false)}>Done</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

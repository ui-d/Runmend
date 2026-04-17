import type { Platform } from "@/lib/types";

export interface ConnectionUrlContext {
  platform: Platform;
  zone?: string | null;
  instanceUrl?: string | null;
}

export function buildMakeScenarioUrl(zone: string, externalId: string): string {
  return `https://${zone}.make.com/scenarios/${externalId}`;
}

export function buildN8nWorkflowUrl(instanceUrl: string, externalId: string): string {
  const base = instanceUrl.replace(/\/$/, "");
  return `${base}/workflow/${externalId}`;
}

export function buildScenarioUrl(
  connection: ConnectionUrlContext,
  externalId: string
): string | undefined {
  if (!externalId) return undefined;

  if (connection.platform === "make" && connection.zone) {
    return buildMakeScenarioUrl(connection.zone, externalId);
  }

  if (connection.platform === "n8n" && connection.instanceUrl) {
    return buildN8nWorkflowUrl(connection.instanceUrl, externalId);
  }

  return undefined;
}

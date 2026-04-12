import type { PlatformAdapter } from "./types";
import { MakeAdapter } from "./make";
import { N8nAdapter } from "./n8n";
import { ZapierAdapter } from "./zapier";

interface AdapterCredentials {
  apiKey?: string;
  accessToken?: string;
  instanceUrl?: string;
  zone?: string;
}

export function createAdapter(
  platform: "zapier" | "make" | "n8n",
  credentials: AdapterCredentials
): PlatformAdapter {
  switch (platform) {
    case "make":
      if (!credentials.apiKey) throw new Error("API key required for Make.com");
      return new MakeAdapter(credentials.apiKey, credentials.zone);
    case "n8n":
      if (!credentials.apiKey) throw new Error("API key required for n8n");
      if (!credentials.instanceUrl) throw new Error("Instance URL required for n8n");
      return new N8nAdapter(credentials.apiKey, credentials.instanceUrl);
    case "zapier":
      return new ZapierAdapter();
  }
}

export type { PlatformAdapter, NormalizedAutomation, NormalizedExecution } from "./types";

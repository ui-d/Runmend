export type CatalogSlug =
  | "make"
  | "n8n"
  | "zapier"
  | "pipedream"
  | "workato"
  | "relay"
  | "tray"
  | "bardeen"
  | "airtable_automations"
  | "lindy";

export interface ConnectedCatalogEntry {
  slug: CatalogSlug;
  label: string;
  authTypeLabel: string;
  docsUrl: string | null;
}

export interface AvailableCatalogEntry {
  slug: CatalogSlug;
  label: string;
  authTypeLabel: string;
  description: string;
  docsUrl: string | null;
  comingSoon?: boolean;
}

export interface ComingSoonCatalogEntry {
  slug: CatalogSlug;
  label: string;
  description: string;
}

export const CONNECTED_PLATFORMS: ConnectedCatalogEntry[] = [
  { slug: "make", label: "Make.com", authTypeLabel: "API token", docsUrl: "https://www.make.com/en/help/tools/api" },
  { slug: "n8n",  label: "n8n",      authTypeLabel: "API key",   docsUrl: "https://docs.n8n.io/api/authentication/" },
];

export const AVAILABLE_CONNECTORS: AvailableCatalogEntry[] = [
  { slug: "make",      label: "Make.com",  authTypeLabel: "API token", description: "Scenarios, executions, errors.", docsUrl: "https://www.make.com/en/help/tools/api" },
  { slug: "n8n",       label: "n8n",       authTypeLabel: "API key",   description: "Self-hosted or cloud. API key auth.", docsUrl: "https://docs.n8n.io/api/authentication/" },
  { slug: "zapier",    label: "Zapier",    authTypeLabel: "OAuth",     description: "Zaps, runs, errors.",           docsUrl: "https://platform.zapier.com/docs/intro", comingSoon: true },
  { slug: "pipedream", label: "Pipedream", authTypeLabel: "OAuth",     description: "Workflows, events.",            docsUrl: "https://pipedream.com/docs/api/",        comingSoon: true },
  { slug: "workato",   label: "Workato",   authTypeLabel: "API token", description: "Enterprise iPaaS.",             docsUrl: "https://docs.workato.com/workato-api.html", comingSoon: true },
  { slug: "relay",     label: "Relay.app", authTypeLabel: "OAuth",     description: "AI-native workflows.",          docsUrl: "https://relay.app/docs",                 comingSoon: true },
  { slug: "tray",      label: "Tray.io",   authTypeLabel: "API token", description: "Enterprise iPaaS.",             docsUrl: "https://tray.ai/documentation",          comingSoon: true },
];

export const COMING_SOON_CONNECTORS: ComingSoonCatalogEntry[] = [
  { slug: "bardeen",              label: "Bardeen",              description: "Browser automations." },
  { slug: "airtable_automations", label: "Airtable automations", description: "Native Airtable scripts." },
  { slug: "lindy",                label: "Lindy.ai",             description: "AI agent workflows." },
];

export const LIVE_SLUGS: ReadonlySet<CatalogSlug> = new Set<CatalogSlug>(["make", "n8n"]);

export function isLiveSlug(slug: string): slug is "make" | "n8n" {
  return slug === "make" || slug === "n8n";
}

export const CONNECTION_SYNC_INTERVAL_MINUTES = 15;

import { AutomationProfile } from "@/lib/types";

export const profiles: AutomationProfile[] = [
  {
    id: "coastal-content",
    name: "Coastal Content Agency",
    platform: "zapier",
    scenarioCount: 47,
    industry: "Marketing Agency",
    description:
      "Full-service content agency running 47 Zapier automations for client onboarding, content scheduling, reporting, and billing.",
    healthScore: 34,
    lastAuditDate: "2026-03-25",
    issues: [
      {
        id: "cc-1",
        severity: "critical",
        name: "Client Onboarding Webhook Failure",
        automationName: "New Client → Slack + Asana + Google Drive",
        businessImpact:
          "New clients are not being onboarded automatically. Your team has been manually creating folders, Slack channels, and Asana projects for the last 3 days — missing SLA windows and burning 2+ hours per new client.",
        recommendation:
          "Check the webhook trigger URL — it likely expired after your Zapier plan renewal. Reconnect the trigger and test with a sample payload.",
      },
      {
        id: "cc-2",
        severity: "critical",
        name: "Invoice Generation Stopped",
        automationName: "Monthly Invoice → QuickBooks + Email Client",
        businessImpact:
          "Zero invoices have been generated or sent in the last 19 days. At your average of 12 invoices/month ($4,200 average), this represents ~$50,000 in unbilled work that clients may dispute if invoiced late.",
        recommendation:
          "The QuickBooks OAuth token expired. Re-authenticate in Zapier's connection settings, then manually trigger the missed invoices from your billing spreadsheet.",
      },
      {
        id: "cc-3",
        severity: "critical",
        name: "Social Media Scheduler Silent Failure",
        automationName: "Content Calendar → Buffer → LinkedIn + Twitter",
        businessImpact:
          "Your content calendar shows 34 posts scheduled over the last 2 weeks, but Buffer received 0. Clients paying for social media management have had zero posts published — potential contract violations.",
        recommendation:
          "Buffer's API changed their rate limit headers. Update the Zap to use Buffer's v2 endpoint, or switch to the native Buffer-Zapier integration which handles this automatically.",
      },
      {
        id: "cc-4",
        severity: "warning",
        name: "Client Report Emails Missing Names",
        automationName: "Weekly Report → Format → Email Client",
        businessImpact:
          "41% of weekly report emails are being sent with 'Hello ,' instead of 'Hello [Client Name],' — the name field mapping is producing empty strings. Clients notice and it looks unprofessional.",
        recommendation:
          "The Google Sheets column for client names was shifted by one column during a recent sheet restructure. Update the field mapping in step 3 of this Zap to reference column C instead of column B.",
      },
      {
        id: "cc-5",
        severity: "warning",
        name: "Approaching Zapier Task Limit",
        automationName: "Account-wide",
        businessImpact:
          "You've used 78% of your monthly Zapier task allocation with 9 days remaining. At current burn rate, you'll hit the limit in 4 days — all automations will pause until the billing cycle resets.",
        recommendation:
          "Review your highest-volume Zaps (content scheduling runs ~200 tasks/day). Consider upgrading your plan or optimizing the content batch Zap to process multiple items per task.",
      },
      {
        id: "cc-6",
        severity: "info",
        name: "Zombie Automation: Old CRM Migration",
        automationName: "HubSpot → Salesforce Contact Sync",
        businessImpact:
          "This Zap was created during your CRM migration 8 months ago and is still active, consuming ~30 tasks/month. The migration is complete — these tasks are wasted.",
        recommendation:
          "Turn off this Zap. The migration is done and the sync is no longer needed. This will free up ~30 tasks/month from your quota.",
      },
      {
        id: "cc-7",
        severity: "info",
        name: "Duplicate Notification Paths",
        automationName: "New Lead → Slack #leads + Email + SMS",
        businessImpact:
          "Your team gets the same new lead notification via Slack, email, AND SMS — all from separate Zaps. This creates notification fatigue and wastes 3x the tasks. No business risk, but inefficient.",
        recommendation:
          "Consolidate into a single multi-step Zap that sends to Slack (primary) and email (backup). Remove the SMS Zap unless your team specifically needs mobile alerts.",
      },
    ],
  },
  {
    id: "greenleaf-commerce",
    name: "GreenLeaf Commerce",
    platform: "make",
    scenarioCount: 23,
    industry: "E-commerce",
    description:
      "Sustainable e-commerce brand running 23 Make.com scenarios for order processing, inventory sync, email marketing, and customer support.",
    healthScore: 62,
    lastAuditDate: "2026-03-24",
    issues: [
      {
        id: "gl-1",
        severity: "critical",
        name: "Stripe → Mailchimp Sequence Stopped",
        automationName: "New Purchase → Add to Post-Purchase Email Sequence",
        businessImpact:
          "This scenario has had 0 executions in the last 14 days — it was averaging 47/day. Every customer who purchased since then (~322 customers) never received their post-purchase email sequence: no order confirmation, no shipping updates, no review request.",
        recommendation:
          "Check if the Stripe webhook is still active in your Stripe dashboard → Developers → Webhooks. The endpoint URL may have changed after Make.com's recent infrastructure update. Re-register the webhook.",
      },
      {
        id: "gl-2",
        severity: "critical",
        name: "Google Sheets Credential Expiring",
        automationName: "Daily Inventory Sync → Google Sheets → Shopify",
        businessImpact:
          "Your Google OAuth token expires in 6 days. When it does, your daily inventory sync will stop — meaning your Shopify store will show incorrect stock levels. Last time this happened, you oversold 23 items before noticing.",
        recommendation:
          "Go to Make.com → Connections → Google Sheets and re-authenticate now, before it expires. Set a calendar reminder for 85 days from now (Google tokens last ~90 days).",
      },
      {
        id: "gl-3",
        severity: "warning",
        name: "Order Confirmation Empty Customer Names",
        automationName: "New Order → Format → Send Confirmation Email",
        businessImpact:
          "34% of order confirmation emails are being sent with an empty customer_name field — 'Hi , your order is confirmed' instead of 'Hi Sarah, your order is confirmed.' This affects brand perception.",
        recommendation:
          "The Shopify order payload changed the field from 'customer.first_name' to 'customer.firstName' in their API v2. Update the field mapping in the Router module.",
      },
      {
        id: "gl-4",
        severity: "warning",
        name: "Refund Processing Delay",
        automationName: "Refund Request → Process → Notify Customer",
        businessImpact:
          "Refund processing scenario is running but with an average delay of 4.2 hours (was instant). Customers are submitting support tickets asking about their refund status — increasing support load by ~15 tickets/week.",
        recommendation:
          "The scenario's execution is being queued due to rate limiting on the Stripe API module. Reduce the batch size from 50 to 10, or upgrade your Make.com plan to get priority execution.",
      },
      {
        id: "gl-5",
        severity: "warning",
        name: "Missing Error Handler on Shipping Label",
        automationName: "Order Packed → Generate Shipping Label → Update Tracking",
        businessImpact:
          "This scenario has no error handler. When the shipping API returns an error (happens ~3% of orders), the entire scenario fails silently. You've had 7 orders in the last month ship without tracking numbers.",
        recommendation:
          "Add an error handler route in Make.com that catches shipping API failures and sends a Slack notification to your fulfillment team with the order number.",
      },
      {
        id: "gl-6",
        severity: "info",
        name: "Unused Abandoned Cart Scenario",
        automationName: "Abandoned Cart → Email Reminder (Draft)",
        businessImpact:
          "This scenario was created 4 months ago and is still in draft — never activated. Your abandoned cart recovery rate is 0% while industry average is 5-10%. Potential revenue left on the table.",
        recommendation:
          "Review and activate this scenario. Even a basic abandoned cart email can recover 5-10% of abandoned carts. At your average order value of $67, that could mean $2,000-4,000/month in recovered revenue.",
      },
      {
        id: "gl-7",
        severity: "info",
        name: "Duplicate Inventory Check",
        automationName: "Hourly Stock Check → Alert if Low",
        businessImpact:
          "You have two scenarios checking inventory: the daily sync (gl-2) and this hourly check. The hourly check is redundant since the daily sync already updates Shopify. This uses 720 operations/month unnecessarily.",
        recommendation:
          "Disable the hourly check. The daily sync is sufficient for your order volume (~47 orders/day). If you need real-time stock alerts, add a low-stock filter to the daily sync instead.",
      },
    ],
  },
  {
    id: "creator-stack",
    name: "Creator Stack",
    platform: "zapier",
    scenarioCount: 15,
    industry: "Digital Courses",
    description:
      "Online course creator running 15 Zapier automations for student enrollment, drip content delivery, community access, and payment processing.",
    healthScore: 91,
    lastAuditDate: "2026-03-26",
    issues: [
      {
        id: "cs-1",
        severity: "warning",
        name: "Teachable API Rate Limit Approaching",
        automationName: "New Enrollment → Drip Content Schedule",
        businessImpact:
          "Your Teachable API usage is at 82% of the hourly rate limit. During your last course launch (200+ enrollments in 1 hour), this Zap hit the limit and 34 students didn't get their Day 1 content on time. Next launch is in 2 weeks.",
        recommendation:
          "Add a 2-second delay step between API calls in this Zap, or implement a queue-based approach using Zapier's built-in delay feature to spread enrollments over a longer window during launches.",
      },
      {
        id: "cs-2",
        severity: "info",
        name: "Legacy Welcome Email Zap",
        automationName: "New Student → Welcome Email (Old Template)",
        businessImpact:
          "This Zap sends a welcome email using your old branding (pre-rebrand 6 months ago). Your new enrollment flow already sends a branded welcome via ConvertKit. 100% of new students get two welcome emails — one old, one new.",
        recommendation:
          "Turn off this legacy Zap. Your ConvertKit sequence already handles the welcome email with your current branding. Having two welcome emails confuses students.",
      },
      {
        id: "cs-3",
        severity: "info",
        name: "Community Access Granted Twice",
        automationName: "Payment → Grant Circle Community Access",
        businessImpact:
          "Students are being added to your Circle community by both this Zap and your Teachable-Circle native integration. No harm done — Circle deduplicates — but you're using unnecessary Zapier tasks.",
        recommendation:
          "Disable this Zap since the native Teachable-Circle integration handles it. This will save ~45 tasks/month.",
      },
    ],
  },
  {
    id: "infraflow-ops",
    name: "InfraFlow DevOps",
    platform: "n8n",
    scenarioCount: 31,
    industry: "SaaS / DevOps",
    description:
      "Engineering team running 31 self-hosted n8n workflows for CI/CD notifications, incident management, customer onboarding webhooks, and internal tooling.",
    healthScore: 52,
    lastAuditDate: "2026-04-01",
    issues: [
      {
        id: "if-1",
        severity: "critical",
        name: "Self-Hosted Instance Memory Exhaustion",
        automationName: "All Workflows — n8n Worker Process",
        businessImpact:
          "The n8n worker process is consuming 95%+ of available memory, causing the execution queue to back up. OOM kills have silently dropped 23 workflow executions in the last 48 hours — including incident alerts and customer onboarding triggers. Unlike cloud platforms, self-hosted n8n requires manual infrastructure monitoring.",
        recommendation:
          "Set NODE_OPTIONS=--max-old-space-size=4096 in your n8n environment. Enable n8n's queue mode with a dedicated Redis instance to distribute execution load across multiple worker processes. Add a memory usage alert at 80% threshold.",
      },
      {
        id: "if-2",
        severity: "critical",
        name: "Webhook Tunnel Expired",
        automationName: "Inbound Webhooks — GitHub, PagerDuty, Stripe",
        businessImpact:
          "The Cloudflare tunnel exposing your n8n webhook endpoint expired 18 hours ago. All inbound webhooks from GitHub (deploy notifications), PagerDuty (incident routing), and Stripe (payment events) are returning 502. External services are retrying but will stop after 72 hours — you have ~54 hours before data is permanently lost.",
        recommendation:
          "Restart the Cloudflare tunnel immediately with cloudflared service install to run as a persistent system service with auto-reconnect. Migrate away from ngrok to a permanent tunnel solution. After restoring, check each service's webhook delivery logs for failed events and replay them.",
      },
      {
        id: "if-3",
        severity: "critical",
        name: "PostgreSQL Connection Pool Saturated",
        automationName: "All Workflows — Database Backend",
        businessImpact:
          "n8n's database connection pool (configured at default of 10) is fully exhausted. New workflow executions are timing out waiting for database connections. The execution history shows 47 'connection timeout' errors in the last 24 hours. Workflows appear to start but silently fail when they can't persist execution data.",
        recommendation:
          "Increase DB_POSTGRESDB_POOL_SIZE to 25 in your n8n environment config. For a long-term fix, add PgBouncer as a connection pooler between n8n and PostgreSQL. Also check for long-running transactions that may be holding connections open unnecessarily.",
      },
      {
        id: "if-4",
        severity: "warning",
        name: "Credential Encryption Key Rotation Overdue",
        automationName: "Security — N8N_ENCRYPTION_KEY",
        businessImpact:
          "Your N8N_ENCRYPTION_KEY hasn't been rotated in 11 months. All stored credentials — API keys, OAuth tokens, database passwords — are encrypted with this key. If compromised, every integration credential in your n8n instance is exposed. Security policy requires rotation every 90 days.",
        recommendation:
          "Generate a new encryption key, export all credentials, update N8N_ENCRYPTION_KEY in your environment, and re-import credentials. Schedule this as a quarterly maintenance task. Consider storing the key in a secrets manager like Vault or AWS Secrets Manager.",
      },
      {
        id: "if-5",
        severity: "warning",
        name: "Deprecated HTTP Request Node v1",
        automationName: "8 Workflows Using Legacy Nodes",
        businessImpact:
          "Eight workflows still use the deprecated HTTP Request node v1 which lacks retry logic, proper timeout handling, and pagination support. These workflows fail silently on transient network errors — your Slack notification workflow alone has had 12 unretried failures this month. n8n v1.30+ ships HTTP Request v4 with built-in retry and backoff.",
        recommendation:
          "Replace HTTP Request v1 nodes with v4 in all 8 workflows. Start with the Slack notification and PagerDuty workflows since those are most failure-sensitive. The v4 node has a migration path — copy the URL and headers, then configure retry on 429/5xx responses.",
      },
      {
        id: "if-6",
        severity: "info",
        name: "Unused Community Node Installed",
        automationName: "n8n-nodes-carbonejs — Document Generation",
        businessImpact:
          "A community node for document generation (n8n-nodes-carbonejs) was installed 5 months ago and is not used in any active workflow. Community nodes increase the attack surface — they run with full n8n permissions, aren't audited by the n8n team, and can break during version upgrades.",
        recommendation:
          "Remove the unused community node via n8n Settings → Community Nodes → Uninstall. Audit all installed community nodes quarterly — only keep nodes actively used in production workflows.",
      },
      {
        id: "if-7",
        severity: "info",
        name: "Execution Data Retention Unbounded",
        automationName: "n8n Database — Execution History",
        businessImpact:
          "EXECUTIONS_DATA_MAX_AGE is not configured. Your execution history table has grown to 2.3 million rows (14 GB), progressively slowing down the n8n UI, increasing database backup times, and consuming disk space. The execution list page now takes 8+ seconds to load.",
        recommendation:
          "Set EXECUTIONS_DATA_MAX_AGE=168 (7 days) in your n8n environment to auto-prune old execution data. For compliance, export execution logs to an external logging service before enabling pruning. Run a one-time cleanup: DELETE FROM execution_entity WHERE \"startedAt\" < NOW() - INTERVAL '30 days'.",
      },
    ],
  },
];

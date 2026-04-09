# FlowCheck

FlowCheck is an AI-powered automation health monitoring tool that audits Zapier, Make.com, and n8n workflows, detects silent failures, and delivers actionable diagnostic reports.

## What It Does

- **Monitors automation workflows** across Zapier, Make.com, and n8n platforms
- **Detects silent failures** — expired credentials, broken webhooks, empty field mappings, infrastructure issues
- **Generates AI diagnostic reports** using Claude to analyze issues and prioritize fixes
- **Scores automation health** on a 0-100 scale with severity-based issue tracking (critical, warning, info)

## Demo

The landing page includes four sample company profiles with real-world automation issues:

| Profile | Platform | Health | Industry | Key Issue |
|---------|----------|--------|----------|-----------|
| Coastal Content Agency | Zapier | 34/100 (Critical) | Marketing | Invoice generation down 19 days |
| InfraFlow DevOps | n8n | 52/100 (Warning) | SaaS / DevOps | Webhook tunnel expired, DB pool saturated |
| GreenLeaf Commerce | Make.com | 62/100 (Warning) | E-commerce | Post-purchase emails broken 14 days |
| Creator Stack | Zapier | 91/100 (Excellent) | Education | Minor API rate limit concern |

Each profile links to a dashboard with a full AI-generated diagnostic narrative.

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **UI Components:** shadcn/ui
- **AI:** Anthropic Claude API (Claude Sonnet)
- **Analytics:** PostHog
- **Icons:** Lucide React

## Getting Started

### Prerequisites

- Node.js 18+
- npm, yarn, pnpm, or bun

### Installation

```bash
git clone https://github.com/ui-d/flowcheck.git
cd flowcheck
npm install
```

### Environment Variables

Create a `.env.local` file:

```env
ANTHROPIC_API_KEY=your-api-key-here
```

The app works without an API key by falling back to pre-generated diagnostic narratives.

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
src/
├── app/
│   ├── api/diagnostic/    # AI diagnostic endpoint (Claude API)
│   ├── dashboard/[profileId]/  # Per-profile dashboard pages
│   └── page.tsx           # Landing page
├── components/
│   ├── landing/           # Landing page sections
│   ├── dashboard/         # Dashboard components
│   └── ui/                # shadcn/ui primitives
├── data/                  # Sample company profiles
├── hooks/                 # Custom React hooks
└── lib/                   # Types, utilities, profile helpers
```

## License

MIT

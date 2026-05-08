import Link from "next/link";

function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.95v5.66H9.36V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zM7.12 20.45H3.56V9h3.56v11.45zM22.23 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.46c.98 0 1.77-.77 1.77-1.72V1.72C24 .77 23.21 0 22.23 0z" />
    </svg>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-border/50">
      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <Link href="/" className="text-lg font-bold tracking-tight">
            run<span className="text-muted-foreground">mend</span>
          </Link>

          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <Link href="/#how-it-works" className="hover:text-foreground transition-colors">
              How it works
            </Link>
            <Link href="/#features" className="hover:text-foreground transition-colors">
              Features
            </Link>
            <Link href="/pricing" className="hover:text-foreground transition-colors">
              Pricing
            </Link>
            <Link href="/vs-claude-cowork" className="hover:text-foreground transition-colors">
              vs. Claude
            </Link>
            <Link href="/#demo" className="hover:text-foreground transition-colors">
              Demo
            </Link>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-border/50 space-y-2 text-xs text-muted-foreground/50">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
            <p>Runmend — Production monitoring for Make.com &amp; n8n agencies</p>
            <p className="flex items-center gap-1.5">
              <span>
                Built by{" "}
                <span className="text-muted-foreground/80">Dawid Nawrocki</span>
              </span>
              <Link
                href="https://linkedin.com/in/dawid-nawrocki"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Dawid Nawrocki on LinkedIn"
                className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
              >
                <LinkedInIcon className="h-3 w-3" />
                LinkedIn
              </Link>
            </p>
          </div>
          <p className="text-center sm:text-right text-muted-foreground/40">
            Senior Growth / GTM Engineer → TypeScript, Next.js, Claude Agent SDK, MCP | Revenue Systems for B2B SaaS
          </p>
        </div>
      </div>
    </footer>
  );
}

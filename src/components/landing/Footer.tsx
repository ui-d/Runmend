import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-border/50">
      <div className="max-w-6xl mx-auto px-4 py-10">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <Link href="/" className="text-lg font-bold tracking-tight">
            run<span className="text-muted-foreground">mend</span>
          </Link>

          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#how-it-works" className="hover:text-foreground transition-colors">
              How it works
            </a>
            <a href="#features" className="hover:text-foreground transition-colors">
              Features
            </a>
            <a href="#demo" className="hover:text-foreground transition-colors">
              Demo
            </a>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-border/50 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground/50">
          <p>Runmend — Automation health monitoring for Make.com &amp; n8n</p>
          <p>Built with Next.js and Claude</p>
        </div>
      </div>
    </footer>
  );
}

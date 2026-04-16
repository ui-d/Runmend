import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { UserMenu } from "@/components/auth/UserMenu";
import type { User } from "@supabase/supabase-js";

async function getAuthState(): Promise<{
  user: User | null;
  fullName: string | null;
}> {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return { user: null, fullName: null };
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    let fullName: string | null = null;
    if (user) {
      const { data: profile } = await supabase
        .from("users")
        .select("full_name")
        .eq("id", user.id)
        .single();
      fullName = profile?.full_name ?? null;
    }

    return { user, fullName };
  } catch {
    return { user: null, fullName: null };
  }
}

export async function Navbar() {
  const { user, fullName } = await getAuthState();

  return (
    <nav className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-lg">
      <div className="max-w-6xl mx-auto flex items-center justify-between px-4 h-14">
        <Link href="/" className="text-lg font-bold tracking-tight">
          run<span className="text-muted-foreground">mend</span>
        </Link>

        <div className="hidden sm:flex items-center gap-6 text-sm text-muted-foreground">
          <Link href="/#how-it-works" className="hover:text-foreground transition-colors">
            How it works
          </Link>
          <Link href="/#features" className="hover:text-foreground transition-colors">
            Features
          </Link>
          <Link href="/pricing" className="hover:text-foreground transition-colors">
            Pricing
          </Link>
          <Link href="/#demo" className="hover:text-foreground transition-colors">
            Demo
          </Link>
        </div>

        {user ? (
          <div className="flex items-center gap-3">
            <Link
              href="/app"
              className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground text-sm font-medium h-8 px-3 hover:bg-primary/90 transition-colors"
            >
              Dashboard
            </Link>
            <UserMenu email={user.email ?? ""} fullName={fullName} />
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground text-sm font-medium h-8 px-3 hover:bg-primary/90 transition-colors"
            >
              Get started
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}

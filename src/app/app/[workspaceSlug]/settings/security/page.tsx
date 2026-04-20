import { redirect } from "next/navigation";
import { Fingerprint, FileClock } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { SectionHeader } from "@/components/app/settings/SectionHeader";
import { ComingSoonInline } from "@/components/app/settings/ComingSoonInline";

function formatDateTime(iso: string | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default async function SecuritySettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <section className="space-y-6">
      <SectionHeader
        title="Security"
        description="Session details and account safety."
      />

      <div className="rounded-2xl border border-border/60 bg-card/40 p-5 space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/70">
              Sign-in email
            </p>
            <p className="mt-1 text-sm">{user.email}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/70">
              Last sign-in
            </p>
            <p className="mt-1 text-sm">
              {formatDateTime(user.last_sign_in_at ?? undefined)}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <ComingSoonInline
          icon={Fingerprint}
          title="Two-factor authentication"
          description="Require a TOTP code on every sign-in. Recovery codes, authenticator-app support, and optional SMS fallback."
        />
        <ComingSoonInline
          icon={FileClock}
          title="Audit log"
          description="Trace every workspace change — who renamed a profile, who connected a platform, who acknowledged an alert."
        />
      </div>
    </section>
  );
}

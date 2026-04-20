import { notFound, redirect } from "next/navigation";
import { Mail, UserPlus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceBySlug, getWorkspaceMembers } from "@/lib/queries/workspaces";
import { SectionHeader } from "@/components/app/settings/SectionHeader";
import { cn } from "@/lib/utils";

interface PageProps {
  params: Promise<{ workspaceSlug: string }>;
}

const ROLE_STYLE: Record<string, string> = {
  owner: "border-emerald-500/40 bg-emerald-500/10 text-emerald-400",
  admin: "border-sky-500/40 bg-sky-500/10 text-sky-400",
  member: "border-border/60 bg-muted/40 text-muted-foreground",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default async function TeamSettingsPage({ params }: PageProps) {
  const { workspaceSlug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const workspace = await getWorkspaceBySlug(supabase, workspaceSlug);
  if (!workspace) notFound();

  const members = await getWorkspaceMembers(supabase, workspace.id);

  return (
    <section className="space-y-6">
      <SectionHeader
        title="Team"
        description="People with access to this workspace."
        action={
          <span className="rounded-full border border-border/60 bg-muted/40 px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
            {members.length} {members.length === 1 ? "member" : "members"}
          </span>
        }
      />

      <div className="overflow-hidden rounded-2xl border border-border/60 bg-card/40">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/60 bg-muted/20 text-muted-foreground">
              <th className="px-4 py-3 text-left font-medium">Name</th>
              <th className="px-4 py-3 text-left font-medium">Email</th>
              <th className="px-4 py-3 text-left font-medium">Role</th>
              <th className="px-4 py-3 text-left font-medium">Joined</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => {
              const isYou = m.user_id === user.id;
              const roleStyle = ROLE_STYLE[m.role] ?? ROLE_STYLE.member;
              const displayName = m.full_name?.trim() || "—";
              return (
                <tr
                  key={m.user_id}
                  className="border-b border-border/60 last:border-0"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{displayName}</span>
                      {isYou && (
                        <span className="rounded-full border border-border/60 bg-muted/40 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                          You
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{m.email}</td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "inline-flex rounded-full border px-2 py-0.5 text-xs font-medium capitalize",
                        roleStyle
                      )}
                    >
                      {m.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatDate(m.created_at)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Invite stub */}
      <div className="rounded-2xl border border-border/60 bg-card/30 p-5">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-md bg-muted/60 p-2">
            <UserPlus className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium">Invite teammates</p>
              <span className="rounded-full border border-border/60 bg-muted/40 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                Coming soon
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Email invitations are on the roadmap. For now, ask teammates to
              sign up with the same email domain and you can share workspaces
              manually.
            </p>
            <div className="flex gap-2 pt-1">
              <div className="relative flex-1 max-w-sm">
                <Mail className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="email"
                  placeholder="name@company.com"
                  disabled
                  className="h-8 w-full rounded-lg border border-input bg-muted/30 pl-8 pr-2.5 text-sm text-muted-foreground placeholder:text-muted-foreground/50 disabled:cursor-not-allowed"
                />
              </div>
              <button
                type="button"
                disabled
                className="h-8 shrink-0 rounded-lg border border-border/60 bg-muted/30 px-3 text-xs font-medium text-muted-foreground disabled:cursor-not-allowed"
              >
                Send invite
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

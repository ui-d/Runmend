import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SectionHeader } from "@/components/app/settings/SectionHeader";
import { AccountForm } from "@/components/app/settings/AccountForm";

interface PageProps {
  params: Promise<{ workspaceSlug: string }>;
}

export default async function AccountSettingsPage({ params }: PageProps) {
  const { workspaceSlug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("full_name")
    .eq("id", user.id)
    .single();

  return (
    <section className="space-y-6">
      <SectionHeader
        title="Account"
        description="Your personal profile across every workspace you belong to."
      />
      <AccountForm
        workspaceSlug={workspaceSlug}
        email={user.email ?? ""}
        initialFullName={profile?.full_name ?? null}
      />
    </section>
  );
}

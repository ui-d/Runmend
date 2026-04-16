import { notFound } from "next/navigation";
import { getProfileById, getAllProfiles } from "@/lib/profiles";
import { DashboardShell } from "@/components/dashboard/DashboardShell";

interface DashboardPageProps {
  params: { profileId: string };
}

export function generateStaticParams() {
  return getAllProfiles().map((p) => ({ profileId: p.id }));
}

export function generateMetadata({ params }: DashboardPageProps) {
  const profile = getProfileById(params.profileId);
  if (!profile) return { title: "Not Found" };

  return {
    title: `${profile.name} Audit`,
    description: `Automation health audit for ${profile.name}. Health score: ${profile.healthScore}/100. View detected issues and AI recommendations.`,
  };
}

export default function DashboardPage({ params }: DashboardPageProps) {
  const profile = getProfileById(params.profileId);
  if (!profile) notFound();

  return <DashboardShell profile={profile} />;
}

import { redirect } from "next/navigation";

interface PageProps {
  params: Promise<{ workspaceSlug: string }>;
}

export default async function ProfilesPage({ params }: PageProps) {
  const { workspaceSlug } = await params;
  redirect(`/app/${workspaceSlug}`);
}

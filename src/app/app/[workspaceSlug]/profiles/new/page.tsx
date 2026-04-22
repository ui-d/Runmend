import { redirect } from "next/navigation";

interface PageProps {
  params: Promise<{ workspaceSlug: string }>;
  searchParams: Promise<{ connectionId?: string | string[] }>;
}

export default async function NewProfileRedirect({
  params,
  searchParams,
}: PageProps) {
  const { workspaceSlug } = await params;
  const { connectionId: rawConnectionId } = await searchParams;
  const connectionId = Array.isArray(rawConnectionId)
    ? rawConnectionId[0]
    : rawConnectionId;

  const qs = new URLSearchParams({ new: "1" });
  if (connectionId) qs.set("connectionId", connectionId);

  redirect(`/app/${workspaceSlug}/profiles?${qs.toString()}`);
}

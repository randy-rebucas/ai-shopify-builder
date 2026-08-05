import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { AcceptInviteClient } from "./accept-invite-client";

export default async function TeamAcceptPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  if (!token) redirect("/dashboard");

  const session = await getSession();
  if (!session) redirect(`/login?redirectTo=${encodeURIComponent(`/team/accept?token=${token}`)}`);

  return <AcceptInviteClient token={token} />;
}

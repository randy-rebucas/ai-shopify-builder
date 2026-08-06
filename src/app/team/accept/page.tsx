import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getSession } from "@/lib/auth";
import { AcceptInviteClient } from "./accept-invite-client";
import { noIndex } from "@/lib/seo";

export const metadata: Metadata = { title: "Accept team invite", robots: noIndex };

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

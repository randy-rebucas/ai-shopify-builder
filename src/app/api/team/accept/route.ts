import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

const bodySchema = z.object({ token: z.string().min(1) });

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const json = await request.json();
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Missing invite token." }, { status: 400 });

  const invite = await prisma.teamMember.findUnique({ where: { inviteToken: parsed.data.token } });
  if (!invite || invite.status !== "PENDING") {
    return NextResponse.json({ error: "This invite link is invalid or has already been used." }, { status: 400 });
  }

  const user = await prisma.user.findUniqueOrThrow({ where: { id: session.userId }, select: { email: true } });
  if (user.email.toLowerCase() !== invite.email.toLowerCase()) {
    return NextResponse.json({ error: `This invite was sent to ${invite.email} — log in with that account to accept it.` }, { status: 403 });
  }

  // A user can only be an active member of one team at a time — accepting a new invite means
  // leaving whichever team (if any) they already belonged to.
  await prisma.teamMember.updateMany({
    where: { userId: session.userId, status: "ACTIVE" },
    data: { status: "REMOVED", userId: null },
  });

  const accepted = await prisma.teamMember.update({
    where: { id: invite.id },
    data: { status: "ACTIVE", userId: session.userId, acceptedAt: new Date() },
  });

  return NextResponse.json({ ok: true, ownerId: accepted.ownerId });
}

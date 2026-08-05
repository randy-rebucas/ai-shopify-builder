import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { canInviteTeamMember } from "@/lib/usage";
import { isRateLimited } from "@/lib/rate-limit";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const members = await prisma.teamMember.findMany({
    where: { ownerId: session.userId, status: { in: ["PENDING", "ACTIVE"] } },
    orderBy: { invitedAt: "desc" },
    select: { id: true, email: true, status: true, invitedAt: true, acceptedAt: true },
  });

  return NextResponse.json(members);
}

const bodySchema = z.object({ email: z.string().email() });

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (isRateLimited(`team-invite:${session.userId}`, 10, 60_000)) {
    return NextResponse.json({ error: "Too many invites. Try again in a minute." }, { status: 429 });
  }

  const json = await request.json();
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  const email = parsed.data.email.toLowerCase().trim();

  const owner = await prisma.user.findUniqueOrThrow({ where: { id: session.userId }, select: { email: true } });
  if (email === owner.email.toLowerCase()) {
    return NextResponse.json({ error: "You can't invite yourself." }, { status: 400 });
  }

  const eligibility = await canInviteTeamMember(session.userId);
  if (!eligibility.allowed) {
    return NextResponse.json({ error: eligibility.reason, code: "PLAN_LIMIT" }, { status: 403 });
  }

  const existing = await prisma.teamMember.findUnique({ where: { ownerId_email: { ownerId: session.userId, email } } });
  if (existing && existing.status !== "REMOVED") {
    return NextResponse.json({ error: "That person has already been invited." }, { status: 409 });
  }

  const inviteToken = randomBytes(24).toString("base64url");
  const member = existing
    ? await prisma.teamMember.update({
        where: { id: existing.id },
        data: { status: "PENDING", inviteToken, invitedAt: new Date(), acceptedAt: null, userId: null },
      })
    : await prisma.teamMember.create({ data: { ownerId: session.userId, email, inviteToken } });

  return NextResponse.json({
    id: member.id,
    email: member.email,
    status: member.status,
    inviteUrl: new URL(`/team/accept?token=${inviteToken}`, request.nextUrl.origin).toString(),
  });
}

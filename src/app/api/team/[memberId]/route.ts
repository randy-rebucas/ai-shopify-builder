import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function DELETE(_request: NextRequest, ctx: { params: Promise<{ memberId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { memberId } = await ctx.params;
  const member = await prisma.teamMember.findFirst({ where: { id: memberId, ownerId: session.userId } });
  if (!member) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.teamMember.update({ where: { id: memberId }, data: { status: "REMOVED", userId: null } });

  return NextResponse.json({ ok: true });
}

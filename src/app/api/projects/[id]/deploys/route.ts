import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { canViewBuildHistory } from "@/lib/usage";
import { findAccessibleProject } from "@/lib/project-access";

export async function GET(_request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const project = await findAccessibleProject(session.userId, id);
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const eligibility = await canViewBuildHistory(project.userId);
  if (!eligibility.allowed) {
    return NextResponse.json({ error: eligibility.reason, code: "PLAN_LIMIT" }, { status: 403 });
  }

  const attempts = await prisma.deployAttempt.findMany({
    where: { projectId: id },
    orderBy: { startedAt: "desc" },
    take: 50,
  });

  return NextResponse.json(attempts);
}

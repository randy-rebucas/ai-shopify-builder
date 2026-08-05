import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { canViewVersionHistory } from "@/lib/usage";
import type { GenerationPlan } from "@/lib/ai/generate";
import { findAccessibleProject } from "@/lib/project-access";

export async function GET(_request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const project = await findAccessibleProject(session.userId, id);
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const eligibility = await canViewVersionHistory(project.userId);
  if (!eligibility.allowed) {
    return NextResponse.json({ error: eligibility.reason, code: "PLAN_LIMIT" }, { status: 403 });
  }

  const versions = await prisma.generatedApp.findMany({
    where: { projectId: id },
    orderBy: { createdAt: "desc" },
    select: { id: true, plan: true, files: true, createdAt: true },
  });

  return NextResponse.json(
    versions.map((v, i) => ({
      id: v.id,
      createdAt: v.createdAt,
      summary: (v.plan as unknown as GenerationPlan)?.summary ?? "Generated app",
      fileCount: Array.isArray(v.files) ? v.files.length : 0,
      isCurrent: i === 0,
    })),
  );
}

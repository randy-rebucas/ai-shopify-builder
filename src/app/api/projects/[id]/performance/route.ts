import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { canUsePerformanceAnalysis } from "@/lib/usage";
import { analyzePerformance, type GeneratedFile } from "@/lib/ai/generate";
import { isRateLimited } from "@/lib/rate-limit";
import { findAccessibleProject } from "@/lib/project-access";

export async function POST(_request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (isRateLimited(`performance:${session.userId}`, 10, 60_000)) {
    return NextResponse.json({ error: "Too many requests. Try again in a minute." }, { status: 429 });
  }

  const { id } = await ctx.params;
  const project = await findAccessibleProject(session.userId, id);
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const eligibility = await canUsePerformanceAnalysis(project.userId);
  if (!eligibility.allowed) {
    return NextResponse.json({ error: eligibility.reason, code: "PLAN_LIMIT" }, { status: 403 });
  }

  const latestApp = await prisma.generatedApp.findFirst({ where: { projectId: id }, orderBy: { createdAt: "desc" } });
  if (!latestApp) return NextResponse.json({ error: "Nothing has been generated yet." }, { status: 400 });

  try {
    const files = latestApp.files as unknown as GeneratedFile[];
    const result = await analyzePerformance(files);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Performance analysis failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

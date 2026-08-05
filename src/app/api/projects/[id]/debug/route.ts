import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { canUseAiDebugger } from "@/lib/usage";
import { fixFromError, type GeneratedFile, type GenerationPlan } from "@/lib/ai/generate";
import { isRateLimited } from "@/lib/rate-limit";
import { findAccessibleProject } from "@/lib/project-access";

const bodySchema = z.object({ error: z.string().min(1).max(8000) });

export async function POST(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (isRateLimited(`debug:${session.userId}`, 10, 60_000)) {
    return NextResponse.json({ error: "Too many debug requests. Try again in a minute." }, { status: 429 });
  }

  const { id } = await ctx.params;
  const project = await findAccessibleProject(session.userId, id);
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const eligibility = await canUseAiDebugger(project.userId);
  if (!eligibility.allowed) {
    return NextResponse.json({ error: eligibility.reason, code: "PLAN_LIMIT" }, { status: 403 });
  }

  const json = await request.json();
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Paste the error you're seeing." }, { status: 400 });

  const latestApp = await prisma.generatedApp.findFirst({ where: { projectId: id }, orderBy: { createdAt: "desc" } });
  if (!latestApp) return NextResponse.json({ error: "Nothing has been generated yet." }, { status: 400 });

  try {
    const plan = latestApp.plan as unknown as GenerationPlan;
    const files = latestApp.files as unknown as GeneratedFile[];
    const fix = await fixFromError(plan, files, parsed.data.error, project.name);

    if (!fix.changed) {
      return NextResponse.json({ diagnosis: fix.diagnosis, changed: false });
    }

    const newVersion = await prisma.generatedApp.create({
      data: {
        projectId: id,
        plan: plan as unknown as Prisma.InputJsonValue,
        files: fix.files as unknown as Prisma.InputJsonValue,
      },
    });

    return NextResponse.json({
      diagnosis: fix.diagnosis,
      changed: true,
      versionId: newVersion.id,
      fileCount: fix.files.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Debugging failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

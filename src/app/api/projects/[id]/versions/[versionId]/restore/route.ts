import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { canViewVersionHistory } from "@/lib/usage";
import { findAccessibleProject } from "@/lib/project-access";

export async function POST(_request: NextRequest, ctx: { params: Promise<{ id: string; versionId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, versionId } = await ctx.params;
  const project = await findAccessibleProject(session.userId, id);
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const eligibility = await canViewVersionHistory(project.userId);
  if (!eligibility.allowed) {
    return NextResponse.json({ error: eligibility.reason, code: "PLAN_LIMIT" }, { status: 403 });
  }

  const version = await prisma.generatedApp.findFirst({ where: { id: versionId, projectId: id } });
  if (!version) return NextResponse.json({ error: "Version not found" }, { status: 404 });

  // Restoring clones the old version as a new, current GeneratedApp row rather than mutating or
  // deleting anything — the history stays intact and a restore is itself just another version.
  const restored = await prisma.generatedApp.create({
    data: {
      projectId: id,
      plan: version.plan as Prisma.InputJsonValue,
      files: version.files as Prisma.InputJsonValue,
    },
  });

  await prisma.project.update({ where: { id }, data: { status: "READY" } });

  return NextResponse.json({ id: restored.id, createdAt: restored.createdAt });
}

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { canCreateProject } from "@/lib/usage";
import { listAccessibleProjects, resolveWorkspaceOwnerId } from "@/lib/project-access";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const projects = await listAccessibleProjects(session.userId);
  return NextResponse.json(projects);
}

const bodySchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const json = await request.json();
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const ownerId = await resolveWorkspaceOwnerId(session.userId);
  const eligibility = await canCreateProject(ownerId);
  if (!eligibility.allowed) {
    return NextResponse.json({ error: eligibility.reason, code: "PLAN_LIMIT" }, { status: 403 });
  }

  const project = await prisma.project.create({
    data: { ...parsed.data, userId: ownerId },
  });
  return NextResponse.json(project, { status: 201 });
}

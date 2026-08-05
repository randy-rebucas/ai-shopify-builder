import { prisma } from "@/lib/db";
import type { Project } from "@/generated/prisma/client";

// Team members don't get their own separate billing plan or project quota — they share the
// owner's (the paying workspace's) existing projects. This resolves "which User's plan/limits
// should apply" for the acting user: their own, unless they're an active member of someone else's
// team, in which case it's that owner's.
export async function resolveWorkspaceOwnerId(userId: string): Promise<string> {
  const membership = await prisma.teamMember.findFirst({
    where: { userId, status: "ACTIVE" },
    select: { ownerId: true },
  });
  return membership?.ownerId ?? userId;
}

/** All owner ids whose projects this user can see: themselves, plus any team they're an active member of. */
export async function getAccessibleOwnerIds(userId: string): Promise<string[]> {
  const memberships = await prisma.teamMember.findMany({
    where: { userId, status: "ACTIVE" },
    select: { ownerId: true },
  });
  return [userId, ...memberships.map((m) => m.ownerId)];
}

export async function findAccessibleProject(userId: string, projectId: string): Promise<Project | null> {
  const ownerIds = await getAccessibleOwnerIds(userId);
  return prisma.project.findFirst({ where: { id: projectId, userId: { in: ownerIds } } });
}

export async function listAccessibleProjects(userId: string) {
  const ownerIds = await getAccessibleOwnerIds(userId);
  return prisma.project.findMany({ where: { userId: { in: ownerIds } }, orderBy: { updatedAt: "desc" } });
}

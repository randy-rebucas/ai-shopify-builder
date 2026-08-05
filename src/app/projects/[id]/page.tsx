import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isDeployConfigured } from "@/lib/deploy";
import { findAccessibleProject } from "@/lib/project-access";
import { Workspace } from "./workspace";

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { id } = await params;
  const [project, user] = await Promise.all([
    findAccessibleProject(session.userId, id),
    prisma.user.findUnique({ where: { id: session.userId }, select: { name: true, email: true } }),
  ]);
  if (!project) notFound();

  const messages = await prisma.chatMessage.findMany({
    where: { projectId: id },
    orderBy: { createdAt: "asc" },
  });

  const latestApp = await prisma.generatedApp.findFirst({
    where: { projectId: id },
    orderBy: { createdAt: "desc" },
  });

  const deploymentConfig = await prisma.deploymentConfig.findUnique({ where: { projectId: id } });

  return (
    <Workspace
      project={{
        id: project.id,
        name: project.name,
        description: project.description,
        status: project.status,
        githubRepoFullName: project.githubRepoFullName,
        githubRepoUrl: project.githubRepoUrl,
      }}
      user={{ name: user?.name ?? null, email: user?.email ?? session.email }}
      initialDeployment={{
        appVersion: deploymentConfig?.appVersion ?? "0.1.0",
        shopifyOrgId: deploymentConfig?.shopifyOrgId ?? null,
        hasShopifyPartnerToken: !!deploymentConfig?.shopifyPartnerTokenCiphertext,
        hostingProvider: deploymentConfig?.hostingProvider ?? null,
        hasHostingToken: !!deploymentConfig?.hostingTokenCiphertext,
      }}
      initialInstall={{
        status: deploymentConfig?.installStatus ?? "NONE",
        shopDomain: deploymentConfig?.shopifyShopDomain ?? null,
        grantedScopes: deploymentConfig?.shopifyGrantedScopes ?? null,
        installedAt: deploymentConfig?.installedAt?.toISOString() ?? null,
        error: deploymentConfig?.installError ?? null,
      }}
      initialDeploy={{
        available: isDeployConfigured(),
        status: deploymentConfig?.deployStatus ?? "NONE",
        url: deploymentConfig?.deployedUrl ?? null,
        deployedAt: deploymentConfig?.deployedAt?.toISOString() ?? null,
        error: deploymentConfig?.deployError ?? null,
      }}
      initialMessages={messages.map((m) => ({ id: m.id, role: m.role, content: m.content }))}
      initialFiles={
        latestApp ? (latestApp.files as unknown as { path: string; content: string }[]) : null
      }
      initialPlan={
        latestApp
          ? (latestApp.plan as unknown as {
              summary: string;
              features: string[];
              dataModels: { name: string; fields: string[] }[];
              shopifyApis: string[];
              logoUrl?: string;
            })
          : null
      }
    />
  );
}

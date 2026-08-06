import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCheckoutSession, isPaymongoConfigured } from "@/lib/paymongo";
import { AdminUserDetail, type AdminUserDetailData } from "@/components/admin-user-detail";

export default async function AdminUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      projects: { orderBy: { updatedAt: "desc" }, take: 20 },
      marketplacePurchases: { orderBy: { createdAt: "desc" }, take: 20 },
    },
  });
  if (!user) notFound();

  const deployAttempts = await prisma.deployAttempt.findMany({
    where: { project: { userId: id } },
    orderBy: { startedAt: "desc" },
    take: 20,
    include: { project: { select: { name: true } } },
  });

  let payment: AdminUserDetailData["payment"] = null;
  if (user.paymongoCheckoutSessionId && isPaymongoConfigured()) {
    try {
      const session = await getCheckoutSession(user.paymongoCheckoutSessionId);
      payment = {
        status: session.attributes.status,
        paymentIntentStatus: session.attributes.payment_intent?.attributes.status ?? null,
      };
    } catch {
      payment = "unavailable";
    }
  } else if (user.paymongoCheckoutSessionId) {
    payment = "unavailable";
  }

  const data: AdminUserDetailData = {
    id: user.id,
    email: user.email,
    name: user.name,
    plan: user.plan,
    aiCreditsUsed: user.aiCreditsUsed,
    planExpiresAt: user.planExpiresAt ? user.planExpiresAt.toISOString() : null,
    createdAt: user.createdAt.toISOString(),
    projects: user.projects.map((p) => ({
      id: p.id,
      name: p.name,
      status: p.status,
      updatedAt: p.updatedAt.toISOString(),
    })),
    deployAttempts: deployAttempts.map((d) => ({
      id: d.id,
      status: d.status,
      url: d.url,
      startedAt: d.startedAt.toISOString(),
      projectName: d.project.name,
    })),
    marketplacePurchases: user.marketplacePurchases.map((p) => ({
      id: p.id,
      amountCents: p.amountCents,
      status: p.status,
      createdAt: p.createdAt.toISOString(),
    })),
    payment,
  };

  return (
    <div className="pt-10">
      <h1 className="text-2xl font-semibold tracking-tight text-black">{user.name || user.email}</h1>
      <p className="mt-1 text-sm text-black/50">{user.email}</p>

      <div className="mt-8">
        <AdminUserDetail user={data} />
      </div>
    </div>
  );
}

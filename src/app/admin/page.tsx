import { prisma } from "@/lib/db";

function StatCard({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium text-black/50">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight text-black">{value}</p>
      {hint && <p className="mt-1 text-xs text-black/40">{hint}</p>}
    </div>
  );
}

export default async function AdminOverviewPage() {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [
    planCounts,
    totalUsers,
    expiredPaidCount,
    activePaidCount,
    creditsAgg,
    signups7d,
    signups30d,
    deployCounts,
    purchaseAgg,
  ] = await Promise.all([
    prisma.user.groupBy({ by: ["plan"], _count: true }),
    prisma.user.count(),
    prisma.user.count({
      where: { plan: { notIn: ["FREE", "ENTERPRISE"] }, planExpiresAt: { lte: now } },
    }),
    prisma.user.count({
      where: { plan: { notIn: ["FREE", "ENTERPRISE"] }, planExpiresAt: { gt: now } },
    }),
    prisma.user.aggregate({ _sum: { aiCreditsUsed: true }, _avg: { aiCreditsUsed: true } }),
    prisma.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
    prisma.user.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
    prisma.deployAttempt.groupBy({ by: ["status"], _count: true }),
    prisma.marketplacePurchase.aggregate({
      where: { status: "PAID" },
      _count: true,
      _sum: { amountCents: true },
    }),
  ]);

  const planCountMap = Object.fromEntries(planCounts.map((p) => [p.plan, p._count]));

  return (
    <div className="pt-10">
      <h1 className="text-2xl font-semibold tracking-tight text-black">Overview</h1>
      <p className="mt-1 text-sm text-black/50">Users, subscriptions, and payment activity.</p>

      <section className="mt-8">
        <h2 className="text-sm font-semibold text-black">Users by plan</h2>
        <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {(["FREE", "STARTER", "PROFESSIONAL", "AGENCY", "ENTERPRISE"] as const).map((tier) => (
            <StatCard key={tier} label={tier} value={planCountMap[tier] ?? 0} />
          ))}
        </div>
      </section>

      <section className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total users" value={totalUsers} />
        <StatCard label="Active paid subscriptions" value={activePaidCount} />
        <StatCard label="Expired paid subscriptions" value={expiredPaidCount} hint="Not yet swept back to Free" />
        <StatCard label="Signups (7d / 30d)" value={`${signups7d} / ${signups30d}`} />
        <StatCard label="AI credits used (total)" value={creditsAgg._sum.aiCreditsUsed ?? 0} />
        <StatCard
          label="AI credits used (avg/user)"
          value={Math.round(creditsAgg._avg.aiCreditsUsed ?? 0)}
        />
        <StatCard
          label="Marketplace revenue"
          value={`$${((purchaseAgg._sum.amountCents ?? 0) / 100).toFixed(2)}`}
          hint={`${purchaseAgg._count} paid purchases`}
        />
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-semibold text-black">Recent deploy attempts by status</h2>
        <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {deployCounts.length === 0 ? (
            <p className="text-sm text-black/40">No deploy attempts yet.</p>
          ) : (
            deployCounts.map((d) => <StatCard key={d.status} label={d.status} value={d._count} />)
          )}
        </div>
      </section>
    </div>
  );
}

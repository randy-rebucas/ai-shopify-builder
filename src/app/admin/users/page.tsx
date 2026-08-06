import { prisma } from "@/lib/db";
import { AdminUsersTable } from "@/components/admin-users-table";

export default async function AdminUsersPage() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      id: true,
      email: true,
      name: true,
      plan: true,
      aiCreditsUsed: true,
      planExpiresAt: true,
      createdAt: true,
      _count: { select: { projects: true } },
    },
  });

  return (
    <div className="pt-10">
      <h1 className="text-2xl font-semibold tracking-tight text-black">Users</h1>
      <p className="mt-1 text-sm text-black/50">Most recent 200 signups. Search or filter by plan.</p>

      <div className="mt-8">
        <AdminUsersTable
          users={users.map((u) => ({
            id: u.id,
            email: u.email,
            name: u.name,
            plan: u.plan,
            aiCreditsUsed: u.aiCreditsUsed,
            planExpiresAt: u.planExpiresAt ? u.planExpiresAt.toISOString() : null,
            createdAt: u.createdAt.toISOString(),
            projectCount: u._count.projects,
          }))}
        />
      </div>
    </div>
  );
}

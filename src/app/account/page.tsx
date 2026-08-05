import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Logo } from "@/components/logo";
import { PLAN_LIMITS } from "@/lib/plans";
import { getProjectCount, getConnectedStoreCount, getEffectivePlan } from "@/lib/usage";
import { ProfileForm } from "./profile-form";
import { CancelSubscriptionButton } from "./cancel-subscription-button";
import { TeamPanel } from "./team-panel";
import { CreatorPanel } from "./creator-panel";

const MIN_PAYOUT_CENTS = Number(process.env.MARKETPLACE_MIN_PAYOUT_CENTS ?? 50_000);

export default async function AccountPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      name: true,
      email: true,
      createdAt: true,
      aiCreditsUsed: true,
      planExpiresAt: true,
      creatorBalanceCents: true,
    },
  });
  if (!user) redirect("/login");

  const [projectCount, storeCount, effectivePlan, ownedMembers, membership, myListings, myPayouts] = await Promise.all([
    getProjectCount(session.userId),
    getConnectedStoreCount(session.userId),
    getEffectivePlan(session.userId),
    prisma.teamMember.findMany({
      where: { ownerId: session.userId, status: { in: ["PENDING", "ACTIVE"] } },
      orderBy: { invitedAt: "desc" },
      select: { id: true, email: true, status: true, invitedAt: true, acceptedAt: true },
    }),
    prisma.teamMember.findFirst({
      where: { userId: session.userId, status: "ACTIVE" },
      select: { owner: { select: { email: true, name: true } } },
    }),
    prisma.marketplaceListing.findMany({
      where: { creatorId: session.userId, status: { in: ["PUBLISHED", "UNLISTED"] } },
      orderBy: { createdAt: "desc" },
      select: { id: true, title: true, category: true, priceCents: true, status: true },
    }),
    prisma.creatorPayout.findMany({
      where: { creatorId: session.userId },
      orderBy: { requestedAt: "desc" },
      select: { id: true, amountCents: true, status: true, requestedAt: true, paidAt: true },
    }),
  ]);
  const limits = PLAN_LIMITS[effectivePlan];

  return (
    <div className="min-h-screen bg-gradient-to-b from-black/[0.03] to-transparent">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-4 py-6">
        <Link href="/dashboard">
          <Logo />
        </Link>
        <Link
          href="/dashboard"
          className="flex items-center gap-1.5 text-sm text-black/50 transition hover:text-black"
        >
          <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5" aria-hidden>
            <path d="M9.5 3.5 5 8l4.5 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back to dashboard
        </Link>
      </header>

      <main className="mx-auto max-w-3xl px-4 pb-20">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight">Your profile</h1>
          <p className="mt-1 text-sm text-black/50">Manage your name, email, and password.</p>
        </div>

        <div className="mb-8 rounded-2xl border border-black/10 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-black/40">Current plan</p>
              <p className="mt-1 text-lg font-semibold tracking-tight">{limits.label}</p>
              {effectivePlan !== "FREE" && user.planExpiresAt && (
                <p className="mt-0.5 text-xs text-black/45">
                  Active until {user.planExpiresAt.toLocaleDateString()}
                </p>
              )}
            </div>
            {effectivePlan !== "FREE" && effectivePlan !== "ENTERPRISE" ? (
              <CancelSubscriptionButton />
            ) : (
              <Link
                href="/pricing"
                className="rounded-full border border-black/10 px-4 py-2 text-sm font-medium transition hover:bg-black/[0.03]"
              >
                Upgrade
              </Link>
            )}
          </div>
          <dl className="mt-5 grid grid-cols-1 gap-4 border-t border-black/10 pt-5 sm:grid-cols-3">
            <div>
              <dt className="text-xs text-black/45">Projects</dt>
              <dd className="mt-0.5 text-sm font-medium">
                {projectCount}
                {limits.maxProjects !== null ? ` / ${limits.maxProjects}` : ""}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-black/45">Shopify stores</dt>
              <dd className="mt-0.5 text-sm font-medium">
                {storeCount}
                {limits.maxStores !== null ? ` / ${limits.maxStores}` : ""}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-black/45">AI credits this month</dt>
              <dd className="mt-0.5 text-sm font-medium">
                {user.aiCreditsUsed}
                {limits.aiCreditsPerMonth !== null ? ` / ${limits.aiCreditsPerMonth}` : ""}
              </dd>
            </div>
          </dl>
        </div>

        <div className="mb-8 rounded-2xl border border-black/10 p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-black/40">Support</p>
          {limits.prioritySupport ? (
            <>
              <p className="mt-1 text-sm text-black/70">
                Your {limits.label} plan includes priority support — expect a faster response than standard email
                support.
              </p>
              <a
                href="mailto:priority-support@aishopifybuilder.com"
                className="mt-3 inline-flex h-9 items-center justify-center rounded-full border border-black/10 px-4 text-xs font-medium transition hover:bg-black/[0.03]"
              >
                Email priority-support@aishopifybuilder.com
              </a>
            </>
          ) : limits.emailSupport ? (
            <>
              <p className="mt-1 text-sm text-black/70">
                Your {limits.label} plan includes email support.
              </p>
              <a
                href="mailto:support@aishopifybuilder.com"
                className="mt-3 inline-flex h-9 items-center justify-center rounded-full border border-black/10 px-4 text-xs font-medium transition hover:bg-black/[0.03]"
              >
                Email support@aishopifybuilder.com
              </a>
            </>
          ) : (
            <p className="mt-1 text-sm text-black/70">
              The Free plan includes community support.{" "}
              <Link href="/pricing" className="font-medium underline hover:no-underline">
                Upgrade
              </Link>{" "}
              for direct email support.
            </p>
          )}
        </div>

        {membership && (
          <div className="mb-8 rounded-2xl border border-black/10 bg-black/[0.015] p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-black/40">Team membership</p>
            <p className="mt-1 text-sm text-black/70">
              You&apos;re a member of {membership.owner.name || membership.owner.email}&apos;s team — you have shared
              access to their projects.
            </p>
          </div>
        )}

        <TeamPanel
          initialMembers={ownedMembers.map((m) => ({
            id: m.id,
            email: m.email,
            status: m.status as "PENDING" | "ACTIVE",
            invitedAt: m.invitedAt.toISOString(),
            acceptedAt: m.acceptedAt?.toISOString() ?? null,
          }))}
          locked={!limits.teamCollaboration}
          lockedReason={
            limits.teamCollaboration
              ? null
              : `Team collaboration isn't included in the ${limits.label} plan. Upgrade to invite teammates.`
          }
          maxTeamMembers={limits.maxTeamMembers}
        />

        <CreatorPanel
          initialListings={myListings}
          initialBalanceCents={user.creatorBalanceCents}
          initialPayouts={myPayouts.map((p) => ({
            id: p.id,
            amountCents: p.amountCents,
            status: p.status,
            requestedAt: p.requestedAt.toISOString(),
            paidAt: p.paidAt?.toISOString() ?? null,
          }))}
          minPayoutCents={MIN_PAYOUT_CENTS}
        />

        <ProfileForm initialName={user.name} initialEmail={user.email} memberSince={user.createdAt.toISOString()} />
      </main>
    </div>
  );
}

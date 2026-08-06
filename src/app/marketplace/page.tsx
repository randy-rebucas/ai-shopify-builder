import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Logo } from "@/components/logo";
import { noIndex } from "@/lib/seo";

export const metadata: Metadata = { title: "Marketplace", robots: noIndex };

const CATEGORY_LABELS: Record<string, string> = {
  TEMPLATE: "Template",
  COMPONENT: "Component",
  EXTENSION: "Extension",
  COMPLETE_APP: "Complete App",
  PROMPT_PACK: "AI Prompt Pack",
};

const CATEGORIES = Object.keys(CATEGORY_LABELS);

function formatPrice(cents: number): string {
  return cents === 0 ? "Free" : `₱${(cents / 100).toFixed(2)}`;
}

export default async function MarketplacePage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { category } = await searchParams;
  const validCategory = category && CATEGORIES.includes(category) ? category : undefined;

  const listings = await prisma.marketplaceListing.findMany({
    where: { status: "PUBLISHED", ...(validCategory ? { category: validCategory as never } : {}) },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      description: true,
      category: true,
      priceCents: true,
      creator: { select: { name: true, email: true } },
    },
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-black/[0.03] to-transparent">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-6">
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

      <main className="mx-auto max-w-5xl px-4 pb-20">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight">Marketplace</h1>
          <p className="mt-1 text-sm text-black/50">
            Browse templates, components, and complete apps published by other builders.
          </p>
        </div>

        <div className="mb-6 flex flex-wrap gap-2">
          <Link
            href="/marketplace"
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
              !validCategory ? "border-black bg-black text-white" : "border-black/10 hover:bg-black/[0.03]"
            }`}
          >
            All
          </Link>
          {CATEGORIES.map((cat) => (
            <Link
              key={cat}
              href={`/marketplace?category=${cat}`}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                validCategory === cat ? "border-black bg-black text-white" : "border-black/10 hover:bg-black/[0.03]"
              }`}
            >
              {CATEGORY_LABELS[cat]}
            </Link>
          ))}
        </div>

        {listings.length === 0 ? (
          <p className="text-sm text-black/40">No listings yet in this category.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {listings.map((listing) => (
              <Link
                key={listing.id}
                href={`/marketplace/${listing.id}`}
                className="flex flex-col rounded-2xl border border-black/10 p-4 transition hover:-translate-y-0.5 hover:border-black/20 hover:shadow-md"
              >
                <span className="mb-2 inline-flex w-fit items-center rounded-full bg-black/5 px-2 py-0.5 text-xs font-medium text-black/60">
                  {CATEGORY_LABELS[listing.category]}
                </span>
                <h2 className="text-sm font-semibold text-black">{listing.title}</h2>
                <p className="mt-1 line-clamp-2 text-xs text-black/50">{listing.description}</p>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-xs text-black/40">by {listing.creator.name || listing.creator.email}</span>
                  <span className="text-sm font-semibold text-black">{formatPrice(listing.priceCents)}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

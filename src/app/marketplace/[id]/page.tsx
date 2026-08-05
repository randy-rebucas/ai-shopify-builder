import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Logo } from "@/components/logo";
import { BuyButton } from "./buy-button";

const CATEGORY_LABELS: Record<string, string> = {
  TEMPLATE: "Template",
  COMPONENT: "Component",
  EXTENSION: "Extension",
  COMPLETE_APP: "Complete App",
  PROMPT_PACK: "AI Prompt Pack",
};

export default async function ListingPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { id } = await params;
  const listing = await prisma.marketplaceListing.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      description: true,
      category: true,
      priceCents: true,
      status: true,
      creatorId: true,
      files: true,
      creator: { select: { name: true, email: true } },
    },
  });
  if (!listing || (listing.status !== "PUBLISHED" && listing.creatorId !== session.userId)) notFound();

  const fileCount = Array.isArray(listing.files) ? listing.files.length : 0;
  const isOwner = listing.creatorId === session.userId;

  return (
    <div className="min-h-screen bg-gradient-to-b from-black/[0.03] to-transparent">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-4 py-6">
        <Link href="/marketplace">
          <Logo />
        </Link>
        <Link
          href="/marketplace"
          className="flex items-center gap-1.5 text-sm text-black/50 transition hover:text-black"
        >
          <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5" aria-hidden>
            <path d="M9.5 3.5 5 8l4.5 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back to marketplace
        </Link>
      </header>

      <main className="mx-auto max-w-3xl px-4 pb-20">
        <span className="mb-3 inline-flex w-fit items-center rounded-full bg-black/5 px-2.5 py-1 text-xs font-medium text-black/60">
          {CATEGORY_LABELS[listing.category]}
        </span>
        <h1 className="text-2xl font-semibold tracking-tight">{listing.title}</h1>
        <p className="mt-1 text-sm text-black/50">by {listing.creator.name || listing.creator.email}</p>
        <p className="mt-4 whitespace-pre-wrap text-sm text-black/70">{listing.description}</p>
        <p className="mt-4 text-xs text-black/40">{fileCount} file{fileCount === 1 ? "" : "s"} included</p>

        <div className="mt-8">
          {isOwner ? (
            <p className="text-sm text-black/50">
              This is your listing.{" "}
              {listing.status === "UNLISTED" && <span className="text-amber-600">It&apos;s currently unlisted.</span>}
            </p>
          ) : (
            <BuyButton listingId={listing.id} priceCents={listing.priceCents} />
          )}
        </div>
      </main>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const CATEGORY_LABELS: Record<string, string> = {
  TEMPLATE: "Template",
  COMPONENT: "Component",
  EXTENSION: "Extension",
  COMPLETE_APP: "Complete App",
  PROMPT_PACK: "AI Prompt Pack",
};

interface Listing {
  id: string;
  title: string;
  category: string;
  priceCents: number;
  status: "PUBLISHED" | "UNLISTED";
}

interface Payout {
  id: string;
  amountCents: number;
  status: "REQUESTED" | "PAID";
  requestedAt: string;
  paidAt: string | null;
}

function pesos(cents: number): string {
  return `₱${(cents / 100).toFixed(2)}`;
}

export function CreatorPanel({
  initialListings,
  initialBalanceCents,
  initialPayouts,
  minPayoutCents,
}: {
  initialListings: Listing[];
  initialBalanceCents: number;
  initialPayouts: Payout[];
  minPayoutCents: number;
}) {
  const router = useRouter();
  const [listings, setListings] = useState(initialListings);
  const [balanceCents, setBalanceCents] = useState(initialBalanceCents);
  const [payouts, setPayouts] = useState(initialPayouts);
  const [requesting, setRequesting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function unlist(id: string) {
    const res = await fetch(`/api/marketplace/listings/${id}`, { method: "DELETE" });
    if (res.ok) {
      setListings((prev) => prev.map((l) => (l.id === id ? { ...l, status: "UNLISTED" } : l)));
      router.refresh();
    }
  }

  async function requestPayout() {
    setRequesting(true);
    setError(null);
    try {
      const res = await fetch("/api/marketplace/payouts", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Couldn't request a payout.");
        return;
      }
      setPayouts((prev) => [data, ...prev]);
      setBalanceCents((prev) => prev - data.amountCents);
    } catch {
      setError("Couldn't request a payout.");
    } finally {
      setRequesting(false);
    }
  }

  if (listings.length === 0 && balanceCents === 0 && payouts.length === 0) return null;

  return (
    <div className="mb-8 rounded-2xl border border-black/10 p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-black/40">Marketplace</p>

      <div className="mt-3 flex items-center justify-between rounded-xl bg-black/[0.015] p-3.5">
        <div>
          <p className="text-xs text-black/45">Available balance</p>
          <p className="mt-0.5 text-lg font-semibold tracking-tight">{pesos(balanceCents)}</p>
        </div>
        <div className="text-right">
          <button
            onClick={requestPayout}
            disabled={requesting || balanceCents < minPayoutCents}
            className="rounded-full bg-black px-4 py-2 text-xs font-medium text-white transition hover:bg-black/85 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {requesting ? "Requesting…" : "Request payout"}
          </button>
          {balanceCents < minPayoutCents && (
            <p className="mt-1 text-xs text-black/40">Minimum payout is {pesos(minPayoutCents)}</p>
          )}
        </div>
      </div>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

      {listings.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-xs font-medium text-black/50">Your listings</p>
          <ul className="divide-y divide-black/10 rounded-xl border border-black/10">
            {listings.map((l) => (
              <li key={l.id} className="flex items-center justify-between gap-3 p-3">
                <div className="min-w-0">
                  <a href={`/marketplace/${l.id}`} className="truncate text-sm font-medium text-black hover:underline">
                    {l.title}
                  </a>
                  <p className="mt-0.5 text-xs text-black/40">
                    {CATEGORY_LABELS[l.category] ?? l.category} · {l.priceCents === 0 ? "Free" : pesos(l.priceCents)} ·{" "}
                    {l.status === "PUBLISHED" ? "Published" : "Unlisted"}
                  </p>
                </div>
                {l.status === "PUBLISHED" && (
                  <button onClick={() => unlist(l.id)} className="shrink-0 text-xs text-black/50 hover:text-red-600">
                    Unlist
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {payouts.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-xs font-medium text-black/50">Payout requests</p>
          <ul className="divide-y divide-black/10 rounded-xl border border-black/10">
            {payouts.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 p-3">
                <span className="text-sm text-black/80">{pesos(p.amountCents)}</span>
                <span className="text-xs text-black/40">{p.status === "PAID" ? "Paid" : "Requested"}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

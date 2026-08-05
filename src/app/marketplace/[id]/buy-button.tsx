"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function BuyButton({ listingId, priceCents }: { listingId: string; priceCents: number }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function buy() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/marketplace/listings/${listingId}/purchase`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Purchase failed.");
        setLoading(false);
        return;
      }
      if (data.installed && data.projectId) {
        router.push(`/projects/${data.projectId}`);
        return;
      }
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
        return;
      }
      setError("Something went wrong.");
      setLoading(false);
    } catch {
      setError("Purchase failed.");
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        onClick={buy}
        disabled={loading}
        className="inline-flex h-10 items-center justify-center rounded-full bg-black px-5 text-sm font-medium text-white transition hover:bg-black/85 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Working…" : priceCents === 0 ? "Install for free" : `Buy for ₱${(priceCents / 100).toFixed(2)}`}
      </button>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}

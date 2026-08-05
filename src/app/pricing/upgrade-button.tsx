"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { BillablePlan } from "@/lib/plans";

export function UpgradeButton({
  tier,
  label,
  loggedIn,
  featured,
}: {
  tier: BillablePlan;
  label: string;
  loggedIn: boolean;
  featured?: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    if (!loggedIn) {
      router.push(`/signup?next=/pricing`);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/billing/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.checkoutUrl) {
        setError(typeof data?.error === "string" ? data.error : "Couldn't start checkout.");
        setLoading(false);
        return;
      }
      window.location.href = data.checkoutUrl;
    } catch {
      setError("Couldn't start checkout.");
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className={`mt-5 inline-flex h-10 w-full items-center justify-center rounded-full px-4 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6366f1] disabled:cursor-not-allowed disabled:opacity-60 ${
          featured ? "bg-black text-white hover:bg-black/85" : "border border-black/10 hover:bg-black/[0.03]"
        }`}
      >
        {loading ? "Redirecting to checkout…" : label}
      </button>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}

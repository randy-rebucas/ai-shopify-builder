"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { relativeTime } from "@/lib/format-time";

const PLAN_TIERS = ["FREE", "STARTER", "PROFESSIONAL", "AGENCY", "ENTERPRISE"] as const;

export interface AdminUserDetailData {
  id: string;
  email: string;
  name: string | null;
  plan: string;
  aiCreditsUsed: number;
  planExpiresAt: string | null;
  createdAt: string;
  projects: { id: string; name: string; status: string; updatedAt: string }[];
  deployAttempts: { id: string; status: string; url: string | null; startedAt: string; projectName: string }[];
  marketplacePurchases: { id: string; amountCents: number; status: string; createdAt: string }[];
  payment: { status: string; paymentIntentStatus: string | null } | null | "unavailable";
}

export function AdminUserDetail({ user }: { user: AdminUserDetailData }) {
  const router = useRouter();
  const [plan, setPlan] = useState(user.plan);
  const [aiCreditsUsed, setAiCreditsUsed] = useState(String(user.aiCreditsUsed));
  const [planExpiresAt, setPlanExpiresAt] = useState(
    user.planExpiresAt ? user.planExpiresAt.slice(0, 10) : "",
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan,
          aiCreditsUsed: Number(aiCreditsUsed),
          planExpiresAt: planExpiresAt ? new Date(planExpiresAt).toISOString() : null,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to save changes.");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save changes.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2 space-y-6">
        <div className="rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-black">Profile</h2>
          <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-black/40">Name</dt>
              <dd className="text-black">{user.name || "—"}</dd>
            </div>
            <div>
              <dt className="text-black/40">Email</dt>
              <dd className="text-black">{user.email}</dd>
            </div>
            <div>
              <dt className="text-black/40">Joined</dt>
              <dd className="text-black">{relativeTime(new Date(user.createdAt))}</dd>
            </div>
          </dl>
        </div>

        <div className="rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-black">Payment status</h2>
          {user.payment === "unavailable" ? (
            <p className="mt-2 text-sm text-black/40">Payment status unavailable.</p>
          ) : user.payment === null ? (
            <p className="mt-2 text-sm text-black/40">No checkout session on record.</p>
          ) : (
            <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-black/40">Checkout session</dt>
                <dd className="text-black">{user.payment.status}</dd>
              </div>
              <div>
                <dt className="text-black/40">Payment intent</dt>
                <dd className="text-black">{user.payment.paymentIntentStatus ?? "—"}</dd>
              </div>
            </dl>
          )}
        </div>

        <div className="rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-black">Deploy history</h2>
          {user.deployAttempts.length === 0 ? (
            <p className="mt-2 text-sm text-black/40">No deploy attempts.</p>
          ) : (
            <ul className="mt-3 divide-y divide-black/10">
              {user.deployAttempts.map((d) => (
                <li key={d.id} className="flex items-center justify-between py-2 text-sm">
                  <span className="text-black/70">{d.projectName}</span>
                  <span className="text-black/50">{d.status}</span>
                  <span className="text-xs text-black/40">{relativeTime(new Date(d.startedAt))}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-black">Marketplace purchases</h2>
          {user.marketplacePurchases.length === 0 ? (
            <p className="mt-2 text-sm text-black/40">No marketplace purchases.</p>
          ) : (
            <ul className="mt-3 divide-y divide-black/10">
              {user.marketplacePurchases.map((p) => (
                <li key={p.id} className="flex items-center justify-between py-2 text-sm">
                  <span className="text-black/70">${(p.amountCents / 100).toFixed(2)}</span>
                  <span className="text-black/50">{p.status}</span>
                  <span className="text-xs text-black/40">{relativeTime(new Date(p.createdAt))}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-black">Overrides</h2>
        <div className="mt-3 space-y-3">
          <label className="block text-sm">
            <span className="text-black/50">Plan</span>
            <select
              value={plan}
              onChange={(e) => setPlan(e.target.value)}
              className="mt-1 w-full rounded-lg border border-black/10 bg-white py-1.5 px-2.5 text-sm outline-none focus:border-black/25"
            >
              {PLAN_TIERS.map((tier) => (
                <option key={tier} value={tier}>
                  {tier}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm">
            <span className="text-black/50">AI credits used</span>
            <input
              type="number"
              min={0}
              value={aiCreditsUsed}
              onChange={(e) => setAiCreditsUsed(e.target.value)}
              className="mt-1 w-full rounded-lg border border-black/10 bg-white py-1.5 px-2.5 text-sm outline-none focus:border-black/25"
            />
          </label>

          <label className="block text-sm">
            <span className="text-black/50">Plan expires</span>
            <input
              type="date"
              value={planExpiresAt}
              onChange={(e) => setPlanExpiresAt(e.target.value)}
              className="mt-1 w-full rounded-lg border border-black/10 bg-white py-1.5 px-2.5 text-sm outline-none focus:border-black/25"
            />
          </label>

          {error && <p className="text-xs text-red-600">{error}</p>}

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="w-full rounded-full bg-black py-2 text-sm font-medium text-white transition hover:bg-black/85 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { relativeTime } from "@/lib/format-time";

export interface AdminUserRow {
  id: string;
  email: string;
  name: string | null;
  plan: string;
  aiCreditsUsed: number;
  planExpiresAt: string | null;
  createdAt: string;
  projectCount: number;
}

const PLAN_OPTIONS = [
  { value: "ALL", label: "All plans" },
  { value: "FREE", label: "Free" },
  { value: "STARTER", label: "Starter" },
  { value: "PROFESSIONAL", label: "Professional" },
  { value: "AGENCY", label: "Agency" },
  { value: "ENTERPRISE", label: "Enterprise" },
];

export function AdminUsersTable({ users }: { users: AdminUserRow[] }) {
  const [search, setSearch] = useState("");
  const [plan, setPlan] = useState("ALL");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      if (plan !== "ALL" && u.plan !== plan) return false;
      if (!q) return true;
      return u.email.toLowerCase().includes(q) || (u.name ?? "").toLowerCase().includes(q);
    });
  }, [users, search, plan]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-black">
          Users
          <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#6366f1]/10 px-1.5 text-xs font-medium text-[#6366f1]">
            {users.length}
          </span>
        </h2>

        <div className="flex items-center gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by email or name..."
            className="w-56 rounded-full border border-black/10 bg-white py-1.5 px-3 text-sm outline-none placeholder:text-black/40 focus:border-black/25"
          />
          <select
            value={plan}
            onChange={(e) => setPlan(e.target.value)}
            className="rounded-full border border-black/10 bg-white py-1.5 pl-3 pr-7 text-sm text-black/70 outline-none focus:border-black/25"
          >
            {PLAN_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-1 rounded-2xl border border-dashed border-black/15 py-14 text-center">
          <p className="text-sm font-medium text-black/60">No users match your search</p>
        </div>
      ) : (
        <ul className="divide-y divide-black/10 rounded-2xl border border-black/10 bg-white">
          {filtered.map((user) => (
            <li key={user.id}>
              <Link
                href={`/admin/users/${user.id}`}
                className="flex items-center gap-4 p-4 transition hover:bg-black/[0.02] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6366f1]"
              >
                <div className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-black">
                    {user.name || user.email}
                  </span>
                  <span className="mt-0.5 block truncate text-sm text-black/50">{user.email}</span>
                </div>
                <span className="shrink-0 rounded-full bg-black/5 px-2.5 py-1 text-xs font-medium text-black/70">
                  {user.plan}
                </span>
                <span className="w-24 shrink-0 text-right text-xs text-black/50">
                  {user.aiCreditsUsed} credits
                </span>
                <span className="w-24 shrink-0 text-right text-xs text-black/50">
                  {user.projectCount} project{user.projectCount === 1 ? "" : "s"}
                </span>
                <span className="w-28 shrink-0 text-right text-xs text-black/40">
                  Joined {relativeTime(new Date(user.createdAt))}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

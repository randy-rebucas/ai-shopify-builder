"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Member {
  id: string;
  email: string;
  status: "PENDING" | "ACTIVE";
  invitedAt: string;
  acceptedAt: string | null;
}

export function TeamPanel({
  initialMembers,
  locked,
  lockedReason,
  maxTeamMembers,
}: {
  initialMembers: Member[];
  locked: boolean;
  lockedReason: string | null;
  maxTeamMembers: number | null;
}) {
  const router = useRouter();
  const [members, setMembers] = useState(initialMembers);
  const [email, setEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || inviting) return;
    setInviting(true);
    setError(null);
    setInviteUrl(null);
    try {
      const res = await fetch("/api/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Couldn't send the invite.");
        return;
      }
      setMembers((prev) => [{ id: data.id, email: data.email, status: data.status, invitedAt: new Date().toISOString(), acceptedAt: null }, ...prev]);
      setInviteUrl(data.inviteUrl);
      setEmail("");
    } catch {
      setError("Couldn't send the invite.");
    } finally {
      setInviting(false);
    }
  }

  async function remove(memberId: string) {
    const res = await fetch(`/api/team/${memberId}`, { method: "DELETE" });
    if (res.ok) {
      setMembers((prev) => prev.filter((m) => m.id !== memberId));
      router.refresh();
    }
  }

  if (locked) {
    return (
      <div className="mb-8 rounded-2xl border border-black/10 p-5">
        <p className="text-xs font-medium uppercase tracking-wide text-black/40">Team</p>
        <p className="mt-1 text-sm text-black/70">{lockedReason}</p>
        <a
          href="/pricing"
          className="mt-3 inline-flex h-9 items-center justify-center rounded-full bg-black px-4 text-xs font-medium text-white transition hover:bg-black/85"
        >
          View plans
        </a>
      </div>
    );
  }

  return (
    <div className="mb-8 rounded-2xl border border-black/10 p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-black/40">Team</p>
        <span className="text-xs text-black/40">
          {members.length}
          {maxTeamMembers !== null ? ` / ${maxTeamMembers}` : ""} member{members.length === 1 ? "" : "s"}
        </span>
      </div>

      <form onSubmit={invite} className="mt-3 flex gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="teammate@example.com"
          className="h-9 flex-1 rounded-lg border border-black/10 bg-black/[0.015] px-2.5 text-sm outline-none placeholder:text-black/30 focus:border-black/20"
        />
        <button
          type="submit"
          disabled={inviting || !email.trim()}
          className="h-9 shrink-0 rounded-full bg-black px-4 text-xs font-medium text-white transition hover:bg-black/85 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {inviting ? "Inviting…" : "Invite"}
        </button>
      </form>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      {inviteUrl && (
        <p className="mt-2 text-xs text-black/50">
          Share this link with them to accept:{" "}
          <a href={inviteUrl} className="break-all font-medium underline hover:no-underline">
            {inviteUrl}
          </a>
        </p>
      )}

      {members.length > 0 && (
        <ul className="mt-4 divide-y divide-black/10 border-t border-black/10">
          {members.map((m) => (
            <li key={m.id} className="flex items-center justify-between gap-3 py-2.5">
              <div className="min-w-0">
                <p className="truncate text-sm text-black/80">{m.email}</p>
                <p className="mt-0.5 text-xs text-black/40">
                  {m.status === "ACTIVE" ? "Active" : "Pending"}
                </p>
              </div>
              <button
                onClick={() => remove(m.id)}
                className="shrink-0 text-xs text-black/50 hover:text-red-600"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

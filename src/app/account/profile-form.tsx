"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

function initials(label: string): string {
  const parts = label.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const second = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + second).toUpperCase() || "?";
}

export function ProfileForm({
  initialName,
  initialEmail,
  memberSince,
}: {
  initialName: string | null;
  initialEmail: string;
  memberSince: string;
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName ?? "");
  const [email, setEmail] = useState(initialEmail);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const label = (initialName?.trim() || initialEmail) ?? "?";

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setProfileSaving(true);
    setProfileSaved(false);
    setProfileError(null);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setProfileError(typeof data.error === "string" ? data.error : "Failed to save");
        return;
      }
      setProfileSaved(true);
      router.refresh();
    } catch {
      setProfileError("Failed to save");
    } finally {
      setProfileSaving(false);
    }
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordSaving(true);
    setPasswordSaved(false);
    setPasswordError(null);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPasswordError(typeof data.error === "string" ? data.error : "Failed to update password");
        return;
      }
      setPasswordSaved(true);
      setCurrentPassword("");
      setNewPassword("");
    } catch {
      setPasswordError("Failed to update password");
    } finally {
      setPasswordSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-4">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#6366f1]/10 text-lg font-semibold text-[#6366f1]">
            {initials(label)}
          </span>
          <div className="min-w-0">
            <p className="truncate font-medium text-black">{label}</p>
            <p className="mt-0.5 text-xs text-black/45">
              Member since {new Date(memberSince).toLocaleDateString(undefined, { month: "long", year: "numeric" })}
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={saveProfile} className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-black">Profile</h2>
        <p className="mt-0.5 text-xs text-black/40">Your name and email address.</p>

        <div className="mt-4 space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium uppercase text-black/40">Name</label>
            <input
              className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm outline-none focus:border-black/25"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium uppercase text-black/40">Email</label>
            <input
              type="email"
              required
              className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm outline-none focus:border-black/25"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <button
            type="submit"
            disabled={profileSaving}
            className="rounded-full bg-black px-5 py-2 text-xs font-medium text-white transition hover:bg-black/85 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6366f1]"
          >
            {profileSaving ? "Saving..." : "Save changes"}
          </button>
          {profileSaved && <span className="text-xs font-medium text-emerald-600">✓ Saved</span>}
          {profileError && <span className="text-xs text-red-600">{profileError}</span>}
        </div>
      </form>

      <form onSubmit={savePassword} className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-black">Password</h2>
        <p className="mt-0.5 text-xs text-black/40">Change the password used to sign in.</p>

        <div className="mt-4 space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium uppercase text-black/40">Current password</label>
            <input
              type="password"
              required
              className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm outline-none focus:border-black/25"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium uppercase text-black/40">New password</label>
            <input
              type="password"
              required
              minLength={8}
              className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm outline-none focus:border-black/25"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="At least 8 characters"
            />
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <button
            type="submit"
            disabled={passwordSaving || !currentPassword || newPassword.length < 8}
            className="rounded-full bg-black px-5 py-2 text-xs font-medium text-white transition hover:bg-black/85 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6366f1]"
          >
            {passwordSaving ? "Updating..." : "Update password"}
          </button>
          {passwordSaved && <span className="text-xs font-medium text-emerald-600">✓ Updated</span>}
          {passwordError && <span className="text-xs text-red-600">{passwordError}</span>}
        </div>
      </form>
    </div>
  );
}

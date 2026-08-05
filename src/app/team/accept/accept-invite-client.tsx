"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Logo } from "@/components/logo";

export function AcceptInviteClient({ token }: { token: string }) {
  const [state, setState] = useState<"pending" | "ok" | "error">("pending");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/team/accept", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          setError(typeof data.error === "string" ? data.error : "Couldn't accept this invite.");
          setState("error");
          return;
        }
        setState("ok");
      })
      .catch(() => {
        setError("Couldn't accept this invite.");
        setState("error");
      });
  }, [token]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-white px-4 text-center">
      <Logo />
      {state === "pending" && <p className="text-sm text-black/50">Accepting invite…</p>}
      {state === "ok" && (
        <>
          <p className="text-sm text-black/70">You&apos;ve joined the team. You now have access to their projects.</p>
          <Link
            href="/dashboard"
            className="inline-flex h-10 items-center justify-center rounded-full bg-black px-5 text-sm font-medium text-white transition hover:bg-black/85"
          >
            Go to dashboard
          </Link>
        </>
      )}
      {state === "error" && (
        <>
          <p className="text-sm text-red-600">{error}</p>
          <Link href="/dashboard" className="text-sm font-medium underline hover:no-underline">
            Back to dashboard
          </Link>
        </>
      )}
    </div>
  );
}

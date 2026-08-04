"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/logo";

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth="1.75">
      <circle cx="12" cy="8" r="3.5" />
      <path d="M4.5 20c1.4-3.6 4.4-5.5 7.5-5.5s6.1 1.9 7.5 5.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth="1.75">
      <rect x="3" y="5" width="18" height="14" rx="2.5" />
      <path d="m4 7 8 6 8-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth="1.75">
      <rect x="4" y="10.5" width="16" height="10" rx="2.5" />
      <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" strokeLinecap="round" />
    </svg>
  );
}

function EyeIcon({ off }: { off: boolean }) {
  return off ? (
    <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path
        d="M3 3l18 18M10.6 10.6a2.5 2.5 0 0 0 3.5 3.5M6.6 6.7C4.4 8.1 2.9 10 2 12c1.6 3.8 5.4 7 10 7 1.7 0 3.3-.4 4.7-1.2M9.9 4.2A10.5 10.5 0 0 1 12 4c4.6 0 8.4 3.2 10 7-.5 1.2-1.2 2.4-2.1 3.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path d="M2 12c1.6-3.8 5.4-7 10-7s8.4 3.2 10 7c-1.6 3.8-5.4 7-10 7s-8.4-3.2-10-7Z" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="2.5" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.75">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v5" strokeLinecap="round" />
      <circle cx="12" cy="16" r="0.75" fill="currentColor" stroke="none" />
    </svg>
  );
}

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, name }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json();
      setError(typeof data.error === "string" ? data.error : "Signup failed");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-white px-4 py-12">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(0,0,0,0.06) 1px, transparent 0)",
          backgroundSize: "28px 28px",
          maskImage: "radial-gradient(ellipse 70% 60% at 50% 0%, black 40%, transparent 100%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 left-1/2 h-72 w-[36rem] -translate-x-1/2 rounded-full opacity-25 blur-3xl"
        style={{ background: "radial-gradient(closest-side, #6366f1, transparent)" }}
      />

      <div className="relative w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-6 text-center">
          <Link href="/" className="inline-flex">
            <Logo />
          </Link>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-black">Create your account</h1>
            <p className="mt-1.5 text-sm text-black/50">Start building your Shopify app with a prompt.</p>
          </div>
        </div>

        <div className="rounded-2xl border border-black/10 bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_12px_32px_-16px_rgba(0,0,0,0.12)] sm:p-8">
          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
            <div>
              <label htmlFor="name" className="mb-1.5 block text-xs font-medium text-black/70">
                Name
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-black/35">
                  <UserIcon />
                </span>
                <input
                  id="name"
                  name="name"
                  className="w-full rounded-xl border border-black/10 bg-black/[0.015] py-2.5 pl-10 pr-3 text-sm text-black outline-none transition placeholder:text-black/35 focus:border-[#6366f1]/50 focus:bg-white focus:ring-2 focus:ring-[#6366f1]/25"
                  placeholder="Jamie Rivera"
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="mb-1.5 block text-xs font-medium text-black/70">
                Email address
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-black/35">
                  <MailIcon />
                </span>
                <input
                  id="email"
                  name="email"
                  className="w-full rounded-xl border border-black/10 bg-black/[0.015] py-2.5 pl-10 pr-3 text-sm text-black outline-none transition placeholder:text-black/35 focus:border-[#6366f1]/50 focus:bg-white focus:ring-2 focus:ring-[#6366f1]/25"
                  placeholder="you@store.com"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="mb-1.5 block text-xs font-medium text-black/70">
                Password
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-black/35">
                  <LockIcon />
                </span>
                <input
                  id="password"
                  name="password"
                  className="w-full rounded-xl border border-black/10 bg-black/[0.015] py-2.5 pr-10 pl-10 text-sm text-black outline-none transition placeholder:text-black/35 focus:border-[#6366f1]/50 focus:bg-white focus:ring-2 focus:ring-[#6366f1]/25"
                  placeholder="At least 8 characters"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute inset-y-0 right-2.5 flex items-center text-black/35 transition hover:text-black/60"
                >
                  <EyeIcon off={showPassword} />
                </button>
              </div>
              <p className="mt-1.5 text-xs text-black/40">Must be at least 8 characters.</p>
            </div>

            {error && (
              <p role="alert" className="flex items-start gap-2 rounded-xl bg-red-50 px-3 py-2.5 text-sm text-red-700">
                <AlertIcon />
                <span>{error}</span>
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-1 inline-flex h-11 items-center justify-center rounded-full bg-black text-sm font-medium text-white transition hover:bg-black/85 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6366f1] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" />
                    <path className="opacity-90" d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                  </svg>
                  Creating account...
                </span>
              ) : (
                "Sign up"
              )}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-black/50">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-black underline decoration-black/20 underline-offset-4 hover:decoration-black/50">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}

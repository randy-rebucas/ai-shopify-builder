import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Logo } from "@/components/logo";
import { ProfileForm } from "./profile-form";

export default async function AccountPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { name: true, email: true, createdAt: true },
  });
  if (!user) redirect("/login");

  return (
    <div className="min-h-screen bg-gradient-to-b from-black/[0.03] to-transparent">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-4 py-6">
        <Link href="/dashboard">
          <Logo />
        </Link>
        <Link
          href="/dashboard"
          className="flex items-center gap-1.5 text-sm text-black/50 transition hover:text-black"
        >
          <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5" aria-hidden>
            <path d="M9.5 3.5 5 8l4.5 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back to dashboard
        </Link>
      </header>

      <main className="mx-auto max-w-3xl px-4 pb-20">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight">Your profile</h1>
          <p className="mt-1 text-sm text-black/50">Manage your name, email, and password.</p>
        </div>

        <ProfileForm initialName={user.name} initialEmail={user.email} memberSince={user.createdAt.toISOString()} />
      </main>
    </div>
  );
}

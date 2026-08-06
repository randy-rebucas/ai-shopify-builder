import Link from "next/link";
import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin";
import { Logo } from "@/components/logo";
import { noIndex } from "@/lib/seo";

export const metadata: Metadata = { title: "Admin", robots: noIndex };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();

  return (
    <div className="min-h-screen bg-gradient-to-b from-black/[0.03] to-transparent">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-6">
        <div className="flex items-center gap-6">
          <Logo />
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/admin" className="text-black/60 transition hover:text-black">
              Overview
            </Link>
            <Link href="/admin/users" className="text-black/60 transition hover:text-black">
              Users
            </Link>
          </nav>
        </div>
        <Link href="/dashboard" className="text-sm text-black/60 transition hover:text-black">
          Back to dashboard
        </Link>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-16">{children}</main>
    </div>
  );
}

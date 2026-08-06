import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Logo } from "@/components/logo";
import { UserMenu } from "@/components/user-menu";
import { ProjectsPanel } from "@/components/projects-panel";
import { listAccessibleProjects } from "@/lib/project-access";
import { NewProjectForm } from "./new-project-form";
import { noIndex } from "@/lib/seo";

export const metadata: Metadata = { title: "Dashboard", robots: noIndex };

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const [user, projects] = await Promise.all([
    prisma.user.findUnique({ where: { id: session.userId }, select: { name: true, email: true } }),
    listAccessibleProjects(session.userId),
  ]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-black/[0.03] to-transparent">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-6">
        <Logo />
        <div className="flex items-center gap-4">
          <Link
            href="/marketplace"
            className="hidden items-center gap-1.5 text-sm text-black/60 transition hover:text-black sm:flex"
          >
            <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4" aria-hidden>
              <path d="M2 5.5 3.2 2h9.6l1.2 3.5M2 5.5v7A1.5 1.5 0 0 0 3.5 14h9a1.5 1.5 0 0 0 1.5-1.5v-7M2 5.5h12" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
            </svg>
            Marketplace
          </Link>
          <Link
            href="https://shopify.dev"
            target="_blank"
            rel="noreferrer"
            className="hidden items-center gap-1.5 text-sm text-black/60 transition hover:text-black sm:flex"
          >
            <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4" aria-hidden>
              <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.4" />
              <path d="M6.2 6.3a1.8 1.8 0 1 1 2.6 1.6c-.6.3-.8.6-.8 1.2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              <circle cx="8" cy="11.1" r="0.15" fill="currentColor" stroke="currentColor" strokeWidth="1" />
            </svg>
            Help
          </Link>
          {user && <UserMenu name={user.name} email={user.email} />}
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-16">
        <div className="mx-auto max-w-2xl pt-10 pb-14 text-center">
          <h1 className="flex items-center justify-center gap-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            What do you want to build?
            <svg viewBox="0 0 16 16" fill="#6366f1" className="h-6 w-6 shrink-0 sm:h-7 sm:w-7" aria-hidden>
              <path d="M8 1.5 9 6l4.5 1L9 8l-1 4.5L7 8 2.5 7 7 6l1-4.5Z" />
            </svg>
          </h1>
          <p className="mt-3 text-black/50">
            Describe a Shopify app feature in plain English. AI plans it, writes the code, and gets it
            ready to ship.
          </p>
          <div className="mt-8 text-left">
            <NewProjectForm />
          </div>
        </div>

        <ProjectsPanel
          projects={projects.map((p) => ({
            id: p.id,
            name: p.name,
            description: p.description,
            status: p.status,
            updatedAt: p.updatedAt.toISOString(),
          }))}
        />
      </main>

      <footer className="border-t border-black/10">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-xs text-black/45">
          <div className="flex items-center gap-4">
            <Link
              href="https://shopify.dev/docs/apps"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 transition hover:text-black"
            >
              <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5" aria-hidden>
                <path
                  d="M3 3.5h4a1.5 1.5 0 0 1 1.5 1.5v7A1.2 1.2 0 0 0 7.3 11H3V3.5ZM13 3.5H9a1.5 1.5 0 0 0-1.5 1.5v7A1.2 1.2 0 0 1 8.7 11H13V3.5Z"
                  stroke="currentColor"
                  strokeWidth="1.2"
                  strokeLinejoin="round"
                />
              </svg>
              Documentation
            </Link>
            <Link
              href="https://shopify.dev/docs/api"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 transition hover:text-black"
            >
              <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5" aria-hidden>
                <path
                  d="M5.5 4 2 8l3.5 4M10.5 4 14 8l-3.5 4"
                  stroke="currentColor"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              API Reference
            </Link>
          </div>
          <span>Built for Shopify merchants and developers</span>
          <span>© {new Date().getFullYear()} AI Shopify Builder</span>
        </div>
      </footer>
    </div>
  );
}

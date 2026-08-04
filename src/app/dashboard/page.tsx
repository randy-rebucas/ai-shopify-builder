import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Logo } from "@/components/logo";
import { StatusBadge } from "@/components/status-badge";
import { relativeTime } from "@/lib/format-time";
import { NewProjectForm } from "./new-project-form";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const projects = await prisma.project.findMany({
    where: { userId: session.userId },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-black/[0.03] to-transparent">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-6">
        <Logo />
        <form action="/api/auth/logout" method="post">
          <button className="text-sm text-black/50 hover:text-black" type="submit">
            Log out
          </button>
        </form>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-20">
        <div className="mx-auto max-w-2xl pt-10 pb-14 text-center">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">What do you want to build?</h1>
          <p className="mt-3 text-black/50">
            Describe a Shopify app feature in plain English. AI plans it, writes the code, and gets it
            ready to ship.
          </p>
          <div className="mt-8 text-left">
            <NewProjectForm />
          </div>
        </div>

        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-medium uppercase tracking-wide text-black/40">
            Your projects{projects.length > 0 && ` (${projects.length})`}
          </h2>
        </div>

        {projects.length > 0 ? (
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <li key={project.id}>
                <Link
                  href={`/projects/${project.id}`}
                  className="group flex h-full flex-col justify-between rounded-2xl border border-black/10 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-black/20 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="line-clamp-2 font-medium leading-snug">{project.name}</span>
                    <svg
                      viewBox="0 0 16 16"
                      fill="none"
                      className="mt-0.5 h-4 w-4 shrink-0 text-black/25 transition group-hover:translate-x-0.5 group-hover:text-black/50"
                      aria-hidden
                    >
                      <path
                        d="M3 8h10M8.5 3.5 13 8l-4.5 4.5"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  {project.description && (
                    <p className="mt-1 line-clamp-2 text-sm text-black/45">{project.description}</p>
                  )}
                  <div className="mt-4 flex items-center justify-between">
                    <StatusBadge status={project.status} />
                    <span className="text-xs text-black/35">{relativeTime(project.updatedAt)}</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-black/15 py-16 text-center">
            <p className="text-sm font-medium text-black/60">No projects yet</p>
            <p className="text-sm text-black/40">Describe an idea above to build your first app.</p>
          </div>
        )}
      </main>
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { StatusBadge } from "@/components/status-badge";
import { relativeTime } from "@/lib/format-time";

export interface DashboardProject {
  id: string;
  name: string;
  description: string | null;
  status: string;
  updatedAt: string;
}

const STATUS_OPTIONS = [
  { value: "ALL", label: "All status" },
  { value: "DRAFT", label: "Draft" },
  { value: "PLANNING", label: "Planning" },
  { value: "GENERATING", label: "Generating" },
  { value: "READY", label: "Ready" },
  { value: "FAILED", label: "Failed" },
];

function ProjectIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden>
      <path d="M8 1.5 9 6l4.5 1L9 8l-1 4.5L7 8 2.5 7 7 6l1-4.5Z" fill="currentColor" />
    </svg>
  );
}

export function ProjectsPanel({ projects }: { projects: DashboardProject[] }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [view, setView] = useState<"grid" | "list">("grid");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return projects.filter((p) => {
      if (status !== "ALL" && p.status !== status) return false;
      if (!q) return true;
      return p.name.toLowerCase().includes(q) || (p.description ?? "").toLowerCase().includes(q);
    });
  }, [projects, search, status]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-black">
          Your projects
          {projects.length > 0 && (
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#6366f1]/10 px-1.5 text-xs font-medium text-[#6366f1]">
              {projects.length}
            </span>
          )}
        </h2>

        {projects.length > 0 && (
          <div className="flex items-center gap-2">
            <div className="relative">
              <svg
                viewBox="0 0 16 16"
                fill="none"
                className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-black/35"
                aria-hidden
              >
                <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.4" />
                <path d="m13.5 13.5-3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search projects..."
                className="w-44 rounded-full border border-black/10 bg-white py-1.5 pl-8 pr-3 text-sm outline-none placeholder:text-black/40 focus:border-black/25 sm:w-56"
              />
            </div>

            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="rounded-full border border-black/10 bg-white py-1.5 pl-3 pr-7 text-sm text-black/70 outline-none focus:border-black/25"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            <div className="flex items-center gap-0.5 rounded-full border border-black/10 bg-white p-1">
              <button
                type="button"
                onClick={() => setView("grid")}
                aria-pressed={view === "grid"}
                title="Grid view"
                className={`flex h-6 w-6 items-center justify-center rounded-full transition ${
                  view === "grid" ? "bg-black text-white" : "text-black/40 hover:text-black"
                }`}
              >
                <svg viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3" aria-hidden>
                  <rect x="2" y="2" width="5" height="5" rx="1" />
                  <rect x="9" y="2" width="5" height="5" rx="1" />
                  <rect x="2" y="9" width="5" height="5" rx="1" />
                  <rect x="9" y="9" width="5" height="5" rx="1" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => setView("list")}
                aria-pressed={view === "list"}
                title="List view"
                className={`flex h-6 w-6 items-center justify-center rounded-full transition ${
                  view === "list" ? "bg-black text-white" : "text-black/40 hover:text-black"
                }`}
              >
                <svg viewBox="0 0 16 16" fill="none" className="h-3 w-3" aria-hidden>
                  <path d="M2 4h12M2 8h12M2 12h12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>

      {projects.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-black/15 py-16 text-center">
          <p className="text-sm font-medium text-black/60">No projects yet</p>
          <p className="text-sm text-black/60">Describe an idea above to build your first app.</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-1 rounded-2xl border border-dashed border-black/15 py-14 text-center">
          <p className="text-sm font-medium text-black/60">No projects match your search</p>
          <p className="text-sm text-black/50">Try a different keyword or status.</p>
        </div>
      ) : view === "grid" ? (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((project) => (
            <li key={project.id}>
              <Link
                href={`/projects/${project.id}`}
                className="group flex h-full flex-col justify-between rounded-2xl border border-black/10 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-black/20 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6366f1]"
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
                  <p className="mt-1 line-clamp-2 text-sm text-black/60">{project.description}</p>
                )}
                <div className="mt-4 flex items-center justify-between">
                  <StatusBadge status={project.status} />
                  <span className="text-xs text-black/60">{relativeTime(new Date(project.updatedAt))}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <ul className="divide-y divide-black/10 rounded-2xl border border-black/10 bg-white">
          {filtered.map((project) => (
            <li key={project.id} className="group flex items-center gap-4 p-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#6366f1]/10 text-[#6366f1]">
                <ProjectIcon className="h-4.5 w-4.5" />
              </span>

              <Link href={`/projects/${project.id}`} className="min-w-0 flex-1 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6366f1]">
                <span className="block truncate text-sm font-medium text-black">{project.name}</span>
                {project.description && (
                  <span className="mt-0.5 block truncate text-sm text-black/50">{project.description}</span>
                )}
                <span className="mt-1.5 flex items-center gap-2">
                  <StatusBadge status={project.status} />
                  <span className="text-xs text-black/40">
                    · Updated {relativeTime(new Date(project.updatedAt))}
                  </span>
                </span>
              </Link>

              <div className="flex shrink-0 items-center gap-2">
                <Link
                  href={`/projects/${project.id}`}
                  className="rounded-full border border-black/10 px-3.5 py-1.5 text-xs font-medium text-black/70 transition hover:border-black/20 hover:text-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6366f1]"
                >
                  Open project
                </Link>
                <svg
                  viewBox="0 0 16 16"
                  fill="none"
                  className="h-4 w-4 text-black/25 transition group-hover:text-black/50"
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
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

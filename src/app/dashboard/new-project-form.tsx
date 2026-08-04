"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

const SUGGESTIONS = [
  "A loyalty program where customers earn points on purchases",
  "A referral program that rewards customers for inviting friends",
  "A product reviews widget with star ratings",
  "A back-in-stock notifier customers can subscribe to",
  "A bundle builder for mix-and-match discounted product sets",
  "A post-purchase upsell that offers a discounted add-on at checkout",
];

export function NewProjectForm() {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = prompt.trim();
    if (!trimmed || loading) return;
    setLoading(true);
    setError(null);
    try {
      const projectRes = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Untitled app" }),
      });
      if (!projectRes.ok) {
        setError("Couldn't create the project. Try again.");
        return;
      }
      const project = await projectRes.json();
      await fetch(`/api/projects/${project.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: trimmed }),
      });
      fetch(`/api/projects/${project.id}/generate`, { method: "POST" }).catch(() => {});
      router.push(`/projects/${project.id}`);
    } catch {
      setError("Couldn't create the project. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-black/10 bg-white p-3 shadow-sm transition focus-within:border-black/25 focus-within:shadow-md"
      >
        <textarea
          ref={textareaRef}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
          placeholder="Describe the Shopify app feature you want to build..."
          rows={3}
          className="w-full resize-none bg-transparent px-2 py-1.5 text-base outline-none placeholder:text-black/60"
        />
        <div className="flex items-center justify-between px-1 pt-1">
          <span className="text-xs text-black/60">Enter to build · Shift+Enter for a new line</span>
          <button
            type="submit"
            disabled={loading || !prompt.trim()}
            className="inline-flex items-center gap-1.5 rounded-full bg-black px-4 py-2 text-sm font-medium text-white transition hover:bg-black/85 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6366f1]"
          >
            {loading ? "Starting..." : "Build"}
            {!loading && (
              <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5" aria-hidden>
                <path
                  d="M3 8h10M8.5 3.5 13 8l-4.5 4.5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </button>
        </div>
      </form>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      <div className="mt-3 flex flex-wrap justify-center gap-2">
        {SUGGESTIONS.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            onClick={() => {
              setPrompt(suggestion);
              textareaRef.current?.focus();
            }}
            className="rounded-full border border-black/10 px-3 py-1.5 text-xs text-black/60 transition hover:border-black/20 hover:bg-black/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6366f1]"
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  );
}

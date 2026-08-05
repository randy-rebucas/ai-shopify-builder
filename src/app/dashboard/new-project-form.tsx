"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

interface Idea {
  title: string;
  description: string;
  prompt: string;
  color: string;
  icon: React.ReactNode;
}

const IDEAS: Idea[] = [
  {
    title: "Loyalty program",
    description: "Customers earn points on purchases",
    prompt: "A loyalty program where customers earn points on purchases",
    color: "bg-[#6366f1]/10 text-[#6366f1]",
    icon: (
      <path
        d="M8 2 5.5 6H2l2.8 2.4L3.8 12 8 9.6l4.2 2.4-1-3.6L14 6h-3.5L8 2Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    ),
  },
  {
    title: "Referral program",
    description: "Reward customers for inviting friends",
    prompt: "A referral program that rewards customers for inviting friends",
    color: "bg-emerald-50 text-emerald-600",
    icon: (
      <>
        <circle cx="6" cy="5.5" r="2" stroke="currentColor" strokeWidth="1.4" />
        <path d="M2.5 13c0-2 1.6-3.5 3.5-3.5s3.5 1.5 3.5 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        <circle cx="11.5" cy="5.5" r="1.6" stroke="currentColor" strokeWidth="1.4" />
        <path d="M10 9.8c1.6.2 2.8 1.5 2.8 3.2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </>
    ),
  },
  {
    title: "Product reviews widget",
    description: "Show star ratings and reviews",
    prompt: "A product reviews widget with star ratings and photos",
    color: "bg-amber-50 text-amber-500",
    icon: (
      <path
        d="M8 2.3 9.8 6l4 .6-2.9 2.8.7 4-3.6-1.9-3.6 1.9.7-4L2.2 6.6l4-.6L8 2.3Z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
    ),
  },
  {
    title: "Back-in-stock notifier",
    description: "Customers can subscribe to alerts",
    prompt: "A back-in-stock notifier customers can subscribe to",
    color: "bg-sky-50 text-sky-600",
    icon: (
      <path
        d="M8 2.5c-2 0-3.2 1.4-3.2 3.4v2l-1.3 2.2h9l-1.3-2.2v-2c0-2-1.2-3.4-3.2-3.4Z M6.6 12a1.4 1.4 0 0 0 2.8 0"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
        fill="none"
      />
    ),
  },
  {
    title: "Bundle builder",
    description: "Create mix-and-match product sets",
    prompt: "A bundle builder for mix-and-match discounted product sets",
    color: "bg-rose-50 text-rose-600",
    icon: (
      <>
        <rect x="2.2" y="2.2" width="4.6" height="4.6" rx="1" stroke="currentColor" strokeWidth="1.3" />
        <rect x="9.2" y="2.2" width="4.6" height="4.6" rx="1" stroke="currentColor" strokeWidth="1.3" />
        <rect x="5.7" y="9.2" width="4.6" height="4.6" rx="1" stroke="currentColor" strokeWidth="1.3" />
      </>
    ),
  },
  {
    title: "Post-purchase upsell",
    description: "Offer a discounted add-on at checkout",
    prompt: "A post-purchase upsell that offers a discounted add-on at checkout",
    color: "bg-[#6366f1]/10 text-[#6366f1]",
    icon: (
      <path
        d="M2.5 3h1.6l.9 7.1a1.4 1.4 0 0 0 1.4 1.2h5a1.4 1.4 0 0 0 1.4-1.1l.9-4.7H4.6 M6.2 13.5a.7.7 0 1 0 0-1.4.7.7 0 0 0 0 1.4Z M10.8 13.5a.7.7 0 1 0 0-1.4.7.7 0 0 0 0 1.4Z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    ),
  },
];

const ATTACHMENT_ACCEPT = ".txt,.md,.markdown,.json,.csv,.yml,.yaml";
const MAX_ATTACHMENT_BYTES = 100_000;

interface Attachment {
  name: string;
  content: string;
}

export function NewProjectForm() {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [planLimitHit, setPlanLimitHit] = useState(false);
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [attachError, setAttachError] = useState<string | null>(null);
  const [enhancing, setEnhancing] = useState(false);
  const [enhanceError, setEnhanceError] = useState<string | null>(null);
  const [advancedMode, setAdvancedMode] = useState(false);
  const [advancedNotes, setAdvancedNotes] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function buildMessage(): string {
    let message = prompt.trim();
    if (advancedMode && advancedNotes.trim()) {
      message += `\n\nTechnical requirements:\n${advancedNotes.trim()}`;
    }
    if (attachment) {
      message += `\n\nAttached file: ${attachment.name}\n\`\`\`\n${attachment.content}\n\`\`\``;
    }
    return message;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!prompt.trim() || loading) return;
    setLoading(true);
    setError(null);
    setPlanLimitHit(false);
    try {
      const projectRes = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Untitled app" }),
      });
      if (!projectRes.ok) {
        const data = await projectRes.json().catch(() => null);
        if (data?.code === "PLAN_LIMIT" && typeof data?.error === "string") {
          setError(data.error);
          setPlanLimitHit(true);
        } else {
          setError("Couldn't create the project. Try again.");
        }
        return;
      }
      const project = await projectRes.json();
      await fetch(`/api/projects/${project.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: buildMessage() }),
      });
      fetch(`/api/projects/${project.id}/generate`, { method: "POST" }).catch(() => {});
      router.push(`/projects/${project.id}`);
    } catch {
      setError("Couldn't create the project. Try again.");
    } finally {
      setLoading(false);
    }
  }

  function applyIdea(idea: Idea) {
    setPrompt(idea.prompt);
    textareaRef.current?.focus();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setAttachError(null);
    if (file.size > MAX_ATTACHMENT_BYTES) {
      setAttachError("File is too large — attach something under 100KB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setAttachment({ name: file.name, content: String(reader.result ?? "") });
    };
    reader.onerror = () => setAttachError("Couldn't read that file.");
    reader.readAsText(file);
  }

  async function enhancePrompt() {
    const trimmed = prompt.trim();
    if (!trimmed || enhancing) return;
    setEnhancing(true);
    setEnhanceError(null);
    try {
      const res = await fetch("/api/prompt/enhance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        setEnhanceError(typeof data.error === "string" ? data.error : "Couldn't enhance the prompt.");
        return;
      }
      setPrompt(data.enhanced);
      textareaRef.current?.focus();
    } catch {
      setEnhanceError("Couldn't enhance the prompt.");
    } finally {
      setEnhancing(false);
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
        {(attachment || attachError) && (
          <div className="flex flex-wrap items-center gap-1.5 px-1 pb-1.5">
            {attachment && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-black/5 py-1 pl-2.5 pr-1.5 text-xs text-black/70">
                <svg viewBox="0 0 16 16" fill="none" className="h-3 w-3 shrink-0 text-black/40" aria-hidden>
                  <path
                    d="M11.5 6.5 6.9 11a2 2 0 1 1-2.8-2.8l5-5a3 3 0 1 1 4.2 4.2L8 12.7"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span className="max-w-[10rem] truncate">{attachment.name}</span>
                <button
                  type="button"
                  onClick={() => setAttachment(null)}
                  title="Remove attachment"
                  className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-black/40 hover:bg-black/10 hover:text-black"
                >
                  <svg viewBox="0 0 16 16" fill="none" className="h-2.5 w-2.5" aria-hidden>
                    <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </button>
              </span>
            )}
            {attachError && <span className="text-xs text-red-600">{attachError}</span>}
          </div>
        )}

        {advancedMode && (
          <div className="px-1 pb-2">
            <textarea
              value={advancedNotes}
              onChange={(e) => setAdvancedNotes(e.target.value)}
              placeholder="Technical requirements: specific data fields, APIs, edge cases..."
              rows={2}
              className="w-full resize-none rounded-lg border border-black/10 bg-black/[0.015] px-2.5 py-1.5 text-sm outline-none placeholder:text-black/40 focus:border-black/20"
            />
          </div>
        )}

        <input ref={fileInputRef} type="file" accept={ATTACHMENT_ACCEPT} onChange={handleFileChange} className="hidden" />

        <div className="flex items-center justify-between px-1 pt-1">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              title="Attach a file"
              onClick={() => fileInputRef.current?.click()}
              className={`flex h-8 w-8 items-center justify-center rounded-lg border transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6366f1] ${
                attachment
                  ? "border-black/20 bg-black/5 text-black"
                  : "border-black/10 text-black/50 hover:border-black/20 hover:text-black"
              }`}
            >
              <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5" aria-hidden>
                <path
                  d="M11.5 6.5 6.9 11a2 2 0 1 1-2.8-2.8l5-5a3 3 0 1 1 4.2 4.2L8 12.7"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <button
              type="button"
              title="Enhance prompt"
              onClick={enhancePrompt}
              disabled={enhancing || !prompt.trim()}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-black/10 text-[#6366f1] transition hover:border-black/20 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6366f1]"
            >
              {enhancing ? (
                <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5 animate-spin" aria-hidden>
                  <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" strokeOpacity="0.25" />
                  <path d="M14 8a6 6 0 0 0-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              ) : (
                <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5" aria-hidden>
                  <path d="M8 1.5 9 6l4.5 1L9 8l-1 4.5L7 8 2.5 7 7 6l1-4.5Z" />
                </svg>
              )}
            </button>
            <button
              type="button"
              title="Advanced mode"
              onClick={() => setAdvancedMode((v) => !v)}
              aria-pressed={advancedMode}
              className={`flex h-8 w-8 items-center justify-center rounded-lg border transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6366f1] ${
                advancedMode
                  ? "border-black/20 bg-black/5 text-black"
                  : "border-black/10 text-black/50 hover:border-black/20 hover:text-black"
              }`}
            >
              <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5" aria-hidden>
                <path
                  d="M5.5 4 2 8l3.5 4M10.5 4 14 8l-3.5 4"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <span className="ml-1 hidden text-xs text-black/40 sm:inline">Enter to build · Shift+Enter for a new line</span>
          </div>
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

      {error && (
        <p className="mt-2 text-sm text-red-600">
          {error}
          {planLimitHit && (
            <>
              {" "}
              <a href="/pricing" className="font-medium underline hover:no-underline">
                View plans
              </a>
            </>
          )}
        </p>
      )}
      {enhanceError && <p className="mt-2 text-sm text-red-600">{enhanceError}</p>}

      <div className="mt-10">
        <h2 className="mb-3 flex items-center gap-1.5 text-left text-sm font-semibold text-black">
          <svg viewBox="0 0 16 16" fill="#6366f1" className="h-3.5 w-3.5" aria-hidden>
            <path d="M8 1.5 9 6l4.5 1L9 8l-1 4.5L7 8 2.5 7 7 6l1-4.5Z" />
          </svg>
          Try these popular ideas
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {IDEAS.map((idea) => (
            <button
              key={idea.title}
              type="button"
              onClick={() => applyIdea(idea)}
              className="flex items-start gap-3 rounded-2xl border border-black/10 bg-white p-3.5 text-left transition hover:-translate-y-0.5 hover:border-black/20 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6366f1]"
            >
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${idea.color}`}>
                <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4" aria-hidden>
                  {idea.icon}
                </svg>
              </span>
              <span>
                <span className="block text-sm font-medium text-black">{idea.title}</span>
                <span className="mt-0.5 block text-xs text-black/50">{idea.description}</span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

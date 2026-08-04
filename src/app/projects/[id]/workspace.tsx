"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LogoMark } from "@/components/logo";
import { StatusBadge } from "@/components/status-badge";
import { CodeBlock } from "@/components/code-highlight";

interface Message {
  id: string;
  role: "USER" | "ASSISTANT" | "SYSTEM";
  content: string;
}

interface GeneratedFile {
  path: string;
  content: string;
}

interface PlannedFile {
  path: string;
  purpose: string;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type TreeNode =
  | { type: "file"; name: string; path: string }
  | { type: "dir"; name: string; path: string; children: TreeNode[] };

function buildFileTree(files: GeneratedFile[]): TreeNode[] {
  const root: TreeNode[] = [];
  for (const file of files) {
    const parts = file.path.split("/");
    let level = root;
    let currentPath = "";
    parts.forEach((part, i) => {
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      const isFile = i === parts.length - 1;
      let node = level.find((n) => n.name === part && n.type === (isFile ? "file" : "dir"));
      if (!node) {
        node = isFile
          ? { type: "file", name: part, path: currentPath }
          : { type: "dir", name: part, path: currentPath, children: [] };
        level.push(node);
      }
      if (node.type === "dir") level = node.children;
    });
  }
  const sort = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => (a.type !== b.type ? (a.type === "dir" ? -1 : 1) : a.name.localeCompare(b.name)));
    nodes.forEach((n) => n.type === "dir" && sort(n.children));
  };
  sort(root);
  return root;
}

const EXTENSION_COLORS: Record<string, string> = {
  md: "bg-slate-400",
  json: "bg-amber-400",
  toml: "bg-orange-400",
  prisma: "bg-indigo-400",
  liquid: "bg-emerald-400",
  css: "bg-pink-400",
  jsx: "bg-sky-400",
  tsx: "bg-sky-400",
  js: "bg-yellow-400",
  ts: "bg-blue-400",
};

function fileDotColor(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  return EXTENSION_COLORS[ext] ?? "bg-black/25";
}

interface DataModel {
  name: string;
  fields: string[];
}

interface AppPlan {
  summary: string;
  features: string[];
  dataModels: DataModel[];
  shopifyApis: string[];
  logoUrl?: string;
}

interface DeploymentStatus {
  appVersion: string;
  shopifyOrgId: string | null;
  hasShopifyPartnerToken: boolean;
  hostingProvider: string | null;
  hasHostingToken: boolean;
}

const HOSTING_PROVIDERS = ["FLY", "RENDER", "RAILWAY", "HEROKU", "VM"] as const;
const HOSTING_PROVIDER_LABELS: Record<(typeof HOSTING_PROVIDERS)[number], string> = {
  FLY: "Fly.io",
  RENDER: "Render",
  RAILWAY: "Railway",
  HEROKU: "Heroku",
  VM: "VM / other",
};

function DeploymentPanel({
  projectId,
  status,
  onSaved,
}: {
  projectId: string;
  status: DeploymentStatus;
  onSaved: (status: DeploymentStatus) => void;
}) {
  const [appVersion, setAppVersion] = useState(status.appVersion);
  const [shopifyOrgId, setShopifyOrgId] = useState(status.shopifyOrgId ?? "");
  const [shopifyPartnerToken, setShopifyPartnerToken] = useState("");
  const [hostingProvider, setHostingProvider] = useState<string>(status.hostingProvider ?? "");
  const [hostingToken, setHostingToken] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/deployment`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appVersion,
          shopifyOrgId,
          ...(shopifyPartnerToken ? { shopifyPartnerToken } : {}),
          hostingProvider: hostingProvider || null,
          ...(hostingToken ? { hostingToken } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Failed to save deployment settings");
        return;
      }
      setShopifyPartnerToken("");
      setHostingToken("");
      setSaved(true);
      onSaved(data);
    } catch {
      setError("Failed to save deployment settings");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl border border-black/10 p-4">
      <label className="mb-1 block text-xs font-medium uppercase text-black/40">Deployment credentials</label>
      <p className="mb-3 text-xs text-black/40">
        Credentials used later to install this app on a store and deploy it to a host. Stored encrypted — tokens
        are never sent back to the browser once saved.
      </p>

      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-xs text-black/50">App version</label>
          <input
            className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm"
            value={appVersion}
            onChange={(e) => setAppVersion(e.target.value)}
          />
        </div>

        <div>
          <label className="mb-1 block text-xs text-black/50">Shopify Partner organization ID</label>
          <input
            className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm"
            value={shopifyOrgId}
            onChange={(e) => setShopifyOrgId(e.target.value)}
          />
        </div>

        <div>
          <label className="mb-1 block text-xs text-black/50">
            Shopify Partner API token {status.hasShopifyPartnerToken && <span className="text-emerald-600">(set)</span>}
          </label>
          <input
            type="password"
            className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm"
            placeholder={status.hasShopifyPartnerToken ? "•••••••• (leave blank to keep)" : "Paste a Partner API token"}
            value={shopifyPartnerToken}
            onChange={(e) => setShopifyPartnerToken(e.target.value)}
          />
        </div>

        <div>
          <label className="mb-1 block text-xs text-black/50">Hosting provider</label>
          <select
            className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm"
            value={hostingProvider}
            onChange={(e) => setHostingProvider(e.target.value)}
          >
            <option value="">Not set</option>
            {HOSTING_PROVIDERS.map((p) => (
              <option key={p} value={p}>
                {HOSTING_PROVIDER_LABELS[p]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs text-black/50">
            Hosting API token {status.hasHostingToken && <span className="text-emerald-600">(set)</span>}
          </label>
          <input
            type="password"
            className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm"
            placeholder={status.hasHostingToken ? "•••••••• (leave blank to keep)" : "Paste a hosting API token"}
            value={hostingToken}
            onChange={(e) => setHostingToken(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-3 pt-1">
          <button
            onClick={save}
            disabled={saving}
            className="rounded-full bg-black px-5 py-2 text-xs font-medium text-white transition hover:bg-black/85 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save deployment settings"}
          </button>
          {saved && <span className="text-xs font-medium text-emerald-600">✓ Saved</span>}
          {error && <span className="text-xs text-red-600">{error}</span>}
        </div>
      </div>
    </div>
  );
}

interface InstallStatus {
  status: "NONE" | "INSTALLED" | "FAILED";
  shopDomain: string | null;
  grantedScopes: string | null;
  installedAt: string | null;
  error: string | null;
}

function InstallPanel({
  projectId,
  status,
  onSaved,
}: {
  projectId: string;
  status: InstallStatus;
  onSaved: (status: InstallStatus) => void;
}) {
  const [shopDomain, setShopDomain] = useState(status.shopDomain ?? "");
  const [adminAccessToken, setAdminAccessToken] = useState("");
  const [installing, setInstalling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  async function install() {
    setInstalling(true);
    setError(null);
    setWarning(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/install`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shopDomain, adminAccessToken }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Failed to install");
        return;
      }
      setAdminAccessToken("");
      if (data.warning) setWarning(data.warning);
      onSaved({
        status: "INSTALLED",
        shopDomain: data.shopDomain,
        grantedScopes: Array.isArray(data.grantedScopes) ? data.grantedScopes.join(",") : null,
        installedAt: new Date().toISOString(),
        error: null,
      });
    } catch {
      setError("Failed to install");
    } finally {
      setInstalling(false);
    }
  }

  return (
    <div className="rounded-xl border border-black/10 p-4">
      <label className="mb-1 block text-xs font-medium uppercase text-black/40">Install on your store</label>
      <p className="mb-3 text-xs text-black/40">
        This is a private app — create a custom app directly in your store admin (Settings &gt; Apps and sales
        channels &gt; Develop apps), install it, then paste the Admin API access token here. No Partner account or
        OAuth needed.
      </p>

      {status.status === "INSTALLED" && (
        <p className="mb-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
          ✓ Installed on <span className="font-medium">{status.shopDomain}</span>
          {status.grantedScopes && <> — scopes: {status.grantedScopes}</>}
        </p>
      )}

      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-xs text-black/50">Store domain</label>
          <input
            className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm"
            placeholder="your-store.myshopify.com"
            value={shopDomain}
            onChange={(e) => setShopDomain(e.target.value)}
          />
        </div>

        <div>
          <label className="mb-1 block text-xs text-black/50">
            Admin API access token {status.status === "INSTALLED" && <span className="text-emerald-600">(set)</span>}
          </label>
          <input
            type="password"
            className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm"
            placeholder={status.status === "INSTALLED" ? "•••••••• (leave blank to keep)" : "shpat_..."}
            value={adminAccessToken}
            onChange={(e) => setAdminAccessToken(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-3 pt-1">
          <button
            onClick={install}
            disabled={installing || !shopDomain || !adminAccessToken}
            className="rounded-full bg-black px-5 py-2 text-xs font-medium text-white transition hover:bg-black/85 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {installing ? "Installing..." : "Verify & install"}
          </button>
        </div>
        {warning && <p className="text-xs text-amber-600">{warning}</p>}
        {error && <p className="text-xs text-red-600">{error}</p>}
        {status.status === "FAILED" && status.error && !error && (
          <p className="text-xs text-red-600">{status.error}</p>
        )}
      </div>
    </div>
  );
}

interface DeployStatus {
  available: boolean;
  status: "NONE" | "DEPLOYING" | "DEPLOYED" | "FAILED";
  url: string | null;
  deployedAt: string | null;
  error: string | null;
}

function DeployPanel({
  projectId,
  status,
  hasGeneratedApp,
  onSaved,
}: {
  projectId: string;
  status: DeployStatus;
  hasGeneratedApp: boolean;
  onSaved: (status: DeployStatus) => void;
}) {
  const [deploying, setDeploying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoFixLog, setAutoFixLog] = useState<{ attempt: number; diagnosis: string }[]>([]);

  async function deploy() {
    setDeploying(true);
    setError(null);
    setAutoFixLog([]);
    try {
      const res = await fetch(`/api/projects/${projectId}/deploy`, { method: "POST" });
      const data = await res.json();
      if (Array.isArray(data.autoFixLog)) setAutoFixLog(data.autoFixLog);
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Deploy failed");
        onSaved({ ...status, status: "FAILED", error: typeof data.error === "string" ? data.error : "Deploy failed" });
        return;
      }
      onSaved({ ...status, status: "DEPLOYED", url: data.url, deployedAt: new Date().toISOString(), error: null });
    } catch {
      setError("Deploy failed");
    } finally {
      setDeploying(false);
    }
  }

  if (!status.available) {
    return (
      <div className="rounded-xl border border-black/10 p-4">
        <label className="mb-1 block text-xs font-medium uppercase text-black/40">Deploy</label>
        <p className="text-xs text-black/40">Deploy automation isn&apos;t configured on this server.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-black/10 p-4">
      <label className="mb-1 block text-xs font-medium uppercase text-black/40">Deploy</label>
      <p className="mb-3 text-xs text-black/40">
        Builds and ships the generated app to hosting. If the build fails, we&apos;ll automatically diagnose the
        error, patch the code, and retry once before giving up.
      </p>

      {status.status === "DEPLOYED" && status.url && (
        <p className="mb-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
          ✓ Deployed —{" "}
          <a href={status.url} target="_blank" rel="noreferrer" className="underline">
            {status.url}
          </a>
        </p>
      )}

      <button
        onClick={deploy}
        disabled={deploying || !hasGeneratedApp}
        className="rounded-full bg-black px-5 py-2 text-xs font-medium text-white transition hover:bg-black/85 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {deploying ? "Deploying..." : status.status === "DEPLOYED" ? "Redeploy" : "Deploy"}
      </button>

      {autoFixLog.length > 0 && (
        <div className="mt-3 space-y-1">
          {autoFixLog.map((entry) => (
            <p key={entry.attempt} className="text-xs text-amber-600">
              Auto-fix attempt {entry.attempt}: {entry.diagnosis}
            </p>
          ))}
        </div>
      )}
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      {status.status === "FAILED" && status.error && !error && (
        <p className="mt-2 text-xs text-red-600">{status.error}</p>
      )}
    </div>
  );
}

function GithubPanel({
  projectId,
  hasGeneratedApp,
  repoFullName,
  repoUrl,
  onConnected,
  onDisconnected,
}: {
  projectId: string;
  hasGeneratedApp: boolean;
  repoFullName: string | null;
  repoUrl: string | null;
  onConnected: (result: { repoFullName: string | null; repoUrl: string | null }) => void;
  onDisconnected: () => void;
}) {
  const [connecting, setConnecting] = useState(false);
  const [pushing, setPushing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pushResult, setPushResult] = useState<string | null>(null);

  function connect() {
    setError(null);
    setConnecting(true);
    const popup = window.open(
      `/api/github/oauth/start?projectId=${projectId}`,
      "github-oauth",
      "width=600,height=700",
    );
    if (!popup) {
      setConnecting(false);
      setError("Couldn't open the GitHub authorization popup — check your browser's popup blocker.");
      return;
    }

    let settled = false;
    function onMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      if (!event.data || event.data.source !== "github-oauth") return;
      settled = true;
      window.removeEventListener("message", onMessage);
      setConnecting(false);
      if (!event.data.ok) {
        setError(typeof event.data.error === "string" ? event.data.error : "Failed to connect to GitHub");
        return;
      }
      onConnected({ repoFullName: event.data.repoFullName, repoUrl: event.data.repoUrl });
    }
    window.addEventListener("message", onMessage);

    const poll = setInterval(() => {
      if (popup.closed) {
        clearInterval(poll);
        window.removeEventListener("message", onMessage);
        if (!settled) setConnecting(false);
      }
    }, 500);
  }

  async function disconnect() {
    setError(null);
    const res = await fetch(`/api/projects/${projectId}/github`, { method: "DELETE" });
    if (res.ok) onDisconnected();
  }

  async function push() {
    setPushing(true);
    setError(null);
    setPushResult(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/github/push`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Failed to push to GitHub");
        return;
      }
      setPushResult(`Pushed ${data.pushed} file(s).`);
    } catch {
      setError("Failed to push to GitHub");
    } finally {
      setPushing(false);
    }
  }

  return (
    <div className="rounded-xl border border-black/10 p-4">
      <label className="mb-1 block text-xs font-medium uppercase text-black/40">GitHub</label>
      {repoFullName ? (
        <div className="space-y-3">
          <p className="text-black/70">
            Connected to{" "}
            <a href={repoUrl ?? "#"} target="_blank" rel="noreferrer" className="font-medium underline">
              {repoFullName}
            </a>
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={push}
              disabled={pushing || !hasGeneratedApp}
              className="rounded-full bg-black px-4 py-2 text-xs font-medium text-white transition hover:bg-black/85 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pushing ? "Pushing..." : "Push latest files"}
            </button>
            <button onClick={disconnect} className="text-xs text-black/50 hover:text-red-600">
              Disconnect
            </button>
          </div>
          {!hasGeneratedApp && <p className="text-xs text-black/40">Generate the app before pushing.</p>}
          {pushResult && <p className="text-xs font-medium text-emerald-600">✓ {pushResult}</p>}
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-black/40">
            Connect your GitHub account to create a repository and push generated files to it. You&apos;ll be
            asked on GitHub to grant permission before anything is created.
          </p>
          <button
            onClick={connect}
            disabled={connecting}
            className="flex items-center gap-2 rounded-full bg-black px-4 py-2 text-xs font-medium text-white transition hover:bg-black/85 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 shrink-0 fill-current" aria-hidden>
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
            </svg>
            {connecting ? "Waiting for GitHub…" : "Connect GitHub"}
          </button>
        </div>
      )}
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}

function ConfigurePanel({
  projectId,
  name,
  description,
  plan,
  hasGeneratedApp,
  githubRepoFullName,
  githubRepoUrl,
  deploymentStatus,
  installStatus,
  deployStatus,
  onSaved,
  onGithubConnected,
  onGithubDisconnected,
  onDeploymentSaved,
  onInstallSaved,
  onDeploySaved,
  onDeleted,
}: {
  projectId: string;
  name: string;
  description: string | null;
  plan: AppPlan | null;
  hasGeneratedApp: boolean;
  githubRepoFullName: string | null;
  githubRepoUrl: string | null;
  deploymentStatus: DeploymentStatus;
  installStatus: InstallStatus;
  deployStatus: DeployStatus;
  onSaved: (result: { name: string; description: string | null; plan: AppPlan | null }) => void;
  onGithubConnected: (result: { repoFullName: string | null; repoUrl: string | null }) => void;
  onGithubDisconnected: () => void;
  onDeploymentSaved: (status: DeploymentStatus) => void;
  onInstallSaved: (status: InstallStatus) => void;
  onDeploySaved: (status: DeployStatus) => void;
  onDeleted: () => void;
}) {
  const [formName, setFormName] = useState(name);
  const [formDescription, setFormDescription] = useState(description ?? "");
  const [features, setFeatures] = useState<string[]>(plan?.features ?? []);
  const [shopifyApis, setShopifyApis] = useState<string[]>(plan?.shopifyApis ?? []);
  const [dataModels, setDataModels] = useState<DataModel[]>(plan?.dataModels ?? []);
  const [logoUrl, setLogoUrl] = useState(plan?.logoUrl ?? "");
  const [logoError, setLogoError] = useState(false);
  const [generalSaving, setGeneralSaving] = useState(false);
  const [generalSaveError, setGeneralSaveError] = useState<string | null>(null);
  const [generalSaved, setGeneralSaved] = useState(false);
  const [planSaving, setPlanSaving] = useState(false);
  const [planSaveError, setPlanSaveError] = useState<string | null>(null);
  const [planSaved, setPlanSaved] = useState(false);
  const [syncedName, setSyncedName] = useState(name);
  const [syncedDescription, setSyncedDescription] = useState(description);
  const [syncedPlan, setSyncedPlan] = useState(plan);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [settingsTab, setSettingsTab] = useState<"general" | "integrations" | "danger">("general");

  if (name !== syncedName || description !== syncedDescription || plan !== syncedPlan) {
    setSyncedName(name);
    setSyncedDescription(description);
    setSyncedPlan(plan);
    setFormName(name);
    setFormDescription(description ?? "");
    setFeatures(plan?.features ?? []);
    setShopifyApis(plan?.shopifyApis ?? []);
    setDataModels(plan?.dataModels ?? []);
    setLogoUrl(plan?.logoUrl ?? "");
    setLogoError(false);
  }

  function updateListItem(list: string[], setList: (v: string[]) => void, index: number, value: string) {
    setList(list.map((item, i) => (i === index ? value : item)));
  }

  async function saveGeneral() {
    setGeneralSaving(true);
    setGeneralSaveError(null);
    setGeneralSaved(false);
    try {
      const res = await fetch(`/api/projects/${projectId}/config`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: formName, description: formDescription }),
      });
      if (!res.ok) {
        const data = await res.json();
        setGeneralSaveError(typeof data.error === "string" ? data.error : "Failed to save");
        return;
      }
      const data = await res.json();
      setGeneralSaved(true);
      onSaved({ name: data.project.name, description: data.project.description, plan: data.plan ?? plan });
    } catch {
      setGeneralSaveError("Failed to save");
    } finally {
      setGeneralSaving(false);
    }
  }

  async function saveAppPlan() {
    if (!plan) return;
    setPlanSaving(true);
    setPlanSaveError(null);
    setPlanSaved(false);
    try {
      const res = await fetch(`/api/projects/${projectId}/config`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ features, shopifyApis, dataModels, logoUrl }),
      });
      if (!res.ok) {
        const data = await res.json();
        setPlanSaveError(typeof data.error === "string" ? data.error : "Failed to save");
        return;
      }
      const data = await res.json();
      setPlanSaved(true);
      onSaved({ name: data.project.name, description: data.project.description, plan: data.plan });
    } catch {
      setPlanSaveError("Failed to save");
    } finally {
      setPlanSaving(false);
    }
  }

  async function deleteProject() {
    if (deleting) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}`, { method: "DELETE" });
      if (!res.ok) {
        setDeleteError("Failed to delete project");
        return;
      }
      onDeleted();
    } catch {
      setDeleteError("Failed to delete project");
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  }

  const SETTINGS_TABS = [
    { key: "general" as const, label: "General & plan" },
    { key: "integrations" as const, label: "Integrations & deploy" },
    { key: "danger" as const, label: "Danger zone" },
  ];

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex gap-1 border-b border-black/10 px-6 pt-4">
        {SETTINGS_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setSettingsTab(tab.key)}
            className={`rounded-t-lg px-3 py-2 text-xs font-medium transition ${
              settingsTab === tab.key
                ? "border-b-2 border-black text-black"
                : "border-b-2 border-transparent text-black/40 hover:text-black/70"
            } ${tab.key === "danger" && settingsTab === tab.key ? "border-red-600 text-red-700" : ""}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5 text-sm">
      <div className="mx-auto max-w-xl space-y-8">
        <section className={`space-y-4 ${settingsTab === "general" ? "" : "hidden"}`}>
          <div>
            <h2 className="text-sm font-semibold text-black">General</h2>
            <p className="mt-0.5 text-xs text-black/40">Basic identity for this app.</p>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium uppercase text-black/40">App name</label>
            <input
              className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium uppercase text-black/40">Description</label>
            <textarea
              className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm"
              rows={2}
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={saveGeneral}
              disabled={generalSaving}
              className="rounded-full bg-black px-5 py-2 text-xs font-medium text-white transition hover:bg-black/85 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {generalSaving ? "Saving..." : "Save general"}
            </button>
            {generalSaved && <span className="text-xs font-medium text-emerald-600">✓ Saved</span>}
            {generalSaveError && <span className="text-xs text-red-600">{generalSaveError}</span>}
          </div>
        </section>

        <section className={`space-y-4 border-t border-black/10 pt-6 ${settingsTab === "general" ? "" : "hidden"}`}>
          <div>
            <h2 className="text-sm font-semibold text-black">App plan</h2>
            <p className="mt-0.5 text-xs text-black/40">
              {plan
                ? "Generated from your conversation — edit anything before your next deploy."
                : "Features, Shopify APIs, and data models become editable here after you generate the app."}
            </p>
          </div>

          {plan?.summary && (
            <div>
              <label className="mb-1 block text-xs font-medium uppercase text-black/40">Plan summary</label>
              <p className="rounded-xl bg-black/5 px-3 py-2 text-black/70">{plan.summary}</p>
            </div>
          )}

          {plan && (
            <>
            <div className="space-y-4">
            <div className="rounded-xl border border-black/10 p-4">
              <label className="mb-1 block text-xs font-medium uppercase text-black/40">App icon</label>
              <div className="flex items-center gap-3">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-black/10 bg-black/5">
                  {logoUrl && !logoError ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={logoUrl}
                      alt="App icon preview"
                      className="h-full w-full object-cover"
                      onError={() => setLogoError(true)}
                      onLoad={() => setLogoError(false)}
                    />
                  ) : (
                    <span className="text-[10px] text-black/30">No icon</span>
                  )}
                </div>
                <div className="flex-1">
                  <input
                    className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm"
                    placeholder="https://example.com/icon.png"
                    value={logoUrl}
                    onChange={(e) => {
                      setLogoUrl(e.target.value);
                      setLogoError(false);
                    }}
                  />
                  {logoError && <p className="mt-1 text-xs text-red-600">Couldn&apos;t load image from that URL.</p>}
                  <p className="mt-1 text-xs text-black/40">
                    Used as this app&apos;s icon in the Shopify Partner Dashboard and app listing.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-black/10 p-4">
              <div className="mb-1 flex items-center justify-between">
                <label className="text-xs font-medium uppercase text-black/40">Features</label>
                <button
                  onClick={() => setFeatures([...features, ""])}
                  className="text-xs text-black/50 hover:text-black"
                >
                  + Add
                </button>
              </div>
              <div className="space-y-2">
                {features.map((feature, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      className="flex-1 rounded-lg border border-black/10 px-3 py-1.5 text-sm"
                      value={feature}
                      onChange={(e) => updateListItem(features, setFeatures, i, e.target.value)}
                    />
                    <button
                      onClick={() => setFeatures(features.filter((_, idx) => idx !== i))}
                      className="rounded-lg px-2 text-black/40 hover:bg-red-50 hover:text-red-600"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                {features.length === 0 && <p className="text-xs text-black/40">No features yet.</p>}
              </div>
            </div>

            <div className="rounded-xl border border-black/10 p-4">
              <div className="mb-1 flex items-center justify-between">
                <label className="text-xs font-medium uppercase text-black/40">Shopify APIs</label>
                <button
                  onClick={() => setShopifyApis([...shopifyApis, ""])}
                  className="text-xs text-black/50 hover:text-black"
                >
                  + Add
                </button>
              </div>
              <div className="space-y-2">
                {shopifyApis.map((api, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      className="flex-1 rounded-lg border border-black/10 px-3 py-1.5 text-sm"
                      value={api}
                      onChange={(e) => updateListItem(shopifyApis, setShopifyApis, i, e.target.value)}
                    />
                    <button
                      onClick={() => setShopifyApis(shopifyApis.filter((_, idx) => idx !== i))}
                      className="rounded-lg px-2 text-black/40 hover:bg-red-50 hover:text-red-600"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                {shopifyApis.length === 0 && <p className="text-xs text-black/40">No Shopify APIs yet.</p>}
              </div>
            </div>

            <div className="rounded-xl border border-black/10 p-4">
              <div className="mb-1 flex items-center justify-between">
                <label className="text-xs font-medium uppercase text-black/40">Data models</label>
                <button
                  onClick={() => setDataModels([...dataModels, { name: "", fields: [] }])}
                  className="text-xs text-black/50 hover:text-black"
                >
                  + Add
                </button>
              </div>
              <div className="space-y-3">
                {dataModels.map((model, i) => (
                  <div key={i} className="space-y-1.5 rounded-xl border border-black/10 p-3">
                    <div className="flex gap-2">
                      <input
                        className="flex-1 rounded-lg border border-black/10 px-3 py-1.5 text-sm"
                        placeholder="Model name"
                        value={model.name}
                        onChange={(e) =>
                          setDataModels(dataModels.map((m, idx) => (idx === i ? { ...m, name: e.target.value } : m)))
                        }
                      />
                      <button
                        onClick={() => setDataModels(dataModels.filter((_, idx) => idx !== i))}
                        className="rounded-lg px-2 text-black/40 hover:bg-red-50 hover:text-red-600"
                      >
                        ✕
                      </button>
                    </div>
                    <input
                      className="w-full rounded-lg border border-black/10 px-3 py-1.5 text-xs"
                      placeholder="Fields (comma separated)"
                      value={model.fields.join(", ")}
                      onChange={(e) =>
                        setDataModels(
                          dataModels.map((m, idx) =>
                            idx === i
                              ? { ...m, fields: e.target.value.split(",").map((f) => f.trim()).filter(Boolean) }
                              : m,
                          ),
                        )
                      }
                    />
                  </div>
                ))}
                {dataModels.length === 0 && <p className="text-xs text-black/40">No data models yet.</p>}
              </div>
            </div>
            </div>

            <div className="flex items-center gap-3 pt-1">
              <button
                onClick={saveAppPlan}
                disabled={planSaving}
                className="rounded-full bg-black px-5 py-2 text-xs font-medium text-white transition hover:bg-black/85 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {planSaving ? "Saving..." : "Save app plan"}
              </button>
              {planSaved && <span className="text-xs font-medium text-emerald-600">✓ Saved</span>}
              {planSaveError && <span className="text-xs text-red-600">{planSaveError}</span>}
            </div>
            </>
          )}
        </section>

        <section className={`space-y-4 ${settingsTab === "integrations" ? "" : "hidden"}`}>
          <div>
            <h2 className="text-sm font-semibold text-black">Integrations & deploy</h2>
            <p className="mt-0.5 text-xs text-black/40">
              Source control, hosting credentials, storefront install, and deployment — each independent of the others.
            </p>
          </div>

          <GithubPanel
            projectId={projectId}
            hasGeneratedApp={hasGeneratedApp}
            repoFullName={githubRepoFullName}
            repoUrl={githubRepoUrl}
            onConnected={onGithubConnected}
            onDisconnected={onGithubDisconnected}
          />

          <DeploymentPanel projectId={projectId} status={deploymentStatus} onSaved={onDeploymentSaved} />

          <InstallPanel projectId={projectId} status={installStatus} onSaved={onInstallSaved} />

          <DeployPanel
            projectId={projectId}
            status={deployStatus}
            hasGeneratedApp={hasGeneratedApp}
            onSaved={onDeploySaved}
          />
        </section>

        <section className={`space-y-3 ${settingsTab === "danger" ? "" : "hidden"}`}>
          <div>
            <h2 className="text-sm font-semibold text-red-700">Danger zone</h2>
            <p className="mt-0.5 text-xs text-red-700/70">
              Permanently delete this project, its chat history, and any generated code.
            </p>
          </div>
          {deleteError && <p className="text-xs text-red-600">{deleteError}</p>}
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            disabled={deleting}
            className="rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            {deleting ? "Deleting…" : "Delete project"}
          </button>
        </section>
      </div>
      </div>

      {showDeleteConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => !deleting && setShowDeleteConfirm(false)}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-confirm-title"
            className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="delete-confirm-title" className="font-semibold">
              Delete &quot;{formName}&quot;?
            </h2>
            <p className="mt-1.5 text-sm text-black/60">
              This permanently deletes the project, its chat history, and any generated code. This
              can&apos;t be undone.
            </p>
            {deleteError && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{deleteError}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-black/70 hover:bg-black/5 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={deleteProject}
                disabled={deleting}
                className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? "Deleting…" : "Delete project"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FileTree({
  nodes,
  activeFile,
  onSelect,
  collapsed,
  onToggleDir,
  depth = 0,
}: {
  nodes: TreeNode[];
  activeFile: string | null;
  onSelect: (path: string) => void;
  collapsed: Set<string>;
  onToggleDir: (path: string) => void;
  depth?: number;
}) {
  return (
    <ul className="text-xs">
      {nodes.map((node) => (
        <li key={node.path}>
          {node.type === "dir" ? (
            <>
              <button
                onClick={() => onToggleDir(node.path)}
                className="flex w-full items-center gap-1.5 rounded-md px-1.5 py-1.5 text-left text-black/60 hover:bg-black/5"
                style={{ paddingLeft: 8 + depth * 12 }}
              >
                <svg
                  viewBox="0 0 12 12"
                  className={`h-2.5 w-2.5 shrink-0 text-black/30 transition-transform ${collapsed.has(node.path) ? "" : "rotate-90"}`}
                  fill="currentColor"
                  aria-hidden
                >
                  <path d="M3 1l6 5-6 5V1z" />
                </svg>
                <span className="font-medium">{node.name}</span>
              </button>
              {!collapsed.has(node.path) && (
                <FileTree
                  nodes={node.children}
                  activeFile={activeFile}
                  onSelect={onSelect}
                  collapsed={collapsed}
                  onToggleDir={onToggleDir}
                  depth={depth + 1}
                />
              )}
            </>
          ) : (
            <button
              onClick={() => onSelect(node.path)}
              className={`flex w-full items-center gap-2 truncate rounded-md py-1.5 text-left transition ${
                activeFile === node.path ? "bg-black text-white" : "text-black/60 hover:bg-black/5"
              }`}
              style={{ paddingLeft: 8 + depth * 12 + 15 }}
              title={node.path}
            >
              <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${activeFile === node.path ? "bg-white/70" : fileDotColor(node.name)}`} />
              <span className="truncate">{node.name}</span>
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}

interface TerminalLine {
  id: number;
  kind: "command" | "stdout" | "stderr" | "system";
  text: string;
}

function TerminalPanel({ projectId, hasGeneratedApp }: { projectId: string; hasGeneratedApp: boolean }) {
  const [lines, setLines] = useState<TerminalLine[]>([]);
  const [input, setInput] = useState("");
  const [starting, setStarting] = useState(false);
  const [started, setStarted] = useState(false);
  const [running, setRunning] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const nextId = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  function pushLine(kind: TerminalLine["kind"], text: string) {
    setLines((prev) => [...prev, { id: nextId.current++, kind, text }]);
  }

  useEffect(() => {
    if (!hasGeneratedApp) return;
    let cancelled = false;

    async function start() {
      setStarting(true);
      setStartError(null);
      try {
        const res = await fetch(`/api/projects/${projectId}/terminal/start`, { method: "POST" });
        if (cancelled) return;
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          setStartError(typeof data?.error === "string" ? data.error : "Failed to start terminal session");
          return;
        }
        setStarted(true);
        pushLine("system", "Session ready. Files from the latest generation are mounted at /workspace.");
      } catch {
        if (!cancelled) setStartError("Failed to start terminal session");
      } finally {
        if (!cancelled) setStarting(false);
      }
    }

    start();
    return () => {
      cancelled = true;
    };
  }, [hasGeneratedApp, projectId]);

  useEffect(() => {
    function stopBeacon() {
      navigator.sendBeacon(`/api/projects/${projectId}/terminal/stop`, new Blob());
    }
    window.addEventListener("beforeunload", stopBeacon);
    return () => {
      window.removeEventListener("beforeunload", stopBeacon);
      if (started) stopBeacon();
    };
  }, [projectId, started]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [lines]);

  async function runCommand(e: React.FormEvent) {
    e.preventDefault();
    const command = input.trim();
    if (!command || running || !started) return;
    setInput("");
    pushLine("command", command);
    setRunning(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/terminal/exec`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command }),
      });
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => null);
        pushLine("stderr", typeof data?.error === "string" ? data.error : "Command failed");
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf("\n")) >= 0) {
          const line = buffer.slice(0, newlineIndex).trim();
          buffer = buffer.slice(newlineIndex + 1);
          if (!line) continue;
          const event = JSON.parse(line);
          if (event.type === "stdout" || event.type === "stderr") {
            pushLine(event.type, event.data);
          } else if (event.type === "error") {
            pushLine("stderr", event.error);
          } else if (event.type === "exit" && event.truncated) {
            pushLine("system", "[output truncated]");
          }
        }
      }
    } catch {
      pushLine("stderr", "Command failed — connection interrupted.");
    } finally {
      setRunning(false);
    }
  }

  if (!hasGeneratedApp) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
        <p className="text-sm font-medium text-black/50">Generate an app first</p>
        <p className="text-xs text-black/35">The terminal runs against the latest generated files.</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-[#0b0b0d]">
      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-4 font-mono text-[13px] leading-relaxed"
      >
        {starting && <p className="text-white/60">Starting sandbox…</p>}
        {startError && <p className="break-words text-red-400">{startError}</p>}
        {lines.map((line) => (
          <div
            key={line.id}
            className={`break-words whitespace-pre-wrap ${
              line.kind === "command"
                ? "text-emerald-400"
                : line.kind === "stderr"
                  ? "text-red-400"
                  : line.kind === "system"
                    ? "text-white/60"
                    : "text-white/90"
            }`}
          >
            {line.kind === "command" ? `$ ${line.text}` : line.text}
          </div>
        ))}
        {started && lines.length === 0 && !starting && (
          <p className="text-white/40">$ Ready — type a command below.</p>
        )}
      </div>
      <form onSubmit={runCommand} className="flex gap-2 border-t border-white/10 p-3">
        <input
          className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 font-mono text-[13px] text-white outline-none focus:border-white/25"
          placeholder={started ? "Run a command…" : "Waiting for sandbox…"}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={!started || running}
        />
        <button
          type="submit"
          disabled={!started || running || !input.trim()}
          className="shrink-0 rounded-lg bg-white/10 px-4 py-2 text-xs font-medium text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Run
        </button>
      </form>
    </div>
  );
}

// --- Preview: renders a generated admin route so it can be looked at visually without deploying
// or running it in the terminal. The actual compile-and-run step (src/lib/preview-runtime.tsx)
// only ever executes inside the sandboxed `/preview-frame` iframe below — never in this document —
// because generated code is untrusted LLM output and must not run anywhere with access to this
// app's session cookies, localStorage, or DOM. See PreviewFrame for the sandboxing details.

function AdminChrome({ appName, children }: { appName: string; children: ReactNode }) {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[#f1f1f1]">
      <div className="flex shrink-0 items-center gap-3 bg-[#1a1a1a] px-4 py-2 text-white">
        <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 fill-current" aria-hidden>
          <path d="M12 2 3 6v6c0 5 3.8 8.7 9 10 5.2-1.3 9-5 9-10V6l-9-4Z" />
        </svg>
        <span className="text-sm font-medium">your-store.myshopify.com</span>
        <div className="ml-auto flex items-center gap-3 text-white/60">
          <span className="h-6 w-40 rounded-md bg-white/10" />
          <span className="h-6 w-6 shrink-0 rounded-full bg-white/15" />
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1.5 border-b border-black/10 bg-white px-4 py-2 text-xs text-black/50">
        <span>Apps</span>
        <span aria-hidden>/</span>
        <span className="font-medium text-black/80">{appName}</span>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}

// Label shown on a screen/block's selector pill: the route name (sans app/routes/ prefix and
// extension) for an admin JSX route, or the bare filename for a Liquid theme-extension block.
function previewBlockLabel(path: string): string {
  if (path.endsWith(".liquid")) return path.split("/").pop() ?? path;
  return path.replace(/^app\/routes\//, "").replace(/\.jsx$/, "");
}

function PreviewPanel({ files, appName }: { files: GeneratedFile[]; appName: string }) {
  const previewFiles = useMemo(
    () => files.filter((f) => /^app\/routes\/app\..*\.jsx$/.test(f.path) || f.path.endsWith(".liquid")),
    [files],
  );
  const [selectedPath, setSelectedPath] = useState<string | null>(previewFiles[0]?.path ?? null);
  const selected = previewFiles.find((f) => f.path === selectedPath) ?? previewFiles[0] ?? null;

  if (previewFiles.length === 0) {
    return (
      <AdminChrome appName={appName}>
        <div className="flex h-full flex-col items-center justify-center gap-1 p-10 text-center">
          <p className="text-sm font-medium text-black/50">No admin screen to preview yet</p>
          <p className="text-xs text-black/35">
            Generated files don&apos;t include an app/routes/app.* screen or a .liquid block.
          </p>
        </div>
      </AdminChrome>
    );
  }

  return (
    <AdminChrome appName={appName}>
      <div className="flex flex-wrap gap-1.5 border-b border-black/5 bg-white px-4 py-2">
        {previewFiles.map((f) => (
          <button
            key={f.path}
            onClick={() => setSelectedPath(f.path)}
            className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${
              selected?.path === f.path ? "bg-black text-white" : "bg-black/5 text-black/60 hover:bg-black/10"
            }`}
          >
            {previewBlockLabel(f.path)}
          </button>
        ))}
      </div>
      <PreviewFrame files={files} entry={selected!} />
    </AdminChrome>
  );
}

// Renders the selected generated route inside a sandboxed iframe with no `allow-same-origin`, so
// the untrusted generated code that runs there gets an opaque browser origin: no access to this
// app's cookies/localStorage, no reach into the parent window, and no credentials attached to any
// fetch it issues. Communication is one-way file/entry data out, ready/error status back, over
// postMessage — never widen this to allow-same-origin or a direct (non-iframe) render.
function PreviewFrame({ files, entry }: { files: GeneratedFile[]; entry: GeneratedFile }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [error, setError] = useState<string | null>(null);
  const readyRef = useRef(false);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    function sendRender() {
      setError(null);
      iframe!.contentWindow?.postMessage(
        { source: "preview-frame-host", type: "render", files, entryPath: entry.path },
        "*",
      );
    }

    function onMessage(event: MessageEvent) {
      if (event.source !== iframe!.contentWindow) return;
      const data = event.data;
      if (!data || data.source !== "preview-frame") return;
      if (data.type === "ready") {
        readyRef.current = true;
        sendRender();
      } else if (data.type === "error") {
        setError(typeof data.error === "string" ? data.error : "Couldn't render this screen.");
      }
    }

    window.addEventListener("message", onMessage);
    if (readyRef.current) sendRender();
    return () => window.removeEventListener("message", onMessage);
  }, [files, entry]);

  return (
    <div className="relative h-full min-h-[200px] w-full">
      <iframe
        ref={iframeRef}
        src="/preview-frame.html"
        sandbox="allow-scripts"
        title="App screen preview"
        className="h-full w-full border-0 bg-white"
        onLoad={() => {
          readyRef.current = false;
        }}
      />
      {error && (
        <div className="absolute inset-3 overflow-auto rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Couldn&apos;t render this screen: {error}
        </div>
      )}
    </div>
  );
}

export function Workspace({
  project,
  initialMessages,
  initialFiles,
  initialPlan,
  initialDeployment,
  initialInstall,
  initialDeploy,
}: {
  project: {
    id: string;
    name: string;
    description?: string | null;
    status: string;
    githubRepoFullName?: string | null;
    githubRepoUrl?: string | null;
  };
  initialMessages: Message[];
  initialFiles: GeneratedFile[] | null;
  initialPlan: AppPlan | null;
  initialDeployment: DeploymentStatus;
  initialInstall: InstallStatus;
  initialDeploy: DeployStatus;
}) {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [files, setFiles] = useState<GeneratedFile[] | null>(initialFiles);
  const [activeFile, setActiveFile] = useState<string | null>(initialFiles?.[0]?.path ?? null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [genPhase, setGenPhase] = useState<"idle" | "planning" | "generating">("idle");
  const [plannedFiles, setPlannedFiles] = useState<PlannedFile[] | null>(null);
  const [completedPaths, setCompletedPaths] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"code" | "preview" | "settings" | "terminal">("code");
  const [collapsedDirs, setCollapsedDirs] = useState<Set<string>>(new Set());
  const [appName, setAppName] = useState(project.name);
  const [appDescription, setAppDescription] = useState<string | null>(project.description ?? null);
  const [githubRepoFullName, setGithubRepoFullName] = useState<string | null>(project.githubRepoFullName ?? null);
  const [githubRepoUrl, setGithubRepoUrl] = useState<string | null>(project.githubRepoUrl ?? null);
  const [deploymentStatus, setDeploymentStatus] = useState<DeploymentStatus>(initialDeployment);
  const [installStatus, setInstallStatus] = useState<InstallStatus>(initialInstall);
  const [deployStatus, setDeployStatus] = useState<DeployStatus>(initialDeploy);
  const [plan, setPlan] = useState<AppPlan | null>(initialPlan);
  const [syncedFiles, setSyncedFiles] = useState(initialFiles);
  const [syncedPlan, setSyncedPlan] = useState(initialPlan);

  if (initialFiles !== syncedFiles) {
    setSyncedFiles(initialFiles);
    setFiles(initialFiles);
    setActiveFile((prev) => (prev && initialFiles?.some((f) => f.path === prev) ? prev : (initialFiles?.[0]?.path ?? null)));
  }

  if (initialPlan !== syncedPlan) {
    setSyncedPlan(initialPlan);
    setPlan(initialPlan);
  }

  const fileTree = files ? buildFileTree(files) : [];
  const activeContent = files?.find((f) => f.path === activeFile) ?? null;

  function toggleDir(path: string) {
    setCollapsedDirs((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }

  useEffect(() => {
    if (project.status !== "PLANNING" && project.status !== "GENERATING") return;
    const interval = setInterval(() => router.refresh(), 3000);
    return () => clearInterval(interval);
  }, [project.status, router]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    setSending(true);
    setError(null);
    const res = await fetch(`/api/projects/${project.id}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: input }),
    });
    setSending(false);
    if (!res.ok) {
      setError("Failed to send message");
      return;
    }
    const message = await res.json();
    setMessages((prev) => [...prev, message]);
    setInput("");
    generate();
  }

  async function generate() {
    if (generating) return;
    setGenerating(true);
    setGenPhase("planning");
    setPlannedFiles(null);
    setCompletedPaths(new Set());
    setError(null);
    let localPlannedFiles: PlannedFile[] = [];
    try {
      const res = await fetch(`/api/projects/${project.id}/generate`, { method: "POST" });
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => null);
        setError(typeof data?.error === "string" ? data.error : "Generation failed");
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let done = false;

      while (!done) {
        const { value, done: streamDone } = await reader.read();
        if (streamDone) break;
        buffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf("\n")) >= 0) {
          const line = buffer.slice(0, newlineIndex).trim();
          buffer = buffer.slice(newlineIndex + 1);
          if (!line) continue;
          const event = JSON.parse(line);

          if (event.type === "planning") {
            setGenPhase("planning");
          } else if (event.type === "plan") {
            localPlannedFiles = event.files ?? [];
            setPlannedFiles(localPlannedFiles);
            setGenPhase("generating");
            if (typeof event.projectName === "string") setAppName(event.projectName);
          } else if (event.type === "clarification") {
            setMessages((prev) => [...prev, event.message]);
            if (typeof event.projectName === "string") setAppName(event.projectName);
            done = true;
          } else if (event.type === "error") {
            setError(typeof event.error === "string" ? event.error : "Generation failed");
            done = true;
          } else if (event.type === "result") {
            for (const f of localPlannedFiles) {
              setCompletedPaths((prev) => new Set(prev).add(f.path));
              await delay(120);
            }
            if (typeof event.projectName === "string") setAppName(event.projectName);
            setFiles(event.app?.files ?? null);
            setActiveFile(event.app?.files?.[0]?.path ?? null);
            done = true;
          }
        }
      }
    } catch {
      setError("Generation failed — the request could not be completed. It may still be running in the background; refresh in a moment to check.");
    } finally {
      setGenerating(false);
      setGenPhase("idle");
      router.refresh();
    }
  }

  return (
    <div className="flex h-screen flex-col gap-3 bg-black/[0.02] p-3 sm:flex-row">
      <div className="flex w-full flex-col overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm sm:w-[400px] sm:shrink-0">
        <div className="flex items-center justify-between border-b border-black/10 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <Link href="/dashboard" title="Back to dashboard" className="shrink-0">
              <LogoMark className="h-7 w-7" />
            </Link>
            <Link
              href="/dashboard"
              className="flex shrink-0 items-center gap-1 text-sm text-black/50 hover:text-black"
            >
              <span aria-hidden>←</span> Back
            </Link>
            <div className="h-5 w-px shrink-0 bg-black/10" />
            <div className="min-w-0">
              <h1 className="truncate font-semibold leading-tight">{appName}</h1>
              <StatusBadge status={project.status} />
            </div>
          </div>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
                m.role === "USER" ? "ml-auto rounded-br-md bg-black text-white" : "rounded-bl-md bg-black/5 text-black/80"
              }`}
            >
              {m.content}
            </div>
          ))}
          {generating && genPhase !== "idle" && (
            <div className="max-w-[85%] space-y-2 rounded-2xl rounded-bl-md bg-black/5 px-3.5 py-3 text-sm text-black/80">
              <div className="flex items-center gap-2 font-medium">
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-current" />
                </span>
                {genPhase === "planning" ? "Planning your app…" : "Writing code…"}
              </div>
              {plannedFiles && plannedFiles.length > 0 && (
                <ul className="space-y-1">
                  {plannedFiles.map((f) => {
                    const isDone = completedPaths.has(f.path);
                    return (
                      <li key={f.path} className="flex items-center gap-2 text-xs text-black/60">
                        <span
                          className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full text-[9px] leading-none ${
                            isDone ? "bg-emerald-500 text-white" : "border border-black/20"
                          }`}
                        >
                          {isDone ? "✓" : ""}
                        </span>
                        <span className={`truncate font-mono ${isDone ? "text-black/70" : ""}`}>{f.path}</span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}
          {messages.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center gap-2 py-10 text-center">
              <p className="text-sm text-black/50">
                Describe the Shopify app feature you want, e.g. &quot;Create a loyalty rewards
                system where customers earn points for purchases.&quot;
              </p>
            </div>
          )}
        </div>

        {error && (
          <p className="mx-4 mb-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>
        )}

        <div className="space-y-2 border-t border-black/10 p-3">
          <form onSubmit={sendMessage} className="flex gap-2">
            <input
              className="flex-1 rounded-xl border border-black/10 px-3 py-2 text-sm outline-none focus:border-black/25"
              placeholder="Describe what you want to build..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              className="shrink-0 rounded-xl bg-black px-4 py-2 text-sm font-medium text-white transition hover:bg-black/85 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Send
            </button>
          </form>
          {generating && (
            <div className="flex items-center justify-center gap-1.5 py-1 text-xs text-black/45">
              <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5 animate-spin" aria-hidden>
                <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" strokeOpacity="0.25" />
                <path d="M14 8a6 6 0 0 0-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              Generating your app...
            </div>
          )}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-black/10 px-3 py-2">
          <div className="flex gap-1 rounded-full bg-black/5 p-1">
            {(["code", "preview", "settings", "terminal"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`rounded-full px-3 py-1 text-xs font-medium capitalize transition ${
                  viewMode === mode ? "bg-black text-white shadow-sm" : "text-black/60 hover:text-black"
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
          <div className="flex min-w-0 items-center gap-3">
            {viewMode === "code" && activeFile && (
              <span className="truncate font-mono text-xs text-black/40">{activeFile}</span>
            )}
            {files && files.length > 0 && (
              <a
                href={`/api/projects/${project.id}/download`}
                download
                className="flex shrink-0 items-center gap-1.5 rounded-full border border-black/10 px-3 py-1 text-xs font-medium text-black/60 transition hover:border-black/20 hover:text-black"
              >
                <svg viewBox="0 0 16 16" className="h-3 w-3 shrink-0" fill="none" aria-hidden>
                  <path
                    d="M8 1.5v8m0 0L5 6.5M8 9.5l3-3M2.5 11v2a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1v-2"
                    stroke="currentColor"
                    strokeWidth="1.3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Download
              </a>
            )}
          </div>
        </div>

        {viewMode === "preview" ? (
          <PreviewPanel files={files ?? []} appName={appName} />
        ) : viewMode === "settings" ? (
          <ConfigurePanel
            projectId={project.id}
            name={appName}
            description={appDescription}
            plan={plan}
            hasGeneratedApp={!!files && files.length > 0}
            githubRepoFullName={githubRepoFullName}
            githubRepoUrl={githubRepoUrl}
            deploymentStatus={deploymentStatus}
            installStatus={installStatus}
            deployStatus={deployStatus}
            onSaved={(result) => {
              setAppName(result.name);
              setAppDescription(result.description);
              setPlan(result.plan);
              router.refresh();
            }}
            onGithubConnected={(result) => {
              setGithubRepoFullName(result.repoFullName);
              setGithubRepoUrl(result.repoUrl);
              router.refresh();
            }}
            onGithubDisconnected={() => {
              setGithubRepoFullName(null);
              setGithubRepoUrl(null);
              router.refresh();
            }}
            onDeploymentSaved={(status) => {
              setDeploymentStatus(status);
              router.refresh();
            }}
            onInstallSaved={(status) => {
              setInstallStatus(status);
              router.refresh();
            }}
            onDeploySaved={(status) => {
              setDeployStatus(status);
              router.refresh();
            }}
            onDeleted={() => {
              router.push("/dashboard");
              router.refresh();
            }}
          />
        ) : viewMode === "terminal" ? (
          <TerminalPanel projectId={project.id} hasGeneratedApp={!!files && files.length > 0} />
        ) : files && files.length > 0 ? (
          <div className="flex min-h-0 flex-1">
            <div className="w-56 shrink-0 overflow-y-auto border-r border-black/10 bg-black/[0.015] p-2">
              <FileTree
                nodes={fileTree}
                activeFile={activeFile}
                onSelect={setActiveFile}
                collapsed={collapsedDirs}
                onToggleDir={toggleDir}
              />
            </div>

            <div className="min-w-0 flex-1 bg-[#0b0b0d]">
              <div className="flex items-center gap-1.5 border-b border-white/10 px-4 py-2.5">
                <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
                <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
                <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
                <span className="ml-2 truncate font-mono text-xs text-white/40">{activeFile}</span>
              </div>
              <div className="h-[calc(100%-41px)] overflow-auto p-4">
                {activeContent && <CodeBlock code={activeContent.content} />}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
            <p className="text-sm font-medium text-black/50">Generated files will appear here</p>
            <p className="text-xs text-black/35">Send a message describing your app to get started.</p>
          </div>
        )}
      </div>
    </div>
  );
}

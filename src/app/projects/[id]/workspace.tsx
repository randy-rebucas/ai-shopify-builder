"use client";

import { useEffect, useState } from "react";
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
    <div className="border-t border-black/10 pt-6">
      <label className="mb-1 block text-xs font-medium uppercase text-black/40">Deployment</label>
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
    <div className="border-t border-black/10 pt-6">
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
      <div className="border-t border-black/10 pt-6">
        <label className="mb-1 block text-xs font-medium uppercase text-black/40">Deploy</label>
        <p className="text-xs text-black/40">Deploy automation isn&apos;t configured on this server.</p>
      </div>
    );
  }

  return (
    <div className="border-t border-black/10 pt-6">
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
  const [token, setToken] = useState("");
  const [repoName, setRepoName] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [pushing, setPushing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pushResult, setPushResult] = useState<string | null>(null);

  async function connect() {
    if (!token.trim()) return;
    setConnecting(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/github`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: token.trim(), repoName: repoName.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Failed to connect to GitHub");
        return;
      }
      setToken("");
      onConnected({ repoFullName: data.repoFullName, repoUrl: data.repoUrl });
    } catch {
      setError("Failed to connect to GitHub");
    } finally {
      setConnecting(false);
    }
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
    <div className="border-t border-black/10 pt-6">
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
            Paste a GitHub personal access token (repo scope) to create/connect a repository and push generated
            files to it.
          </p>
          <input
            type="password"
            className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm"
            placeholder="ghp_..."
            value={token}
            onChange={(e) => setToken(e.target.value)}
          />
          <input
            className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm"
            placeholder="Repo name (optional, defaults to app name)"
            value={repoName}
            onChange={(e) => setRepoName(e.target.value)}
          />
          <button
            onClick={connect}
            disabled={connecting || !token.trim()}
            className="rounded-full bg-black px-4 py-2 text-xs font-medium text-white transition hover:bg-black/85 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {connecting ? "Connecting..." : "Connect GitHub"}
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
}) {
  const [formName, setFormName] = useState(name);
  const [formDescription, setFormDescription] = useState(description ?? "");
  const [features, setFeatures] = useState<string[]>(plan?.features ?? []);
  const [shopifyApis, setShopifyApis] = useState<string[]>(plan?.shopifyApis ?? []);
  const [dataModels, setDataModels] = useState<DataModel[]>(plan?.dataModels ?? []);
  const [logoUrl, setLogoUrl] = useState(plan?.logoUrl ?? "");
  const [logoError, setLogoError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [syncedName, setSyncedName] = useState(name);
  const [syncedDescription, setSyncedDescription] = useState(description);
  const [syncedPlan, setSyncedPlan] = useState(plan);

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

  async function save() {
    setSaving(true);
    setSaveError(null);
    setSaved(false);
    try {
      const res = await fetch(`/api/projects/${projectId}/config`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName,
          description: formDescription,
          ...(plan ? { features, shopifyApis, dataModels, logoUrl } : {}),
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setSaveError(typeof data.error === "string" ? data.error : "Failed to save configuration");
        return;
      }
      const data = await res.json();
      setSaved(true);
      onSaved({ name: data.project.name, description: data.project.description, plan: data.plan });
    } catch {
      setSaveError("Failed to save configuration");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="h-full overflow-y-auto px-6 py-5 text-sm">
      <div className="mx-auto max-w-xl space-y-6">
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

        {plan?.summary && (
          <div>
            <label className="mb-1 block text-xs font-medium uppercase text-black/40">Plan summary</label>
            <p className="rounded-xl bg-black/5 px-3 py-2 text-black/70">{plan.summary}</p>
          </div>
        )}

        {plan ? (
          <>
            <div>
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

            <div>
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

            <div>
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

            <div>
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
          </>
        ) : (
          <p className="text-xs text-black/40">
            Features, Shopify APIs, and data models become editable here after you generate the app.
          </p>
        )}

        <div className="flex items-center gap-3 border-t border-black/10 pt-4">
          <button
            onClick={save}
            disabled={saving}
            className="rounded-full bg-black px-5 py-2 text-sm font-medium text-white transition hover:bg-black/85 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save configuration"}
          </button>
          {saved && <span className="text-xs font-medium text-emerald-600">✓ Saved</span>}
          {saveError && <span className="text-xs text-red-600">{saveError}</span>}
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
      </div>
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
  const [viewMode, setViewMode] = useState<"code" | "configure">("code");
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
            {(["code", "configure"] as const).map((mode) => (
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
          {viewMode === "code" && activeFile && (
            <span className="truncate pr-2 font-mono text-xs text-black/40">{activeFile}</span>
          )}
        </div>

        {viewMode === "configure" ? (
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
          />
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

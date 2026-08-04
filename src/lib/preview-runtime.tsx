import * as React from "react";
import type { ReactNode } from "react";

// Runtime used to compile + execute a generated admin route for the in-browser Preview tab.
// This module only ever runs inside the sandboxed preview iframe (see workspace.tsx's
// PreviewFrame, served from the static /preview-frame.html + preview-frame-bundle.js — see
// scripts/build-preview-frame.mjs), never in the parent app's document — generated code is
// effectively untrusted (it's LLM output, shaped by user chat input), so it must not run anywhere
// that has access to the user's real session cookies, localStorage, or the parent DOM.
//
// It takes its Babel and Polaris-shim dependencies as parameters rather than importing them, so
// this file has no dependency graph beyond "react" — that keeps the bundling script simple (one
// `require("react")` to resolve) instead of needing to trace and rewrite `@babel/standalone` and
// path-aliased imports into the bundle's own module registry.

export interface GeneratedFile {
  path: string;
  content: string;
}

export interface PreviewRuntimeDeps {
  babel: { transform: (source: string, options: Record<string, unknown>) => { code?: string | null } };
  polarisShim: Record<string, unknown>;
}

// Loader data has no real shape in the preview (no server ran), so any field — at any depth —
// the generated screen destructures or chains off it comes back undefined. Stub it with a
// self-referential empty-array proxy: `.map`/`.length`/spreads work (it's really an empty array),
// and any further property access (`.products.edges.node`) yields another one of these instead
// of throwing, so arbitrarily deep loader-data shapes degrade to "renders nothing" rather than crash.
function createLoaderStub(): unknown {
  return new Proxy([] as unknown[], {
    get: (target, prop, receiver) =>
      prop in target || typeof prop === "symbol" ? Reflect.get(target, prop, receiver) : createLoaderStub(),
  });
}
const loaderDataShim = createLoaderStub();

const remixReactShim = {
  useLoaderData: () => loaderDataShim,
  useActionData: () => null,
  useNavigation: () => ({ state: "idle" }),
  useNavigate: () => () => {},
  useSubmit: () => () => {},
  useFetcher: () => ({ Form: "form", state: "idle", data: null, submit: () => {}, load: () => {} }),
  useParams: () => ({}),
  useSearchParams: () => [new URLSearchParams(), () => {}],
  useLocation: () => ({ pathname: "/", search: "", hash: "", state: null, key: "default" }),
  useRevalidator: () => ({ revalidate: () => {}, state: "idle" }),
  useOutletContext: () => ({}),
  useRouteError: () => null,
  isRouteErrorResponse: () => false,
  Form: (props: Record<string, unknown>) => React.createElement("form", props),
  Link: ({ to, children, ...rest }: { to?: string; children?: ReactNode }) =>
    React.createElement("a", { href: typeof to === "string" ? to : "#", ...rest }, children),
  NavLink: ({ to, children, ...rest }: { to?: string; children?: ReactNode }) =>
    React.createElement("a", { href: typeof to === "string" ? to : "#", ...rest }, children),
  Outlet: () => null,
};

function noopGraphqlProxy(): unknown {
  return new Proxy(
    () => Promise.resolve({ json: async () => ({ data: {} }) }),
    { get: () => noopGraphqlProxy() },
  );
}

const shopifyServerShim = {
  authenticate: {
    admin: async () => ({ admin: { graphql: noopGraphqlProxy() }, session: {} }),
  },
};

// Loaders/actions never run in the preview (no server), but generated route files still import
// these at module scope — stub them out so the import itself doesn't throw.
const remixNodeShim = {
  json: (data: unknown, init?: number | ResponseInit) =>
    new Response(JSON.stringify(data), typeof init === "number" ? { status: init } : init),
  redirect: (url: string, init?: number | ResponseInit) =>
    new Response(null, {
      status: typeof init === "number" ? init : (init?.status ?? 302),
      headers: { Location: url },
    }),
  defer: (data: unknown) => data,
  unstable_parseMultipartFormData: async () => new FormData(),
  unstable_createMemoryUploadHandler: () => async () => null,
};

const dbServerShim = new Proxy(
  {},
  {
    get: () =>
      new Proxy(
        {},
        {
          get: () => async () => null,
        },
      ),
  },
);

function transpilePreviewModule(babel: PreviewRuntimeDeps["babel"], source: string): string {
  const result = babel.transform(source, {
    presets: [["env", { modules: "commonjs" }], ["react", { runtime: "classic" }]],
    filename: "preview.jsx",
  });
  return result.code ?? "";
}

function resolveRelativePath(fromPath: string, spec: string): string {
  const stack = fromPath.split("/").slice(0, -1);
  for (const part of spec.split("/")) {
    if (part === "" || part === ".") continue;
    if (part === "..") stack.pop();
    else stack.push(part);
  }
  return stack.join("/");
}

function findGeneratedFile(files: GeneratedFile[], resolvedNoExt: string): GeneratedFile | undefined {
  const candidates = [resolvedNoExt, `${resolvedNoExt}.jsx`, `${resolvedNoExt}.js`, `${resolvedNoExt}/index.jsx`];
  return files.find((f) => candidates.includes(f.path));
}

const MAX_PREVIEW_MODULES = 10;

// The Polaris shim only implements a lookalike for the handful of components most generated
// screens use — but codegen is free to import anything from the real @shopify/polaris package
// (see CODEGEN_SYSTEM_PROMPT), so an unimplemented component name would otherwise resolve to
// `undefined` and crash the whole preview with a cryptic "Element type is invalid" React error.
// Wrap the shim in a Proxy so any missing export (including nested ones, e.g. `Modal.Section` on
// a `Modal` we don't implement) instead renders as a clearly-labeled placeholder — the preview
// degrades to "one box looks like a stub" rather than not rendering at all.
function createFallbackPolarisComponent(name: string): React.ComponentType<{ children?: ReactNode }> {
  const Fallback = ({ children }: { children?: ReactNode }) =>
    React.createElement(
      "div",
      {
        style: {
          border: "1px dashed #c9cccf",
          borderRadius: 8,
          padding: "6px 8px",
          margin: "4px 0",
          fontFamily: "monospace",
        },
      },
      React.createElement(
        "div",
        { style: { fontSize: 10, color: "#8a8a8a", marginBottom: children ? 4 : 0 } },
        `Polaris.${name} (not available in preview)`,
      ),
      children ?? null,
    );
  return new Proxy(Fallback, {
    get: (target, prop, receiver) =>
      prop in target || typeof prop === "symbol"
        ? Reflect.get(target, prop, receiver)
        : createFallbackPolarisComponent(`${name}.${String(prop)}`),
  }) as React.ComponentType<{ children?: ReactNode }>;
}

function withPolarisFallbacks(shim: Record<string, unknown>): Record<string, unknown> {
  return new Proxy(shim, {
    get: (target, prop, receiver) =>
      prop in target || typeof prop === "symbol"
        ? Reflect.get(target, prop, receiver)
        : createFallbackPolarisComponent(String(prop)),
  });
}

export function renderPreviewComponent(
  files: GeneratedFile[],
  entry: GeneratedFile,
  deps: PreviewRuntimeDeps,
): React.ComponentType {
  const cache = new Map<string, unknown>();
  let moduleCount = 0;

  function executeModule(file: GeneratedFile): unknown {
    if (cache.has(file.path)) return cache.get(file.path);
    moduleCount += 1;
    if (moduleCount > MAX_PREVIEW_MODULES) {
      throw new Error("This screen imports too many local files to preview.");
    }
    const code = transpilePreviewModule(deps.babel, file.content);
    const moduleObj: { exports: Record<string, unknown> } = { exports: {} };
    const requireShim = (spec: string): unknown => {
      if (spec === "react") return React;
      if (spec === "@shopify/polaris") return withPolarisFallbacks(deps.polarisShim);
      if (spec === "@remix-run/react") return remixReactShim;
      if (spec === "@remix-run/node") return remixNodeShim;
      if (spec.endsWith("shopify.server")) return shopifyServerShim;
      if (spec.endsWith("db.server")) return dbServerShim;
      if (spec.startsWith(".")) {
        const resolved = resolveRelativePath(file.path, spec);
        const target = findGeneratedFile(files, resolved);
        if (!target) throw new Error(`Couldn't resolve import "${spec}" from ${file.path}.`);
        return executeModule(target);
      }
      throw new Error(`Preview doesn't support importing "${spec}".`);
    };
    // Generated code often skips `import React from "react"` (relying on the automatic JSX
    // runtime), but the classic runtime transform above still emits bare `React.createElement`
    // calls. Pass React in as an ambient parameter so those calls resolve even without an import.
    const runModule = new Function("require", "module", "exports", "React", code);
    runModule(requireShim, moduleObj, moduleObj.exports, React);
    cache.set(file.path, moduleObj.exports);
    return moduleObj.exports;
  }

  const mod = executeModule(entry) as { default?: unknown };
  if (typeof mod.default !== "function") {
    throw new Error("This file doesn't export a default component.");
  }
  return mod.default as React.ComponentType;
}

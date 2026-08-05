import * as React from "react";
import type { ReactNode } from "react";
import * as Babel from "@babel/standalone/babel.min.js";
import * as Polaris from "@shopify/polaris";
import previewLoopGuardPlugin from "./preview-loop-guard";

// Runtime used to compile + execute a generated admin route for the in-browser Preview tab.
// This module only ever runs inside the sandboxed preview iframe (see workspace.tsx's
// PreviewFrame, served from the static /preview-frame.html + preview-frame-bundle.js, bundled by
// scripts/build-preview-frame.mjs via esbuild), never in the parent app's document — generated
// code is effectively untrusted (it's LLM output, shaped by user chat input), so it must not run
// anywhere that has access to the user's real session cookies, localStorage, or the parent DOM.
//
// The GENERATED code compiled and run by renderPreviewComponent below is untrusted and still gets
// dynamically Babel-transpiled + `new Function`-executed at preview time — that can't be avoided,
// since it's arbitrary runtime content pulled from the database, not something esbuild can see
// ahead of time. This module's OWN dependencies (Babel, the real @shopify/polaris) are ordinary
// static imports, though — esbuild resolves and bundles those normally.

export interface GeneratedFile {
  path: string;
  content: string;
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

function transpilePreviewModule(source: string): string {
  const result = Babel.transform(source, {
    presets: [["env", { modules: "commonjs" }], ["react", { runtime: "classic" }]],
    plugins: [previewLoopGuardPlugin],
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

// This is the real @shopify/polaris package now, so it covers the vast majority of what codegen
// might import — but codegen is still free to reference something that doesn't exist in whatever
// Polaris version is pinned here (a renamed/removed component, a typo'd name), which would
// otherwise resolve to `undefined` and crash the whole preview with a cryptic "Element type is
// invalid" React error. Wrap the module in a Proxy so any missing export (including nested ones,
// e.g. `Modal.Section` if `Modal` itself were ever missing) instead renders as a clearly-labeled
// placeholder — the preview degrades to "one box looks like a stub" rather than not rendering.
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

function withPolarisFallbacks(mod: Record<string, unknown>): Record<string, unknown> {
  return new Proxy(mod, {
    get: (target, prop, receiver) =>
      prop in target || typeof prop === "symbol"
        ? Reflect.get(target, prop, receiver)
        : createFallbackPolarisComponent(String(prop)),
  });
}

const polarisWithFallbacks = withPolarisFallbacks(Polaris as unknown as Record<string, unknown>);

export function renderPreviewComponent(files: GeneratedFile[], entry: GeneratedFile): React.ComponentType {
  const cache = new Map<string, unknown>();
  let moduleCount = 0;

  function executeModule(file: GeneratedFile): unknown {
    if (cache.has(file.path)) return cache.get(file.path);
    moduleCount += 1;
    if (moduleCount > MAX_PREVIEW_MODULES) {
      throw new Error("This screen imports too many local files to preview.");
    }
    const code = transpilePreviewModule(file.content);
    const moduleObj: { exports: Record<string, unknown> } = { exports: {} };
    const requireShim = (spec: string): unknown => {
      if (spec === "react") return React;
      if (spec === "@shopify/polaris") return polarisWithFallbacks;
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

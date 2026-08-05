import * as React from "react";
import { createRoot, type Root } from "react-dom/client";
import { AppProvider } from "@shopify/polaris";
import polarisEn from "@shopify/polaris/locales/en.json";
import { renderPreviewComponent, type GeneratedFile } from "../src/lib/preview-runtime";
import { createShopifyLiquidEngine, renderLiquidPreview } from "../src/lib/liquid-preview-runtime";

// Entry point for the sandboxed preview iframe (public/preview-frame.html), bundled by
// scripts/build-preview-frame.mjs via esbuild into public/preview-frame-bundle.js. This document
// only ever loads inside an `<iframe sandbox="allow-scripts">` with no `allow-same-origin` (see
// workspace.tsx's PreviewFrame) — the browser gives it an opaque, unique origin no matter what URL
// it's served from, so the generated code it renders (untrusted LLM output) can't reach this app's
// cookies, localStorage, or parent window. Never remove that sandbox restriction.

interface RenderMessage {
  source: "preview-frame-host";
  type: "render";
  files: GeneratedFile[];
  entryPath: string;
}

function isRenderMessage(data: unknown): data is RenderMessage {
  return (
    typeof data === "object" &&
    data !== null &&
    (data as Record<string, unknown>).source === "preview-frame-host" &&
    (data as Record<string, unknown>).type === "render"
  );
}

function postToHost(message: Record<string, unknown>) {
  window.parent.postMessage({ source: "preview-frame", ...message }, "*");
}

class FrameErrorBoundary extends React.Component<
  { children: React.ReactNode; onError: (message: string) => void },
  { error: string | null }
> {
  state: { error: string | null } = { error: null };
  static getDerivedStateFromError(error: unknown) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
  componentDidCatch(error: unknown) {
    this.props.onError(error instanceof Error ? error.message : String(error));
  }
  render() {
    if (this.state.error) return null;
    return this.props.children;
  }
}

const reactContainerEl = document.getElementById("root")!;
const liquidContainerEl = document.getElementById("liquid-root")!;
let reactRoot: Root | null = null;
const liquidEngine = createShopifyLiquidEngine();

function showReactContainer() {
  reactContainerEl.style.display = "";
  liquidContainerEl.style.display = "none";
  liquidContainerEl.innerHTML = "";
}

function showLiquidContainer() {
  liquidContainerEl.style.display = "";
  reactContainerEl.style.display = "none";
  reactRoot?.render(null);
}

function renderJsxEntry(files: GeneratedFile[], entry: GeneratedFile, entryPath: string) {
  showReactContainer();
  const RouteComponent = renderPreviewComponent(files, entry);
  if (!reactRoot) reactRoot = createRoot(reactContainerEl);
  reactRoot.render(
    <AppProvider i18n={polarisEn}>
      <FrameErrorBoundary key={entryPath} onError={(message) => postToHost({ type: "error", error: message })}>
        <RouteComponent />
      </FrameErrorBoundary>
    </AppProvider>,
  );
}

function renderLiquidEntry(files: GeneratedFile[], entry: GeneratedFile) {
  showLiquidContainer();
  liquidContainerEl.innerHTML = renderLiquidPreview(liquidEngine, files, entry);
}

window.addEventListener("message", (event) => {
  if (!isRenderMessage(event.data)) return;
  const { files, entryPath } = event.data;
  const entry = files.find((f) => f.path === entryPath);
  if (!entry) return;

  try {
    if (entry.path.endsWith(".liquid")) {
      renderLiquidEntry(files, entry);
    } else {
      renderJsxEntry(files, entry, entryPath);
    }
  } catch (err) {
    postToHost({ type: "error", error: err instanceof Error ? err.message : String(err) });
  }
});

postToHost({ type: "ready" });

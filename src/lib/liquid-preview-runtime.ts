import type { GeneratedFile } from "@/lib/preview-runtime";

// Renders a generated Shopify theme-extension block (.liquid) for the in-browser Preview tab.
// Runs inside the same sandboxed preview iframe as preview-runtime.tsx's JSX renderer — see that
// file's header comment for why. Liquid rendering is inherently lower-risk than the JSX path (no
// `new Function`/arbitrary JS execution; LiquidJS only exposes the tags/filters registered below),
// but the *output* is still injected as raw HTML (innerHTML), which can carry live HTML (e.g.
// `<img onerror=...>`) same as the JSX path's rendered React tree can — so it stays inside the
// sandbox for the same reason, not because Liquid itself is untrusted code.

// Minimal surface of the real `Liquid` class (from `liquidjs`) that this file depends on. The
// actual constructor is injected by the caller (see createShopifyLiquidEngine) rather than
// imported, so this module has no build-time dependency on the liquidjs package — the bundling
// script (scripts/build-preview-frame.mjs) vendors liquidjs's own browser UMD build separately
// and wires the two together at bundle-assembly time.
export interface LiquidToken {
  getText(): string;
}

interface LiquidTagState {
  tokens?: LiquidToken[];
}

export interface LiquidTagDef {
  parse(this: LiquidTagState, tagToken: LiquidToken, remainTokens: LiquidToken[]): void;
  render(this: LiquidTagState, ctx: unknown, emitter: { write(chunk: string): void }): void;
}

export interface LiquidEngineLike {
  registerTag(name: string, def: LiquidTagDef): void;
  registerFilter(name: string, fn: (...args: unknown[]) => unknown): void;
  parseAndRenderSync(template: string, ctx?: Record<string, unknown>): string;
}

type LiquidCtor = new (opts?: Record<string, unknown>) => LiquidEngineLike;

// Shopify block files wrap block-scoped CSS in {% stylesheet %}...{% endstylesheet %} rather than
// a plain <style> tag. Captures the raw (un-rendered) text between the tags — it's plain CSS, not
// Liquid template content — and re-emits it verbatim inside a real <style> element, so it applies
// once the rendered HTML is injected into the preview document ("internal" styling).
const stylesheetTagDef: LiquidTagDef = {
  parse(tagToken, remainTokens) {
    const tokens: LiquidToken[] = [];
    while (remainTokens.length > 0) {
      const token = remainTokens.shift()!;
      if (/^\{%-?\s*endstylesheet\s*-?%\}$/.test(token.getText().trim())) break;
      tokens.push(token);
    }
    this.tokens = tokens;
  },
  render(_ctx, emitter) {
    const raw = (this.tokens ?? []).map((t) => t.getText()).join("");
    emitter.write(`<style>${raw}</style>`);
  },
};

// {% javascript %}...{% endjavascript %} is Shopify's block-scoped JS tag. This is a render-only
// layout/copy/style preview, not a runtime — skip its contents entirely rather than emitting a
// <script> tag (which wouldn't execute via innerHTML anyway, but omitting it is more predictable
// than relying on that HTML quirk).
const javascriptTagDef: LiquidTagDef = {
  parse(_tagToken, remainTokens) {
    while (remainTokens.length > 0) {
      const token = remainTokens.shift()!;
      if (/^\{%-?\s*endjavascript\s*-?%\}$/.test(token.getText().trim())) break;
    }
  },
  render() {
    // Intentionally emits nothing.
  },
};

// Best-effort, non-crashing shims for common Shopify-only filters LiquidJS doesn't ship — mirrors
// preview-runtime.tsx's shim philosophy (approximate, never throw). Not pixel/behavior-accurate.
function registerShopifyFilterShims(engine: LiquidEngineLike): void {
  engine.registerFilter("money", (v: unknown) => formatMoney(v));
  engine.registerFilter("money_with_currency", (v: unknown) => `${formatMoney(v)} USD`);
  engine.registerFilter("asset_url", (v: unknown) => String(v ?? ""));
  engine.registerFilter("img_url", (v: unknown) => String(v ?? ""));
  engine.registerFilter("image_url", (v: unknown) => String(v ?? ""));
  engine.registerFilter("stylesheet_tag", (v: unknown) => `<link rel="stylesheet" href="${String(v ?? "")}">`);
  engine.registerFilter("script_tag", () => "");
  engine.registerFilter("t", (v: unknown) => String(v ?? ""));
  engine.registerFilter("handleize", (v: unknown) => handleize(String(v ?? "")));
  engine.registerFilter("handle", (v: unknown) => handleize(String(v ?? "")));
  engine.registerFilter("json", (v: unknown) => JSON.stringify(v ?? null));
}

function formatMoney(v: unknown): string {
  const n = Number(v);
  if (!Number.isFinite(n)) return String(v ?? "");
  return `$${(n / 100).toFixed(2)}`;
}

function handleize(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function createShopifyLiquidEngine(LiquidCtor: LiquidCtor): LiquidEngineLike {
  const engine = new LiquidCtor({ strictVariables: false, strictFilters: false });
  engine.registerTag("stylesheet", stylesheetTagDef);
  engine.registerTag("javascript", javascriptTagDef);
  registerShopifyFilterShims(engine);
  return engine;
}

// {% schema %}...{% endschema %} is pure JSON metadata (block settings), never meant to render as
// output — strip it before handing the template to the engine rather than registering a tag for
// it, since it has no Liquid syntax of its own to interpret.
function stripSchemaBlock(source: string): string {
  return source.replace(/\{%-?\s*schema\s*-?%\}[\s\S]*?\{%-?\s*endschema\s*-?%\}/g, "");
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

// Rewrites `<link rel="stylesheet" href="...">` tags whose href resolves (relative to the block's
// own path) to another generated file into an inline <style> holding that file's content —
// there's no real server to fetch a stylesheet from inside the sandboxed preview, so this is how
// "external" styling gets applied. A href that doesn't resolve to a known generated file is left
// untouched — it'll just fail to load in the sandboxed frame, same no-crash degrade as an
// unresolved JSX import in preview-runtime.tsx.
function resolveExternalStylesheets(html: string, files: GeneratedFile[], entryPath: string): string {
  const linkTagPattern = /<link\b[^>]*>/gi;
  return html.replace(linkTagPattern, (tag) => {
    if (!/rel\s*=\s*["']stylesheet["']/i.test(tag)) return tag;
    const hrefMatch = tag.match(/href\s*=\s*["']([^"']+)["']/i);
    if (!hrefMatch) return tag;
    const href = hrefMatch[1];
    const resolved = href.startsWith(".") ? resolveRelativePath(entryPath, href) : href;
    const cssFile = files.find((f) => f.path === resolved || f.path === resolved.replace(/^\/+/, ""));
    if (!cssFile) return tag;
    return `<style>${cssFile.content}</style>`;
  });
}

export function renderLiquidPreview(engine: LiquidEngineLike, files: GeneratedFile[], entry: GeneratedFile): string {
  const withoutSchema = stripSchemaBlock(entry.content);
  const rendered = engine.parseAndRenderSync(withoutSchema, {});
  return resolveExternalStylesheets(rendered, files, entry.path);
}

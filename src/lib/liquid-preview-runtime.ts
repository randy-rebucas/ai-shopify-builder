import { Liquid, TagToken } from "liquidjs";
import type { GeneratedFile } from "@/lib/preview-runtime";

// liquidjs doesn't publicly export its internal TagImplOptions type, so the tag defs below are
// typed against our own minimal LiquidTagDef and cast at the registerTag call sites instead.
type RegisterTagArg = Parameters<Liquid["registerTag"]>[1];

// Renders a generated Shopify theme-extension block (.liquid) for the in-browser Preview tab.
// Runs inside the same sandboxed preview iframe as preview-runtime.tsx's JSX renderer — see that
// file's header comment for why. Liquid rendering is inherently lower-risk than the JSX path (no
// `new Function`/arbitrary JS execution; LiquidJS only exposes the tags/filters registered below),
// but the *output* is still injected as raw HTML (innerHTML), which can carry live HTML (e.g.
// `<img onerror=...>`) same as the JSX path's rendered React tree can — so it stays inside the
// sandbox for the same reason, not because Liquid itself is untrusted code.

// Loose surface of what this file actually uses from liquidjs's own (more detailed) Token/tag
// types — kept minimal rather than importing liquidjs's internal Token/TagToken types directly.
export interface LiquidToken {
  getText(): string;
}

// `this` inside a tag's parse/render is the per-occurrence Tag instance liquidjs constructs —
// `liquid` (the owning engine, giving access to its parser/renderer for tags that need to parse
// and render their own child content, e.g. passthroughBlockTagDef below) is real but undocumented
// in the public TagImplOptions type, so it's typed loosely here rather than imported.
interface LiquidTagState {
  tokens?: LiquidToken[];
  templates?: unknown[];
  label?: string;
  liquid: {
    parser: { parseToken(token: unknown, remainTokens: unknown[]): unknown };
    renderer: { renderTemplates(templates: unknown[], ctx: unknown, emitter: unknown): unknown };
  };
}

export interface LiquidTagDef {
  parse(this: LiquidTagState, tagToken: LiquidToken & { args?: string }, remainTokens: LiquidToken[]): void;
  render(this: LiquidTagState, ctx: unknown, emitter: { write(chunk: string): void }): unknown;
}

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

// LiquidJS only understands standard Liquid syntax plus whatever we register — real Shopify theme
// code (and theme-extension blocks) commonly use several Shopify-only tags LiquidJS doesn't ship,
// which otherwise hard-crash the whole preview (`{% render %}`/`{% include %}` throw trying to
// resolve a real file from disk; `{% section %}`/`{% form %}`/`{% paginate %}` are simply unknown
// tags LiquidJS refuses to parse at all) — exactly the "renders nothing" vs. "throws" distinction
// this file's other shims (money/asset_url/etc.) already draw. `render`/`include`/`section`
// reference content this preview has no access to (other snippet/section files, real theme
// context), so they degrade to a labeled placeholder box. `form`/`paginate` don't reference
// anything external — they just wrap ordinary child content — so their children still render.

function extractQuotedTagArg(argsText: string | undefined): string | null {
  if (!argsText) return null;
  const match = argsText.match(/^\s*['"]([^'"]+)['"]/);
  return match ? match[1] : null;
}

const PLACEHOLDER_STYLE =
  "border:1px dashed #c9cccf;border-radius:8px;padding:6px 8px;margin:4px 0;font-family:monospace;font-size:10px;color:#8a8a8a";

function placeholderTagDef(label: string): LiquidTagDef {
  return {
    parse(tagToken) {
      const name = extractQuotedTagArg(tagToken.args);
      this.label = name ? `${label} "${name}"` : label;
    },
    render(_ctx, emitter) {
      emitter.write(`<div style="${PLACEHOLDER_STYLE}">{% ${this.label} %} (not available in preview)</div>`);
    },
  };
}

// Parses and renders its own child content (delegating to the owning engine's parser/renderer, the
// same mechanism liquidjs's own built-in block tags like {% if %}/{% capture %} use internally),
// so nested Liquid inside a {% form %} or {% paginate %} block — including further nested tags —
// still renders normally; only the Shopify-specific wrapper semantics are approximated.
function passthroughBlockTagDef(endTagName: string, wrap?: (inner: string) => string): LiquidTagDef {
  return {
    parse(_tagToken, remainTokens) {
      const templates: unknown[] = [];
      while (remainTokens.length > 0) {
        const token = remainTokens.shift()!;
        if (token instanceof TagToken && token.name === endTagName) break;
        templates.push(this.liquid.parser.parseToken(token, remainTokens));
      }
      this.templates = templates;
    },
    *render(ctx, emitter) {
      const chunks: string[] = [];
      const innerEmitter = { write: (chunk: string) => chunks.push(chunk) };
      yield this.liquid.renderer.renderTemplates(this.templates ?? [], ctx, innerEmitter);
      const inner = chunks.join("");
      emitter.write(wrap ? wrap(inner) : inner);
    },
  };
}

// Best-effort, non-crashing shims for common Shopify-only filters LiquidJS doesn't ship — mirrors
// preview-runtime.tsx's shim philosophy (approximate, never throw). Not pixel/behavior-accurate.
function registerShopifyFilterShims(engine: Liquid): void {
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

export function createShopifyLiquidEngine(): Liquid {
  const engine = new Liquid({ strictVariables: false, strictFilters: false });
  const registerTag = (name: string, def: LiquidTagDef) => engine.registerTag(name, def as unknown as RegisterTagArg);

  registerTag("stylesheet", stylesheetTagDef);
  registerTag("javascript", javascriptTagDef);
  registerTag("render", placeholderTagDef("render"));
  registerTag("include", placeholderTagDef("include"));
  registerTag("section", placeholderTagDef("section"));
  registerTag("form", passthroughBlockTagDef("endform", (inner) => `<form>${inner}</form>`));
  registerTag("paginate", passthroughBlockTagDef("endpaginate"));

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

export function renderLiquidPreview(engine: Liquid, files: GeneratedFile[], entry: GeneratedFile): string {
  const withoutSchema = stripSchemaBlock(entry.content);
  const rendered = engine.parseAndRenderSync(withoutSchema, {});
  return resolveExternalStylesheets(rendered, files, entry.path);
}

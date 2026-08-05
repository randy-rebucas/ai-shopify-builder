#!/usr/bin/env node
// Builds public/preview-frame-bundle.js + public/preview-frame.html: a fully self-contained
// (React + ReactDOM + real @shopify/polaris + Babel + LiquidJS + our preview runtimes) static
// bundle for the sandboxed preview iframe used by workspace.tsx's PreviewFrame.
//
// Why a static public/ bundle instead of a normal Next.js route: the iframe is loaded with
// `sandbox="allow-scripts"` and deliberately WITHOUT `allow-same-origin`, so the browser gives it
// an opaque, unique origin no matter what URL it's served from — that's what keeps the untrusted
// generated code it runs from reaching this app's cookies, localStorage, or parent window. But
// Next's dev server unconditionally blocks opaque-origin ("Origin: null") requests to anything
// under /_next/*, with no allowedDevOrigins escape hatch (see block-cross-site-dev.js) — so a
// normal Next.js page can't be loaded from that iframe in dev. Files under /public are served
// as plain static assets, outside that check, so we pre-bundle everything the iframe needs (no
// separate script/chunk requests at all) and serve it from there instead.
//
// Bundling itself is a normal esbuild build of scripts/preview-frame-entry.tsx — React, ReactDOM,
// @shopify/polaris, @babel/standalone, and liquidjs are all ordinary npm dependencies resolved and
// bundled the standard way; nothing here hand-vendors individual files anymore.
//
// Run via `npm run build:preview-frame` (wired into predev/prebuild). Re-run after changing
// scripts/preview-frame-entry.tsx, src/lib/preview-runtime.tsx, or src/lib/liquid-preview-runtime.ts.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import esbuild from "esbuild";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDir, "..");

const result = await esbuild.build({
  entryPoints: [path.join(root, "scripts/preview-frame-entry.tsx")],
  bundle: true,
  format: "iife",
  platform: "browser",
  target: "es2020",
  minify: true,
  write: false,
  logLevel: "silent",
});

const errors = result.errors ?? [];
if (errors.length > 0) {
  for (const err of errors) console.error(err.text);
  process.exit(1);
}

const bundle = result.outputFiles[0].text;
const polarisCss = readFileSync(
  path.join(root, "node_modules/@shopify/polaris/build/esm/styles.css"),
  "utf8",
);

const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>App screen preview</title>
    <style>${polarisCss}</style>
  </head>
  <body style="margin:0">
    <div id="root"></div>
    <div id="liquid-root"></div>
    <script src="/preview-frame-bundle.js"></script>
  </body>
</html>
`;

const publicDir = path.join(root, "public");
mkdirSync(publicDir, { recursive: true });
writeFileSync(path.join(publicDir, "preview-frame-bundle.js"), bundle);
writeFileSync(path.join(publicDir, "preview-frame.html"), html);

console.log(
  `Built public/preview-frame-bundle.js (${(bundle.length / 1024 / 1024).toFixed(1)} MB) and public/preview-frame.html`,
);

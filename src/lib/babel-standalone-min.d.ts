// @types/babel__standalone only declares the "@babel/standalone" entry point, not the
// "/babel.min.js" subpath preview-runtime.tsx imports (to avoid bundling Babel's much larger
// unminified main entry into the sandboxed preview bundle) — same runtime API, so re-export it.
declare module "@babel/standalone/babel.min.js" {
  export * from "@babel/standalone";
}

import type { PluginObj, NodePath } from "@babel/core";
import type { WhileStatement, DoWhileStatement, ForStatement, BlockStatement } from "@babel/types";

// Babel plugin injected into transpilePreviewModule's transform (preview-runtime.tsx) — generated
// code is untrusted (LLM output shaped by user chat input) and gets `new Function`-executed inside
// the sandboxed preview iframe. That sandbox already stops it from reaching anything sensitive
// (opaque origin, no cookies/localStorage/parent access), but nothing previously stopped a
// generated screen containing e.g. `while (true) {}` at module scope, or a runaway render loop,
// from hanging the tab indefinitely. This inserts a wall-clock deadline check at the top of every
// while/do-while/for loop body, same technique CodePen/JSBin use for user-authored code — same
// "renders nothing rather than crashes the whole thing" philosophy as this codebase's other
// preview shims, just applied to CPU-bound infinite loops instead of missing data/imports.

const LOOP_DEADLINE_MS = 2000;

type LoopPath = NodePath<WhileStatement | DoWhileStatement | ForStatement>;

export default function previewLoopGuardPlugin({ types: t }: typeof import("@babel/core")): PluginObj {
  let counter = 0;

  function guard(path: LoopPath) {
    const startVar = `__previewLoopStart${counter++}`;

    path.insertBefore(
      t.variableDeclaration("var", [
        t.variableDeclarator(t.identifier(startVar), t.callExpression(t.memberExpression(t.identifier("Date"), t.identifier("now")), [])),
      ]),
    );

    const check = t.ifStatement(
      t.binaryExpression(
        ">",
        t.binaryExpression("-", t.callExpression(t.memberExpression(t.identifier("Date"), t.identifier("now")), []), t.identifier(startVar)),
        t.numericLiteral(LOOP_DEADLINE_MS),
      ),
      t.throwStatement(
        t.newExpression(t.identifier("Error"), [
          t.stringLiteral("This screen's code contains a loop that ran too long to preview."),
        ]),
      ),
    );

    const body = path.get("body");
    // Use t.isBlockStatement(body.node) rather than the NodePath convenience method
    // body.isBlockStatement() — the latter only exists because @babel/traverse dynamically attaches
    // "is*" validators to NodePath.prototype in a loop at module-init time, which has proven fragile
    // once @babel/standalone is bundled/minified by esbuild (intermittently missing at runtime).
    // t.isBlockStatement is a plain, statically-referenced @babel/types export, not subject to that.
    if (t.isBlockStatement(body.node)) {
      (body as NodePath<BlockStatement>).unshiftContainer("body", check);
    } else {
      body.replaceWith(t.blockStatement([check, body.node]));
    }
  }

  return {
    visitor: {
      WhileStatement: guard,
      DoWhileStatement: guard,
      ForStatement: guard,
    },
  };
}

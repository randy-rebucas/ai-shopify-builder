import type { PluginObj, NodePath } from "@babel/core";
import type { WhileStatement, DoWhileStatement, ForStatement, ForOfStatement, ForInStatement } from "@babel/types";

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

type LoopNode = WhileStatement | DoWhileStatement | ForStatement | ForOfStatement | ForInStatement;
type LoopPath = NodePath<LoopNode>;

export default function previewLoopGuardPlugin({ types: t }: typeof import("@babel/core")): PluginObj {
  let counter = 0;
  // A loop we've already wrapped gets re-queued for traversal by the replaceWith below (Babel
  // revisits a replacement's contents, and the wrapped block still contains the same loop node) —
  // without this, the visitor would fire on it again, wrap it again, forever. A plain early return
  // (not path.skip()) still lets Babel descend into the loop's original body afterward, so nested
  // loops still get their own guard inserted normally.
  const guarded = new WeakSet<LoopNode>();

  function guard(path: LoopPath) {
    if (guarded.has(path.node)) return;
    guarded.add(path.node);

    const startVar = `__previewLoopStart${counter++}`;

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

    // Mutate the loop's body via the raw AST node (not a NodePath) so this doesn't depend on
    // path.get("body") staying valid across the wrapping replaceWith below.
    const loopNode = path.node;
    if (t.isBlockStatement(loopNode.body)) {
      loopNode.body.body.unshift(check);
    } else {
      loopNode.body = t.blockStatement([check, loopNode.body]);
    }

    // Previously this used path.insertBefore(startVar decl) followed by a separate path.get("body")
    // mutation — but insertBefore on a loop that sits in a single-statement position (e.g.
    // `if (x) while (true) foo();`, or a loop directly nested as another loop's non-block body,
    // both without braces) has to restructure that position to fit an extra sibling statement,
    // which replaces `path` itself out from under us; the later path.get("body") then operated on
    // a stale/removed path and returned a node-less path, producing a Babel AST validation error.
    // Wrapping the (already-mutated) loop together with the start-time declaration in one block via
    // a single replaceWith is valid in every statement position a loop can appear in, and needs no
    // second step that could observe a stale path.
    path.replaceWith(
      t.blockStatement([
        t.variableDeclaration("var", [
          t.variableDeclarator(t.identifier(startVar), t.callExpression(t.memberExpression(t.identifier("Date"), t.identifier("now")), [])),
        ]),
        loopNode,
      ]),
    );
  }

  return {
    visitor: {
      WhileStatement: guard,
      DoWhileStatement: guard,
      ForStatement: guard,
      ForOfStatement: guard,
      ForInStatement: guard,
    },
  };
}

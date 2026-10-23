// ============================================================
//  ERROR UTILITIES & PRETTY-PRINTER
// ============================================================

import { LexerError }  from "../lexer/tokenizer";
import { ParseError }  from "../parser/parser";
import { RuntimeError } from "../interpreter/environment";

export type LangError = LexerError | ParseError | RuntimeError;

/**
 * Format any interpreter error into a human-readable message,
 * optionally annotating the source line.
 */
export function formatError(err: unknown, source?: string): string {
  if (!(err instanceof Error)) return String(err);

  const lines = source ? source.split("\n") : [];
  let msg = err.message;

  const lineNo = extractLine(err);
  if (lineNo !== null && lineNo > 0 && lines[lineNo - 1] !== undefined) {
    const srcLine = lines[lineNo - 1];
    msg += `\n  ${lineNo} | ${srcLine}`;
    msg += `\n       ${"^".repeat(Math.max(1, srcLine.trim().length))}`;
  }

  return msg;
}

function extractLine(err: Error): number | null {
  if ("line" in err) return (err as any).line as number;
  return null;
}

// ── AST pretty-printer ────────────────────────────────────

/**
 * Recursively stringify an AST node for debug display.
 */
export function prettyAST(node: unknown, indent = 0): string {
  const pad = "  ".repeat(indent);
  if (node === null || node === undefined) return `${pad}null`;
  if (Array.isArray(node)) {
    if (node.length === 0) return `${pad}[]`;
    return node.map(n => prettyAST(n, indent)).join("\n");
  }
  if (typeof node === "object") {
    const obj = node as Record<string, unknown>;
    const type = obj.type ? ` [${obj.type}]` : "";
    const children = Object.entries(obj)
      .filter(([k]) => k !== "type" && k !== "line")
      .map(([k, v]) => {
        const child = Array.isArray(v) || (typeof v === "object" && v !== null && "type" in (v as any))
          ? "\n" + prettyAST(v, indent + 2)
          : ` ${JSON.stringify(v)}`;
        return `${pad}  ${k}:${child}`;
      })
      .join("\n");
    return `${pad}(${type}\n${children}\n${pad})`;
  }
  return `${pad}${JSON.stringify(node)}`;
}

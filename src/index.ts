#!/usr/bin/env node
// ============================================================
//  ENTRY POINT  –  CLI + REPL
//
//  Usage:
//    ts-node src/index.ts                 # interactive REPL
//    ts-node src/index.ts run file.lang   # run a file
//    ts-node src/index.ts ast file.lang   # dump AST
//    ts-node src/index.ts tokens file.lang # dump tokens
// ============================================================

import * as fs   from "fs";
import * as path from "path";
import * as readline from "readline";

import { Lexer }        from "./lexer/tokenizer";
import { Parser }       from "./parser/parser";
import { Interpreter }  from "./interpreter/interpreter";
import { formatError, prettyAST } from "./utils/errors";

// ── helpers ──────────────────────────────────────────────
function runSource(source: string, mode: "run" | "ast" | "tokens"): void {
  try {
    // ── Phase 1: Lex ────────────────────────────────────
    const lexer  = new Lexer(source);
    const tokens = lexer.tokenize();

    if (mode === "tokens") {
      console.log("\n📦  TOKENS\n" + "─".repeat(50));
      tokens.forEach(t => {
        const val = t.value !== undefined ? ` (${JSON.stringify(t.value)})` : "";
        console.log(`  ${String(t.type).padEnd(14)} ${val}   [${t.line}:${t.col}]`);
      });
      return;
    }

    // ── Phase 2: Parse ──────────────────────────────────
    const parser  = new Parser(tokens);
    const program = parser.parse();

    if (mode === "ast") {
      console.log("\n🌲  AST\n" + "─".repeat(50));
      console.log(JSON.stringify(program, null, 2));
      return;
    }

    // ── Phase 3: Interpret ──────────────────────────────
    const interpreter = new Interpreter();
    interpreter.run(program);

  } catch (err) {
    console.error("\n❌  " + formatError(err, source));
    process.exitCode = 1;
  }
}

// ── CLI ──────────────────────────────────────────────────
const [,, cmd, file] = process.argv;

if (cmd === "run" || cmd === "ast" || cmd === "tokens") {
  if (!file) {
    console.error(`Usage: ts-node src/index.ts ${cmd} <file.lang>`);
    process.exit(1);
  }
  const filePath = path.resolve(file);
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }
  const source = fs.readFileSync(filePath, "utf-8");
  console.log(`\n🚀  Running: ${path.basename(filePath)}\n${"─".repeat(50)}`);
  runSource(source, cmd as any);

} else {
  // ── REPL ─────────────────────────────────────────────
  console.log("─".repeat(50));
  console.log("  🦜  MiniLang REPL   (type 'exit' to quit)");
  console.log("       Commands: .tokens, .ast, .help, .clear");
  console.log("─".repeat(50));

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const interpreter = new Interpreter(); // persist state across lines
  let buffer = "";       // multi-line accumulation
  let mode: "run" | "ast" | "tokens" = "run";

  const prompt = () => rl.question(buffer ? "... " : ">>> ", onLine);

  const onLine = (line: string) => {
    const trimmed = line.trim();

    // ── dot commands ─────────────────────────────────────
    if (trimmed === "exit" || trimmed === ".exit") { rl.close(); return; }
    if (trimmed === ".help") {
      console.log([
        "  .tokens  – switch to token-dump mode",
        "  .ast     – switch to AST-dump mode",
        "  .run     – switch back to execution mode",
        "  .clear   – reset the interpreter state",
        "  .exit / exit  – quit",
      ].join("\n"));
      return prompt();
    }
    if (trimmed === ".tokens") { mode = "tokens"; console.log("Mode: tokens"); return prompt(); }
    if (trimmed === ".ast")    { mode = "ast";    console.log("Mode: ast");    return prompt(); }
    if (trimmed === ".run")    { mode = "run";    console.log("Mode: run");    return prompt(); }
    if (trimmed === ".clear") {
      // Reset by re-assigning would need re-import; just inform:
      console.log("(Start a new session to fully reset state.)");
      return prompt();
    }

    // Accumulate multi-line blocks
    buffer += (buffer ? "\n" : "") + line;

    // Heuristic: if open braces exceed closing braces, keep accumulating
    const opens  = (buffer.match(/\{/g) || []).length;
    const closes = (buffer.match(/\}/g) || []).length;
    if (opens > closes) return prompt();

    // Execute / display
    if (buffer.trim()) {
      runSource(buffer, mode);
    }
    buffer = "";
    prompt();
  };

  prompt();
  rl.on("close", () => { console.log("\nGoodbye! 👋"); process.exit(0); });
}

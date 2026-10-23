// ============================================================
//  TEST SUITE  –  simple self-contained test runner
// ============================================================

import { Lexer }       from "../lexer/tokenizer";
import { Parser }      from "../parser/parser";
import { Interpreter } from "../interpreter/interpreter";

// ── Test harness ─────────────────────────────────────────

interface TestCase {
  name: string;
  source: string;
  expect?: string[];   // expected output lines
  throws?: boolean;    // expected to throw
}

let passed = 0, failed = 0;

function run(tc: TestCase) {
  try {
    const tokens      = new Lexer(tc.source).tokenize();
    const program     = new Parser(tokens).parse();
    const interpreter = new Interpreter();
    interpreter.run(program);

    if (tc.throws) {
      console.error(`✗  ${tc.name}  → expected an error but none was thrown`);
      failed++;
      return;
    }

    if (tc.expect) {
      const got = interpreter.output;
      const ok  = tc.expect.every((line, i) => got[i] === line) && got.length === tc.expect.length;
      if (ok) {
        console.log(`✓  ${tc.name}`);
        passed++;
      } else {
        console.error(`✗  ${tc.name}`);
        console.error(`   Expected: ${JSON.stringify(tc.expect)}`);
        console.error(`   Got:      ${JSON.stringify(got)}`);
        failed++;
      }
    } else {
      console.log(`✓  ${tc.name}`);
      passed++;
    }
  } catch (err) {
    if (tc.throws) {
      console.log(`✓  ${tc.name}  (threw as expected)`);
      passed++;
    } else {
      console.error(`✗  ${tc.name}  → unexpected error: ${(err as Error).message}`);
      failed++;
    }
  }
}

// ── Test cases ────────────────────────────────────────────

const tests: TestCase[] = [
  // Literals
  {
    name: "number literal",
    source: `print(42)`,
    expect: ["42"],
  },
  {
    name: "string literal",
    source: `print("hello")`,
    expect: ["hello"],
  },
  {
    name: "boolean literal",
    source: `print(true)\nprint(false)`,
    expect: ["true", "false"],
  },

  // Arithmetic
  {
    name: "addition",
    source: `print(3 + 4)`,
    expect: ["7"],
  },
  {
    name: "subtraction",
    source: `print(10 - 3)`,
    expect: ["7"],
  },
  {
    name: "multiplication",
    source: `print(6 * 7)`,
    expect: ["42"],
  },
  {
    name: "division",
    source: `print(10 / 4)`,
    expect: ["2.5"],
  },
  {
    name: "modulo",
    source: `print(10 % 3)`,
    expect: ["1"],
  },
  {
    name: "operator precedence",
    source: `print(2 + 3 * 4)`,
    expect: ["14"],
  },
  {
    name: "parenthesised expression",
    source: `print((2 + 3) * 4)`,
    expect: ["20"],
  },

  // Variables
  {
    name: "variable declaration and use",
    source: `let x = 10\nprint(x)`,
    expect: ["10"],
  },
  {
    name: "variable assignment",
    source: `let x = 5\nx = x + 1\nprint(x)`,
    expect: ["6"],
  },

  // Strings
  {
    name: "string concatenation",
    source: `print("Hello, " + "World!")`,
    expect: ["Hello, World!"],
  },
  {
    name: "number + string coercion",
    source: `print("Value: " + str(42))`,
    expect: ["Value: 42"],
  },

  // If statements
  {
    name: "if true",
    source: `if (1 < 2) {\n  print("yes")\n}`,
    expect: ["yes"],
  },
  {
    name: "if false",
    source: `if (2 < 1) {\n  print("yes")\n}`,
    expect: [],
  },
  {
    name: "if-else",
    source: `if (false) { print("a") } else { print("b") }`,
    expect: ["b"],
  },
  {
    name: "else-if chain",
    source: [
      `let x = 2`,
      `if (x == 1) { print("one") }`,
      `else if (x == 2) { print("two") }`,
      `else { print("other") }`,
    ].join("\n"),
    expect: ["two"],
  },

  // While loops
  {
    name: "while loop",
    source: `let i = 0\nwhile (i < 3) {\n  print(i)\n  i = i + 1\n}`,
    expect: ["0", "1", "2"],
  },

  // Functions
  {
    name: "function declaration and call",
    source: `fn greet(name) { print("Hi " + name) }\ngreet("Alice")`,
    expect: ["Hi Alice"],
  },
  {
    name: "function with return value",
    source: `fn double(x) { return x * 2 }\nprint(double(5))`,
    expect: ["10"],
  },
  {
    name: "recursive factorial",
    source: [
      `fn fact(n) {`,
      `  if (n <= 1) { return 1 }`,
      `  return n * fact(n - 1)`,
      `}`,
      `print(fact(5))`,
    ].join("\n"),
    expect: ["120"],
  },
  {
    name: "nested functions / lexical scope",
    source: [
      `fn outer() {`,
      `  let x = 10`,
      `  fn inner() { return x + 5 }`,
      `  return inner()`,
      `}`,
      `print(outer())`,
    ].join("\n"),
    expect: ["15"],
  },

  // Logical operators
  {
    name: "logical AND true",
    source: `if (true && true) { print("ok") }`,
    expect: ["ok"],
  },
  {
    name: "logical AND false",
    source: `if (true && false) { print("ok") }`,
    expect: [],
  },
  {
    name: "logical OR",
    source: `if (false || true) { print("ok") }`,
    expect: ["ok"],
  },
  {
    name: "unary negation",
    source: `print(-5)`,
    expect: ["-5"],
  },
  {
    name: "unary NOT",
    source: `print(!true)`,
    expect: ["false"],
  },

  // Built-ins
  {
    name: "str()",
    source: `print(str(3.14))`,
    expect: ["3.14"],
  },
  {
    name: "num()",
    source: `print(num("42") + 1)`,
    expect: ["43"],
  },
  {
    name: "len()",
    source: `print(len("hello"))`,
    expect: ["5"],
  },
  {
    name: "abs()",
    source: `print(abs(-7))`,
    expect: ["7"],
  },

  // Error cases
  {
    name: "undefined variable throws",
    source: `print(notDefined)`,
    throws: true,
  },
  {
    name: "division by zero throws",
    source: `print(1 / 0)`,
    throws: true,
  },
  {
    name: "wrong arg count throws",
    source: `fn f(a, b) { return a + b }\nf(1)`,
    throws: true,
  },
  {
    name: "unterminated string throws",
    source: `print("hello)`,
    throws: true,
  },
  {
    name: "assignment to undeclared var throws",
    source: `x = 5`,
    throws: true,
  },

  // Edge cases
  {
    name: "empty program",
    source: ``,
    expect: [],
  },
  {
    name: "multiple print calls",
    source: `print(1)\nprint(2)\nprint(3)`,
    expect: ["1", "2", "3"],
  },
  {
    name: "comment ignored",
    source: `# this is a comment\nprint("ok")`,
    expect: ["ok"],
  },
  {
    name: "float arithmetic",
    source: `print(0.1 + 0.2)`,
    expect: ["0.30000000000000004"],  // JS float behavior
  },
];

// ── Run all tests ─────────────────────────────────────────
console.log("\n🧪  MiniLang Test Suite\n" + "═".repeat(50));
tests.forEach(run);
console.log("─".repeat(50));
console.log(`  Passed: ${passed}   Failed: ${failed}   Total: ${passed + failed}`);
console.log("═".repeat(50) + "\n");

if (failed > 0) process.exit(1);

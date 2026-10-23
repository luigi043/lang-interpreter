# 🦜 MiniLang — Custom Language Interpreter

A fully-featured, educational programming language interpreter built in TypeScript.
Implements every phase of a real compiler pipeline: **Lexer → Parser → Interpreter**.

---

## 🏗 Architecture

```
src/
 ├── lexer/
 │    └── tokenizer.ts      Phase 1 – source text → token stream
 ├── parser/
 │    ├── ast.ts            AST node type definitions
 │    └── parser.ts         Phase 2 – token stream → AST (recursive descent)
 ├── interpreter/
 │    ├── environment.ts    Scope chain / variable management
 │    └── interpreter.ts    Phase 3 – tree-walk execution
 ├── utils/
 │    └── errors.ts         Error formatting + AST pretty-printer
 ├── tests/
 │    └── run-tests.ts      Self-contained test runner (40+ cases)
 └── index.ts               CLI entry-point + REPL
```

---

## 🚀 Getting Started

```bash
npm install
```

### Run a file
```bash
npm start run examples/01_basics.lang
npm start run examples/02_functions.lang
npm start run examples/03_loops.lang
npm start run examples/04_scope.lang
```

### Interactive REPL
```bash
npm start
# >>> let x = 5
# >>> print(x * 2)
# 10
```

### Dump tokens
```bash
npm start tokens examples/01_basics.lang
```

### Dump AST (JSON)
```bash
npm start ast examples/01_basics.lang
```

### Run tests
```bash
npm test
```

---

## 📖 Language Reference

### Variables
```
let name = "Alice"
let score = 100
let active = true
```

### Arithmetic
```
print(2 + 3)    # 5
print(10 / 4)   # 2.5
print(10 % 3)   # 1
print(2 * (3 + 4))  # 14
```

### Strings
```
let s = "Hello, " + "World!"
print(s)
print("Length: " + str(len(s)))
```

### If / Else
```
if (x < 10) {
  print("small")
} else if (x < 100) {
  print("medium")
} else {
  print("large")
}
```

### While Loops
```
let i = 0
while (i < 5) {
  print(i)
  i = i + 1
}
```

### Functions
```
fn factorial(n) {
  if (n <= 1) { return 1 }
  return n * factorial(n - 1)
}

print(factorial(10))   # 3628800
```

### Operators
| Symbol | Meaning         |
|--------|-----------------|
| `+`    | Add / concat    |
| `-`    | Subtract        |
| `*`    | Multiply        |
| `/`    | Divide          |
| `%`    | Modulo          |
| `==`   | Equal           |
| `!=`   | Not equal       |
| `<`    | Less than       |
| `<=`   | Less or equal   |
| `>``   | Greater than    |
| `>=`   | Greater/equal   |
| `&&`   | Logical AND     |
| `\|\|` | Logical OR      |
| `!`    | Logical NOT     |

### Built-in Functions
| Function   | Description                    |
|------------|--------------------------------|
| `print(x)` | Print value to stdout          |
| `str(x)`   | Convert to string              |
| `num(x)`   | Convert to number              |
| `type(x)`  | Return type name as string     |
| `len(s)`   | String length                  |
| `abs(x)`   | Absolute value                 |
| `sqrt(x)`  | Square root                    |
| `floor(x)` | Floor                          |
| `ceil(x)`  | Ceiling                        |
| `rand()`   | Random float [0, 1)            |

### Comments
```
# This is a comment
// So is this
let x = 5  # inline comment
```

---

## 🧠 How It Works

### Phase 1 — Lexer (`tokenizer.ts`)
Reads the source character-by-character and emits typed `Token` objects.

```
"let x = 10 + 5"
 ↓
[LET] [IDENTIFIER:"x"] [EQUALS] [NUMBER:10] [PLUS] [NUMBER:5] [EOF]
```

### Phase 2 — Parser (`parser.ts`)
Uses **recursive descent** to convert the flat token stream into a hierarchical
**Abstract Syntax Tree** that mirrors the grammar:

```
BinaryExpression (+)
├── Identifier: x        ← resolved at runtime
└── NumberLiteral: 5
```

The full grammar in BNF:

```
program    → statement* EOF
statement  → varDecl | fnDecl | returnStmt | ifStmt | whileStmt | exprStmt | block
varDecl    → "let" IDENTIFIER "=" expression terminator
fnDecl     → "fn" IDENTIFIER "(" params ")" block
ifStmt     → "if" "(" expr ")" block ("else" (block | ifStmt))?
whileStmt  → "while" "(" expr ")" block
exprStmt   → expression terminator
expression → assignment | logical | comparison | addition | multiply | unary | call | primary
```

### Phase 3 — Interpreter (`interpreter.ts`)
Walks the AST recursively. Each node type has a corresponding `eval*` or `exec*` method.

- `evalExpr(node)` evaluates an expression → returns a `LangValue`
- `execStatement(node, env)` executes a statement → side-effects + optional `ReturnSignal`
- `Environment` is a linked-list of scopes (lexical scoping)

---

## 📊 Feature Checklist

| Feature              | Status |
|----------------------|--------|
| Variables (`let`)    | ✅ |
| Arithmetic           | ✅ |
| Strings              | ✅ |
| Booleans             | ✅ |
| Print / built-ins    | ✅ |
| If / else-if / else  | ✅ |
| While loops          | ✅ |
| Functions (`fn`)     | ✅ |
| Return values        | ✅ |
| Recursive functions  | ✅ |
| Lexical scope        | ✅ |
| Closures             | ✅ |
| Logical operators    | ✅ |
| Error handling       | ✅ |
| REPL                 | ✅ |
| Multi-line blocks    | ✅ |
| Comments (`#`, `//`) | ✅ |

---

## 🔌 Extending the Language

To add a new feature:

1. **New token**: add it to `TokenType` in `tokenizer.ts` and handle it in `readToken()`
2. **New AST node**: add an interface to `ast.ts`
3. **New grammar rule**: add a `parse*` method in `parser.ts`
4. **New semantics**: add a case to `evalExpr` / `execStatement` in `interpreter.ts`

Example extensions to try:
- Arrays: `let arr = [1, 2, 3]` with `arr[0]`
- For-loops: `for (let i = 0; i < 10; i = i + 1)`
- String methods: `len`, `upper`, `lower`
- First-class function variables: `let f = fn(x) { return x * 2 }`

---

## 📄 License
MIT

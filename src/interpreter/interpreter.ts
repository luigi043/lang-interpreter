// ============================================================
//  INTERPRETER  –  Tree-Walk Executor
//  Phase 3: Walk the AST and evaluate nodes to values.
// ============================================================

import {
  Program, Statement, Expression,
  VariableDeclaration, FunctionDeclaration, ReturnStatement,
  IfStatement, WhileStatement, BlockStatement, ExpressionStatement,
  BinaryExpression, UnaryExpression, LogicalExpression,
  AssignmentExpression, CallExpression,
  NumberLiteral, StringLiteral, BooleanLiteral, Identifier,
} from "../parser/ast";

import {
  Environment, LangValue, LangFunction, ReturnSignal, RuntimeError,
} from "./environment";

// ──────────────────────────────────────────────────────────
export class Interpreter {
  /** Output collected during execution (populated by print()). */
  public output: string[] = [];

  private globals: Environment;
  private env: Environment;

  constructor() {
    this.globals = new Environment();
    this.env = this.globals;
    this.registerBuiltins();
  }

  // ── built-in functions ────────────────────────────────────
  private registerBuiltins() {
    // print(...args) – prints to output array and console
    this.globals.define("print", {
      kind: "function",
      name: "print",
      params: [],
      body: null as any, // native; handled separately
      closure: this.globals,
      native: (...args: LangValue[]) => {
        const line = args.map(stringify).join(" ");
        this.output.push(line);
        console.log(line);
        return null;
      },
    } as any);

    // type(x) – returns a string with the type name
    this.globals.define("type", {
      kind: "function",
      name: "type",
      params: [],
      body: null as any,
      closure: this.globals,
      native: (x: LangValue) => typeof x === "object" && x !== null ? "function" : x === null ? "null" : typeof x,
    } as any);

    // str(x) – converts to string
    this.globals.define("str", {
      kind: "function",
      name: "str",
      params: [],
      body: null as any,
      closure: this.globals,
      native: (x: LangValue) => stringify(x),
    } as any);

    // num(x) – converts to number
    this.globals.define("num", {
      kind: "function",
      name: "num",
      params: [],
      body: null as any,
      closure: this.globals,
      native: (x: LangValue) => {
        const n = Number(x);
        if (isNaN(n)) throw new RuntimeError(`Cannot convert '${x}' to number`);
        return n;
      },
    } as any);

    // sqrt(x)
    this.globals.define("sqrt", {
      kind: "function", name: "sqrt", params: [], body: null as any, closure: this.globals,
      native: (x: LangValue) => Math.sqrt(x as number),
    } as any);

    // abs(x)
    this.globals.define("abs", {
      kind: "function", name: "abs", params: [], body: null as any, closure: this.globals,
      native: (x: LangValue) => Math.abs(x as number),
    } as any);

    // floor(x)
    this.globals.define("floor", {
      kind: "function", name: "floor", params: [], body: null as any, closure: this.globals,
      native: (x: LangValue) => Math.floor(x as number),
    } as any);

    // ceil(x)
    this.globals.define("ceil", {
      kind: "function", name: "ceil", params: [], body: null as any, closure: this.globals,
      native: (x: LangValue) => Math.ceil(x as number),
    } as any);

    // rand() – [0, 1)
    this.globals.define("rand", {
      kind: "function", name: "rand", params: [], body: null as any, closure: this.globals,
      native: () => Math.random(),
    } as any);

    // len(s) – string length
    this.globals.define("len", {
      kind: "function", name: "len", params: [], body: null as any, closure: this.globals,
      native: (s: LangValue) => {
        if (typeof s !== "string") throw new RuntimeError("len() expects a string");
        return s.length;
      },
    } as any);
  }

  // ── entry point ───────────────────────────────────────────
  run(program: Program): void {
    for (const stmt of program.body) {
      this.execStatement(stmt, this.env);
    }
  }

  // ── statement dispatcher ─────────────────────────────────
  private execStatement(node: Statement, env: Environment): void | ReturnSignal {
    switch (node.type) {
      case "VariableDeclaration":  return this.execVarDecl(node, env);
      case "FunctionDeclaration":  return this.execFnDecl(node, env);
      case "ReturnStatement":      return this.execReturn(node, env);
      case "IfStatement":          return this.execIf(node, env);
      case "WhileStatement":       return this.execWhile(node, env);
      case "BlockStatement":       return this.execBlock(node, env);
      case "ExpressionStatement":  return this.execExprStmt(node, env);
      default:
        throw new RuntimeError(`Unknown statement type: ${(node as any).type}`);
    }
  }

  private execVarDecl(node: VariableDeclaration, env: Environment): void {
    const value = this.evalExpr(node.value, env);
    env.define(node.name, value);
  }

  private execFnDecl(node: FunctionDeclaration, env: Environment): void {
    const fn: LangFunction = {
      kind: "function",
      name: node.name,
      params: node.params,
      body: node.body,
      closure: env, // capture current scope
    };
    env.define(node.name, fn);
  }

  private execReturn(node: ReturnStatement, env: Environment): ReturnSignal {
    const value = node.value ? this.evalExpr(node.value, env) : null;
    return new ReturnSignal(value);
  }

  private execIf(node: IfStatement, env: Environment): void | ReturnSignal {
    const condition = this.evalExpr(node.condition, env);
    if (isTruthy(condition)) {
      return this.execBlock(node.consequent, env.child());
    } else if (node.alternate) {
      if (node.alternate.type === "BlockStatement") {
        return this.execBlock(node.alternate, env.child());
      } else {
        return this.execIf(node.alternate, env);
      }
    }
  }

  private execWhile(node: WhileStatement, env: Environment): void | ReturnSignal {
    while (isTruthy(this.evalExpr(node.condition, env))) {
      const result = this.execBlock(node.body, env.child());
      if (result instanceof ReturnSignal) return result;
    }
  }

  private execBlock(node: BlockStatement, env: Environment): void | ReturnSignal {
    for (const stmt of node.body) {
      const result = this.execStatement(stmt, env);
      if (result instanceof ReturnSignal) return result;
    }
  }

  private execExprStmt(node: ExpressionStatement, env: Environment): void {
    this.evalExpr(node.expression, env);
  }

  // ── expression evaluator ─────────────────────────────────
  evalExpr(node: Expression, env: Environment): LangValue {
    switch (node.type) {
      case "NumberLiteral":  return node.value;
      case "StringLiteral":  return node.value;
      case "BooleanLiteral": return node.value;
      case "Identifier":     return this.evalIdentifier(node, env);
      case "BinaryExpression":    return this.evalBinary(node, env);
      case "UnaryExpression":     return this.evalUnary(node, env);
      case "LogicalExpression":   return this.evalLogical(node, env);
      case "AssignmentExpression":return this.evalAssignment(node, env);
      case "CallExpression":      return this.evalCall(node, env);
      default:
        throw new RuntimeError(`Unknown expression type: ${(node as any).type}`);
    }
  }

  private evalIdentifier(node: Identifier, env: Environment): LangValue {
    return env.get(node.name, node.line);
  }

  private evalBinary(node: BinaryExpression, env: Environment): LangValue {
    const left  = this.evalExpr(node.left,  env);
    const right = this.evalExpr(node.right, env);
    const ln = node.line;

    switch (node.operator) {
      case "+":
        if (typeof left === "string" || typeof right === "string")
          return stringify(left) + stringify(right);
        return (left as number) + (right as number);

      case "-":  return assertNum(left, ln) - assertNum(right, ln);
      case "*":  return assertNum(left, ln) * assertNum(right, ln);
      case "/":
        if (assertNum(right, ln) === 0) throw new RuntimeError("Division by zero", ln);
        return assertNum(left, ln) / assertNum(right, ln);
      case "%":  return assertNum(left, ln) % assertNum(right, ln);

      case "==": return left === right;
      case "!=": return left !== right;
      case "<":  return (left as number) <  (right as number);
      case "<=": return (left as number) <= (right as number);
      case ">":  return (left as number) >  (right as number);
      case ">=": return (left as number) >= (right as number);

      default:
        throw new RuntimeError(`Unknown operator '${node.operator}'`, ln);
    }
  }

  private evalUnary(node: UnaryExpression, env: Environment): LangValue {
    const val = this.evalExpr(node.operand, env);
    switch (node.operator) {
      case "-": return -(val as number);
      case "!": return !isTruthy(val);
    }
  }

  private evalLogical(node: LogicalExpression, env: Environment): LangValue {
    const left = this.evalExpr(node.left, env);
    if (node.operator === "&&") return isTruthy(left) ? this.evalExpr(node.right, env) : left;
    if (node.operator === "||") return isTruthy(left) ? left : this.evalExpr(node.right, env);
    throw new RuntimeError("Unknown logical operator");
  }

  private evalAssignment(node: AssignmentExpression, env: Environment): LangValue {
    const value = this.evalExpr(node.value, env);
    env.assign(node.name, value, node.line);
    return value;
  }

  private evalCall(node: CallExpression, env: Environment): LangValue {
    const callee = env.get(node.callee, node.line);
    if (!callee || (callee as any).kind !== "function") {
      throw new RuntimeError(`'${node.callee}' is not a function`, node.line);
    }

    const fn = callee as any; // LangFunction | native extension
    const args = node.args.map(a => this.evalExpr(a, env));

    // Native (built-in) function
    if (fn.native) {
      return fn.native(...args) ?? null;
    }

    // User-defined function
    const langFn = fn as LangFunction;
    if (args.length !== langFn.params.length) {
      throw new RuntimeError(
        `'${langFn.name}' expects ${langFn.params.length} argument(s), got ${args.length}`,
        node.line
      );
    }

    // Create a new scope as child of the closure (lexical scoping)
    const callEnv = langFn.closure.child();
    for (let i = 0; i < langFn.params.length; i++) {
      callEnv.define(langFn.params[i], args[i]);
    }

    const result = this.execBlock(langFn.body, callEnv);
    if (result instanceof ReturnSignal) return result.value;
    return null;
  }
}

// ── value helpers ─────────────────────────────────────────

function isTruthy(val: LangValue): boolean {
  if (val === null || val === false || val === 0 || val === "") return false;
  return true;
}

function stringify(val: LangValue): string {
  if (val === null) return "null";
  if (typeof val === "boolean") return val ? "true" : "false";
  if (typeof val === "object") return `<fn ${(val as LangFunction).name}>`;
  return String(val);
}

function assertNum(val: LangValue, line?: number): number {
  if (typeof val !== "number") {
    throw new RuntimeError(`Expected number, got '${typeof val}'`, line);
  }
  return val;
}

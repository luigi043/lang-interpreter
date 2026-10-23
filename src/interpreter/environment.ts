// ============================================================
//  ENVIRONMENT  –  Variable Scope Management
//  Each scope has an optional parent for lexical look-up.
// ============================================================

export class RuntimeError extends Error {
  constructor(msg: string, public line?: number) {
    super(line ? `[Runtime] Line ${line} – ${msg}` : `[Runtime] ${msg}`);
    this.name = "RuntimeError";
  }
}

export type LangValue = number | string | boolean | LangFunction | null;

export interface LangFunction {
  kind: "function";
  name: string;
  params: string[];
  body: import("../parser/ast").BlockStatement;
  closure: Environment; // captured lexical scope
}

/** Sentinel used to propagate `return` values through the call stack. */
export class ReturnSignal {
  constructor(public value: LangValue) {}
}

// ──────────────────────────────────────────────────────────
export class Environment {
  private variables = new Map<string, LangValue>();

  constructor(public parent?: Environment) {}

  /** Look up a variable by walking up the scope chain. */
  get(name: string, line?: number): LangValue {
    if (this.variables.has(name)) return this.variables.get(name)!;
    if (this.parent) return this.parent.get(name, line);
    throw new RuntimeError(`Undefined variable '${name}'`, line);
  }

  /** Define a NEW variable in the current scope. */
  define(name: string, value: LangValue): void {
    this.variables.set(name, value);
  }

  /**
   * Assign to an existing variable.
   * Searches the scope chain; throws if not found anywhere.
   */
  assign(name: string, value: LangValue, line?: number): void {
    if (this.variables.has(name)) {
      this.variables.set(name, value);
      return;
    }
    if (this.parent) {
      this.parent.assign(name, value, line);
      return;
    }
    throw new RuntimeError(`Cannot assign to undefined variable '${name}'`, line);
  }

  /** Create a child scope that inherits from this one. */
  child(): Environment {
    return new Environment(this);
  }
}

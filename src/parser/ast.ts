// ============================================================
//  AST NODE DEFINITIONS
//  Every node in the Abstract Syntax Tree is typed here.
// ============================================================

// ── Statements ────────────────────────────────────────────

export type Statement =
  | VariableDeclaration
  | ExpressionStatement
  | IfStatement
  | WhileStatement
  | FunctionDeclaration
  | ReturnStatement
  | BlockStatement;

export interface VariableDeclaration {
  type: "VariableDeclaration";
  name: string;
  value: Expression;
  line: number;
}

export interface ExpressionStatement {
  type: "ExpressionStatement";
  expression: Expression;
  line: number;
}

export interface IfStatement {
  type: "IfStatement";
  condition: Expression;
  consequent: BlockStatement;
  alternate?: BlockStatement | IfStatement; // else / else if
  line: number;
}

export interface WhileStatement {
  type: "WhileStatement";
  condition: Expression;
  body: BlockStatement;
  line: number;
}

export interface FunctionDeclaration {
  type: "FunctionDeclaration";
  name: string;
  params: string[];
  body: BlockStatement;
  line: number;
}

export interface ReturnStatement {
  type: "ReturnStatement";
  value?: Expression;
  line: number;
}

export interface BlockStatement {
  type: "BlockStatement";
  body: Statement[];
  line: number;
}

// ── Expressions ───────────────────────────────────────────

export type Expression =
  | NumberLiteral
  | StringLiteral
  | BooleanLiteral
  | Identifier
  | BinaryExpression
  | UnaryExpression
  | LogicalExpression
  | AssignmentExpression
  | CallExpression;

export interface NumberLiteral {
  type: "NumberLiteral";
  value: number;
  line: number;
}

export interface StringLiteral {
  type: "StringLiteral";
  value: string;
  line: number;
}

export interface BooleanLiteral {
  type: "BooleanLiteral";
  value: boolean;
  line: number;
}

export interface Identifier {
  type: "Identifier";
  name: string;
  line: number;
}

export interface BinaryExpression {
  type: "BinaryExpression";
  operator: "+" | "-" | "*" | "/" | "%" | "==" | "!=" | "<" | "<=" | ">" | ">=";
  left: Expression;
  right: Expression;
  line: number;
}

export interface UnaryExpression {
  type: "UnaryExpression";
  operator: "-" | "!";
  operand: Expression;
  line: number;
}

export interface LogicalExpression {
  type: "LogicalExpression";
  operator: "&&" | "||";
  left: Expression;
  right: Expression;
  line: number;
}

export interface AssignmentExpression {
  type: "AssignmentExpression";
  name: string;
  value: Expression;
  line: number;
}

export interface CallExpression {
  type: "CallExpression";
  callee: string;
  args: Expression[];
  line: number;
}

// ── Program root ──────────────────────────────────────────

export interface Program {
  type: "Program";
  body: Statement[];
}

// ============================================================
//  PARSER  –  Recursive Descent
//  Phase 2: Token stream → Abstract Syntax Tree
//
//  Grammar (BNF-style):
//
//  program       → statement* EOF
//  statement     → varDecl
//                | fnDecl
//                | returnStmt
//                | ifStmt
//                | whileStmt
//                | exprStmt
//                | block
//  varDecl       → "let" IDENTIFIER "=" expression terminator
//  fnDecl        → "fn" IDENTIFIER "(" params ")" block
//  returnStmt    → "return" expression? terminator
//  ifStmt        → "if" "(" expression ")" block ("else" (block | ifStmt))?
//  whileStmt     → "while" "(" expression ")" block
//  exprStmt      → expression terminator
//  block         → "{" statement* "}"
//  params        → (IDENTIFIER ("," IDENTIFIER)*)?
//
//  expression    → assignment
//  assignment    → IDENTIFIER "=" assignment | logical
//  logical       → comparison (("&&" | "||") comparison)*
//  comparison    → addition (("<"|">"|"<="|">="|"=="|"!=") addition)*
//  addition      → multiply (("+" | "-") multiply)*
//  multiply      → unary (("*" | "/" | "%") unary)*
//  unary         → ("-" | "!") unary | call
//  call          → IDENTIFIER "(" args ")" | primary
//  primary       → NUMBER | STRING | BOOLEAN | IDENTIFIER | "(" expression ")"
// ============================================================

import { Token, TokenType } from "../lexer/tokenizer";
import {
  Program, Statement, Expression,
  VariableDeclaration, FunctionDeclaration, ReturnStatement,
  IfStatement, WhileStatement, BlockStatement, ExpressionStatement,
  BinaryExpression, UnaryExpression, LogicalExpression,
  AssignmentExpression, CallExpression,
  NumberLiteral, StringLiteral, BooleanLiteral, Identifier,
} from "./ast";

export class ParseError extends Error {
  constructor(msg: string, public line: number) {
    super(`[Parser] Line ${line} – ${msg}`);
    this.name = "ParseError";
  }
}

export class Parser {
  private tokens: Token[];
  private pos = 0;

  constructor(tokens: Token[]) {
    // Strip newline tokens – we use them only to avoid needing semicolons.
    // We keep them as implicit statement terminators via skipNewlines().
    this.tokens = tokens;
  }

  // ── public entry point ──────────────────────────────────
  parse(): Program {
    const body: Statement[] = [];
    this.skipNewlines();
    while (!this.isAtEnd()) {
      body.push(this.parseStatement());
      this.skipNewlines();
    }
    return { type: "Program", body };
  }

  // ── helpers ─────────────────────────────────────────────
  private isAtEnd(): boolean {
    return this.peek().type === "EOF";
  }

  private peek(): Token {
    return this.tokens[this.pos];
  }

  private peekNext(): Token {
    return this.tokens[this.pos + 1] ?? this.tokens[this.pos];
  }

  private advance(): Token {
    const tok = this.tokens[this.pos];
    if (tok.type !== "EOF") this.pos++;
    return tok;
  }

  private check(type: TokenType): boolean {
    return this.peek().type === type;
  }

  private checkAny(...types: TokenType[]): boolean {
    return types.includes(this.peek().type);
  }

  private match(...types: TokenType[]): boolean {
    if (this.checkAny(...types)) { this.advance(); return true; }
    return false;
  }

  private consume(type: TokenType, errMsg: string): Token {
    if (this.check(type)) return this.advance();
    throw new ParseError(errMsg, this.peek().line);
  }

  private skipNewlines() {
    while (this.check("NEWLINE") || this.check("SEMICOLON")) this.advance();
  }

  /** Consume one statement terminator (newline, semicolon, or implicit before '}'). */
  private expectTerminator() {
    // '}' ends a block — don't consume it, just return
    if (this.check("RBRACE")) return;
    if (this.checkAny("NEWLINE", "SEMICOLON", "EOF")) {
      if (!this.check("EOF")) this.advance();
      this.skipNewlines();
      return;
    }
    throw new ParseError(
      `Expected newline or ';' after statement, got '${this.peek().type}'`,
      this.peek().line
    );
  }

  // ── statements ───────────────────────────────────────────
  private parseStatement(): Statement {
    const tok = this.peek();

    if (tok.type === "LET")    return this.parseVarDecl();
    if (tok.type === "FN")     return this.parseFnDecl();
    if (tok.type === "RETURN") return this.parseReturn();
    if (tok.type === "IF")     return this.parseIf();
    if (tok.type === "WHILE")  return this.parseWhile();
    if (tok.type === "LBRACE") return this.parseBlock();

    return this.parseExpressionStatement();
  }

  private parseVarDecl(): VariableDeclaration {
    const line = this.peek().line;
    this.advance(); // consume 'let'
    const nameTok = this.consume("IDENTIFIER", "Expected variable name after 'let'");
    this.consume("EQUALS", `Expected '=' after variable name '${nameTok.value}'`);
    const value = this.parseExpression();
    this.expectTerminator();
    return { type: "VariableDeclaration", name: String(nameTok.value), value, line };
  }

  private parseFnDecl(): FunctionDeclaration {
    const line = this.peek().line;
    this.advance(); // consume 'fn'
    const nameTok = this.consume("IDENTIFIER", "Expected function name after 'fn'");
    this.consume("LPAREN", "Expected '(' after function name");
    const params = this.parseParams();
    this.consume("RPAREN", "Expected ')' after parameters");
    this.skipNewlines();
    const body = this.parseBlock();
    return { type: "FunctionDeclaration", name: String(nameTok.value), params, body, line };
  }

  private parseParams(): string[] {
    const params: string[] = [];
    if (this.check("RPAREN")) return params;
    do {
      this.skipNewlines();
      const p = this.consume("IDENTIFIER", "Expected parameter name");
      params.push(String(p.value));
      this.skipNewlines();
    } while (this.match("COMMA"));
    return params;
  }

  private parseReturn(): ReturnStatement {
    const line = this.peek().line;
    this.advance(); // consume 'return'
    let value: Expression | undefined;
    if (!this.checkAny("NEWLINE", "SEMICOLON", "EOF", "RBRACE")) {
      value = this.parseExpression();
    }
    this.expectTerminator();
    return { type: "ReturnStatement", value, line };
  }

  private parseIf(): IfStatement {
    const line = this.peek().line;
    this.advance(); // consume 'if'
    this.consume("LPAREN", "Expected '(' after 'if'");
    const condition = this.parseExpression();
    this.consume("RPAREN", "Expected ')' after if condition");
    this.skipNewlines();
    const consequent = this.parseBlock();

    let alternate: BlockStatement | IfStatement | undefined;
    this.skipNewlines();
    if (this.match("ELSE")) {
      this.skipNewlines();
      if (this.check("IF")) {
        alternate = this.parseIf();
      } else {
        alternate = this.parseBlock();
      }
    }

    return { type: "IfStatement", condition, consequent, alternate, line };
  }

  private parseWhile(): WhileStatement {
    const line = this.peek().line;
    this.advance(); // consume 'while'
    this.consume("LPAREN", "Expected '(' after 'while'");
    const condition = this.parseExpression();
    this.consume("RPAREN", "Expected ')' after while condition");
    this.skipNewlines();
    const body = this.parseBlock();
    return { type: "WhileStatement", condition, body, line };
  }

  private parseBlock(): BlockStatement {
    const line = this.peek().line;
    this.consume("LBRACE", "Expected '{'");
    this.skipNewlines();
    const body: Statement[] = [];
    while (!this.check("RBRACE") && !this.isAtEnd()) {
      body.push(this.parseStatement());
      this.skipNewlines();
    }
    this.consume("RBRACE", "Expected '}' to close block");
    return { type: "BlockStatement", body, line };
  }

  private parseExpressionStatement(): ExpressionStatement {
    const line = this.peek().line;
    const expression = this.parseExpression();
    this.expectTerminator();
    return { type: "ExpressionStatement", expression, line };
  }

  // ── expressions (precedence climbing) ────────────────────
  private parseExpression(): Expression {
    return this.parseAssignment();
  }

  private parseAssignment(): Expression {
    // Look-ahead: IDENTIFIER "=" that is not "=="
    if (
      this.check("IDENTIFIER") &&
      this.peekNext().type === "EQUALS"
    ) {
      const line = this.peek().line;
      const name = String(this.advance().value);
      this.advance(); // consume "="
      const value = this.parseAssignment();
      return { type: "AssignmentExpression", name, value, line } as AssignmentExpression;
    }
    return this.parseLogical();
  }

  private parseLogical(): Expression {
    let left = this.parseComparison();
    while (this.checkAny("AND", "OR")) {
      const op = this.advance().type === "AND" ? "&&" : "||";
      const right = this.parseComparison();
      left = {
        type: "LogicalExpression",
        operator: op,
        left,
        right,
        line: left.line,
      } as LogicalExpression;
    }
    return left;
  }

  private parseComparison(): Expression {
    let left = this.parseAddition();
    const ops: Partial<Record<TokenType, BinaryExpression["operator"]>> = {
      EQ_EQ: "==", BANG_EQ: "!=", LT: "<", LT_EQ: "<=", GT: ">", GT_EQ: ">=",
    };
    while (this.checkAny(...(Object.keys(ops) as TokenType[]))) {
      const tokType = this.advance().type as TokenType;
      const op = ops[tokType]!;
      const right = this.parseAddition();
      left = { type: "BinaryExpression", operator: op, left, right, line: left.line };
    }
    return left;
  }

  private parseAddition(): Expression {
    let left = this.parseMultiply();
    while (this.checkAny("PLUS", "MINUS")) {
      const op = this.advance().type === "PLUS" ? "+" : "-";
      const right = this.parseMultiply();
      left = { type: "BinaryExpression", operator: op, left, right, line: left.line };
    }
    return left;
  }

  private parseMultiply(): Expression {
    let left = this.parseUnary();
    const opMap: Partial<Record<TokenType, BinaryExpression["operator"]>> = {
      STAR: "*", SLASH: "/", PERCENT: "%",
    };
    while (this.checkAny("STAR", "SLASH", "PERCENT")) {
      const tokType = this.advance().type as TokenType;
      const op = opMap[tokType]!;
      const right = this.parseUnary();
      left = { type: "BinaryExpression", operator: op, left, right, line: left.line };
    }
    return left;
  }

  private parseUnary(): Expression {
    const line = this.peek().line;
    if (this.match("MINUS")) {
      return { type: "UnaryExpression", operator: "-", operand: this.parseUnary(), line };
    }
    if (this.match("BANG")) {
      return { type: "UnaryExpression", operator: "!", operand: this.parseUnary(), line };
    }
    return this.parseCall();
  }

  private parseCall(): Expression {
    const line = this.peek().line;
    // function call: IDENTIFIER "(" args ")"
    if (this.check("IDENTIFIER") && this.peekNext().type === "LPAREN") {
      const callee = String(this.advance().value);
      this.advance(); // consume "("
      const args: Expression[] = [];
      if (!this.check("RPAREN")) {
        do {
          this.skipNewlines();
          args.push(this.parseExpression());
          this.skipNewlines();
        } while (this.match("COMMA"));
      }
      this.consume("RPAREN", `Expected ')' after arguments in call to '${callee}'`);
      return { type: "CallExpression", callee, args, line };
    }
    return this.parsePrimary();
  }

  private parsePrimary(): Expression {
    const tok = this.peek();
    const line = tok.line;

    if (tok.type === "NUMBER") {
      this.advance();
      return { type: "NumberLiteral", value: tok.value as number, line };
    }
    if (tok.type === "STRING") {
      this.advance();
      return { type: "StringLiteral", value: tok.value as string, line };
    }
    if (tok.type === "BOOLEAN") {
      this.advance();
      return { type: "BooleanLiteral", value: tok.value as boolean, line };
    }
    if (tok.type === "IDENTIFIER") {
      this.advance();
      return { type: "Identifier", name: tok.value as string, line };
    }
    if (tok.type === "LPAREN") {
      this.advance(); // consume "("
      const expr = this.parseExpression();
      this.consume("RPAREN", "Expected ')' after grouped expression");
      return expr;
    }

    throw new ParseError(
      `Unexpected token '${tok.type}' (value: ${tok.value ?? ""})`,
      line
    );
  }
}

// ============================================================
//  LEXER / TOKENIZER
//  Phase 1: Raw source text → stream of Tokens
// ============================================================

export type TokenType =
  // Literals
  | "NUMBER"
  | "STRING"
  | "BOOLEAN"
  // Identifiers & keywords
  | "IDENTIFIER"
  | "LET"
  | "IF"
  | "ELSE"
  | "WHILE"
  | "FN"
  | "RETURN"
  | "TRUE"
  | "FALSE"
  // Operators – arithmetic
  | "PLUS"
  | "MINUS"
  | "STAR"
  | "SLASH"
  | "PERCENT"
  // Operators – comparison
  | "EQ_EQ"   // ==
  | "BANG_EQ" // !=
  | "LT"      // <
  | "LT_EQ"   // <=
  | "GT"      // >
  | "GT_EQ"   // >=
  // Operators – logical
  | "AND"  // &&
  | "OR"   // ||
  | "BANG" // !
  // Assignment
  | "EQUALS"
  // Punctuation
  | "LPAREN"
  | "RPAREN"
  | "LBRACE"
  | "RBRACE"
  | "COMMA"
  | "SEMICOLON"
  | "NEWLINE"
  // Special
  | "EOF";

export interface Token {
  type: TokenType;
  value?: string | number | boolean;
  line: number;
  col: number;
}

// Keywords reserved by the language
const KEYWORDS: Record<string, TokenType> = {
  let: "LET",
  if: "IF",
  else: "ELSE",
  while: "WHILE",
  fn: "FN",
  return: "RETURN",
  true: "TRUE",
  false: "FALSE",
};

// ──────────────────────────────────────────────────────────
export class Lexer {
  private src: string;
  private pos = 0;
  private line = 1;
  private col = 1;
  private tokens: Token[] = [];

  constructor(source: string) {
    this.src = source;
  }

  // ── public entry point ──────────────────────────────────
  tokenize(): Token[] {
    while (!this.isAtEnd()) {
      this.skipWhitespaceAndComments();
      if (this.isAtEnd()) break;
      this.readToken();
    }
    this.tokens.push({ type: "EOF", line: this.line, col: this.col });
    return this.tokens;
  }

  // ── helpers ─────────────────────────────────────────────
  private isAtEnd() {
    return this.pos >= this.src.length;
  }

  private peek(offset = 0): string {
    return this.src[this.pos + offset] ?? "\0";
  }

  private advance(): string {
    const ch = this.src[this.pos++];
    if (ch === "\n") { this.line++; this.col = 1; }
    else { this.col++; }
    return ch;
  }

  private match(expected: string): boolean {
    if (this.peek() === expected) { this.advance(); return true; }
    return false;
  }

  private emit(type: TokenType, value?: string | number | boolean) {
    this.tokens.push({ type, value, line: this.line, col: this.col });
  }

  // ── whitespace / comments ────────────────────────────────
  private skipWhitespaceAndComments() {
    while (!this.isAtEnd()) {
      const ch = this.peek();
      if (ch === " " || ch === "\t" || ch === "\r") {
        this.advance();
      } else if (ch === "\n") {
        // Newlines are significant as statement terminators
        this.emit("NEWLINE");
        this.advance();
      } else if (ch === "#") {
        // Single-line comment: # …
        while (!this.isAtEnd() && this.peek() !== "\n") this.advance();
      } else if (ch === "/" && this.peek(1) === "/") {
        // C-style single-line comment
        while (!this.isAtEnd() && this.peek() !== "\n") this.advance();
      } else {
        break;
      }
    }
  }

  // ── main dispatch ────────────────────────────────────────
  private readToken() {
    const ch = this.advance();

    switch (ch) {
      // ── single-char tokens ──────────────────────────────
      case "(": return this.emit("LPAREN");
      case ")": return this.emit("RPAREN");
      case "{": return this.emit("LBRACE");
      case "}": return this.emit("RBRACE");
      case ",": return this.emit("COMMA");
      case ";": return this.emit("SEMICOLON");
      case "+": return this.emit("PLUS");
      case "-": return this.emit("MINUS");
      case "*": return this.emit("STAR");
      case "/": return this.emit("SLASH");
      case "%": return this.emit("PERCENT");

      // ── one-or-two-char tokens ───────────────────────────
      case "=": return this.emit(this.match("=") ? "EQ_EQ" : "EQUALS");
      case "!": return this.emit(this.match("=") ? "BANG_EQ" : "BANG");
      case "<": return this.emit(this.match("=") ? "LT_EQ" : "LT");
      case ">": return this.emit(this.match("=") ? "GT_EQ" : "GT");
      case "&":
        if (this.match("&")) return this.emit("AND");
        throw new LexerError(`Unexpected character '&'`, this.line, this.col);
      case "|":
        if (this.match("|")) return this.emit("OR");
        throw new LexerError(`Unexpected character '|'`, this.line, this.col);

      // ── string literals ──────────────────────────────────
      case '"': return this.readString('"');
      case "'": return this.readString("'");

      default:
        if (isDigit(ch)) return this.readNumber(ch);
        if (isAlpha(ch)) return this.readIdentifier(ch);
        throw new LexerError(`Unexpected character '${ch}'`, this.line, this.col);
    }
  }

  private readString(quote: string) {
    let value = "";
    while (!this.isAtEnd() && this.peek() !== quote) {
      if (this.peek() === "\\") {
        this.advance(); // consume backslash
        const esc = this.advance();
        switch (esc) {
          case "n":  value += "\n"; break;
          case "t":  value += "\t"; break;
          case "\\": value += "\\"; break;
          case '"':  value += '"';  break;
          case "'":  value += "'";  break;
          default:   value += esc;
        }
      } else {
        value += this.advance();
      }
    }
    if (this.isAtEnd()) throw new LexerError("Unterminated string literal", this.line, this.col);
    this.advance(); // closing quote
    this.emit("STRING", value);
  }

  private readNumber(first: string) {
    let raw = first;
    while (isDigit(this.peek())) raw += this.advance();
    if (this.peek() === "." && isDigit(this.peek(1))) {
      raw += this.advance(); // consume '.'
      while (isDigit(this.peek())) raw += this.advance();
    }
    this.emit("NUMBER", parseFloat(raw));
  }

  private readIdentifier(first: string) {
    let name = first;
    while (isAlphaNumeric(this.peek())) name += this.advance();
    const keyword = KEYWORDS[name];
    if (keyword) {
      // Boolean literals carry their value
      if (keyword === "TRUE")  return this.emit("BOOLEAN", true);
      if (keyword === "FALSE") return this.emit("BOOLEAN", false);
      return this.emit(keyword);
    }
    this.emit("IDENTIFIER", name);
  }
}

// ── character helpers ─────────────────────────────────────
function isDigit(ch: string)      { return ch >= "0" && ch <= "9"; }
function isAlpha(ch: string)      { return (ch >= "a" && ch <= "z") || (ch >= "A" && ch <= "Z") || ch === "_"; }
function isAlphaNumeric(ch: string) { return isAlpha(ch) || isDigit(ch); }

// ── error type ────────────────────────────────────────────
export class LexerError extends Error {
  constructor(msg: string, public line: number, public col: number) {
    super(`[Lexer] Line ${line}:${col} – ${msg}`);
    this.name = "LexerError";
  }
}

import { Token, TokenType, KEYWORDS } from "./tokens.js";

export class LexError extends Error {
  constructor(message: string, public line: number, public col: number) {
    super(`${message} (line ${line}, col ${col})`);
    this.name = "LexError";
  }
}

const SIMPLE: Record<string, TokenType> = {
  "(": TokenType.LPAREN,
  ")": TokenType.RPAREN,
  "{": TokenType.LBRACE,
  "}": TokenType.RBRACE,
  "[": TokenType.LBRACKET,
  "]": TokenType.RBRACKET,
  ",": TokenType.COMMA,
  ":": TokenType.COLON,
  ";": TokenType.SEMI,
  "+": TokenType.PLUS,
  "-": TokenType.MINUS,
  "*": TokenType.STAR,
  "%": TokenType.PERCENT,
};

export function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  let line = 1;
  let col = 1;

  const peek = (offset = 0) => source[i + offset];
  const advance = () => {
    const c = source[i++];
    if (c === "\n") {
      line++;
      col = 1;
    } else {
      col++;
    }
    return c;
  };

  while (i < source.length) {
    const c = peek();

    // Whitespace
    if (c === " " || c === "\t" || c === "\r" || c === "\n") {
      advance();
      continue;
    }

    // Comments: // line comments — arcade flavor allows `// gg` etc, nothing special needed
    if (c === "/" && peek(1) === "/") {
      while (i < source.length && peek() !== "\n") advance();
      continue;
    }

    const startLine = line;
    const startCol = col;

    // Strings
    if (c === '"' || c === "'") {
      const quote = c;
      advance();
      let value = "";
      while (i < source.length && peek() !== quote) {
        let ch = advance();
        if (ch === "\\") {
          const next = advance();
          if (next === "n") ch = "\n";
          else if (next === "t") ch = "\t";
          else ch = next;
        }
        value += ch;
      }
      if (i >= source.length) {
        throw new LexError("Unterminated string literal", startLine, startCol);
      }
      advance(); // closing quote
      tokens.push({ type: TokenType.STRING, value, line: startLine, col: startCol });
      continue;
    }

    // Numbers
    if (/[0-9]/.test(c)) {
      let value = "";
      while (i < source.length && /[0-9]/.test(peek())) value += advance();
      if (peek() === "." && /[0-9]/.test(peek(1))) {
        value += advance();
        while (i < source.length && /[0-9]/.test(peek())) value += advance();
      }
      tokens.push({ type: TokenType.NUMBER, value, line: startLine, col: startCol });
      continue;
    }

    // Identifiers / keywords
    if (/[a-zA-Z_]/.test(c)) {
      let value = "";
      while (i < source.length && /[a-zA-Z0-9_]/.test(peek())) value += advance();
      const kw = KEYWORDS[value];
      tokens.push({ type: kw ?? TokenType.IDENT, value, line: startLine, col: startCol });
      continue;
    }

    // Two-char operators
    const two = c + (peek(1) ?? "");
    const twoCharMap: Record<string, TokenType> = {
      "=>": TokenType.ARROW,
      "==": TokenType.EQ,
      "!=": TokenType.NEQ,
      "<=": TokenType.LTE,
      ">=": TokenType.GTE,
      "&&": TokenType.AND,
      "||": TokenType.OR,
    };
    if (twoCharMap[two]) {
      advance();
      advance();
      tokens.push({ type: twoCharMap[two], value: two, line: startLine, col: startCol });
      continue;
    }

    // Single-char operators
    const oneCharMap: Record<string, TokenType> = {
      "=": TokenType.ASSIGN,
      "<": TokenType.LT,
      ">": TokenType.GT,
      "!": TokenType.NOT,
      "/": TokenType.SLASH,
    };
    if (oneCharMap[c]) {
      advance();
      tokens.push({ type: oneCharMap[c], value: c, line: startLine, col: startCol });
      continue;
    }

    if (SIMPLE[c]) {
      advance();
      tokens.push({ type: SIMPLE[c], value: c, line: startLine, col: startCol });
      continue;
    }

    throw new LexError(`Unexpected character '${c}'`, line, col);
  }

  tokens.push({ type: TokenType.EOF, value: "", line, col });
  return tokens;
}

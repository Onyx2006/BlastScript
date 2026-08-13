import { Token, TokenType } from "./tokens.js";
import * as AST from "./ast.js";

export class ParseError extends Error {
  constructor(message: string, public line: number, public col: number) {
    super(`${message} (line ${line}, col ${col})`);
    this.name = "ParseError";
  }
}

const TYPE_TOKENS: Partial<Record<TokenType, AST.TypeAnnotation>> = {
  [TokenType.TYPE_NUM]: "num",
  [TokenType.TYPE_STR]: "str",
  [TokenType.TYPE_BOOL]: "bool",
  [TokenType.TYPE_ARR]: "arr",
  [TokenType.TYPE_FN]: "fn",
  [TokenType.TYPE_VOID]: "void",
  [TokenType.TYPE_ANY]: "any",
};

export class Parser {
  private pos = 0;

  constructor(private tokens: Token[]) {}

  parse(): AST.Program {
    const body: AST.Node[] = [];
    while (!this.check(TokenType.EOF)) {
      body.push(this.statement());
    }
    return { kind: "Program", body };
  }

  // ---- helpers ----
  private peek(offset = 0): Token {
    return this.tokens[Math.min(this.pos + offset, this.tokens.length - 1)];
  }
  private check(type: TokenType): boolean {
    return this.peek().type === type;
  }
  private advance(): Token {
    const t = this.tokens[this.pos];
    if (this.pos < this.tokens.length - 1) this.pos++;
    return t;
  }
  private match(...types: TokenType[]): boolean {
    if (types.includes(this.peek().type)) {
      this.advance();
      return true;
    }
    return false;
  }
  private expect(type: TokenType, message: string): Token {
    if (this.check(type)) return this.advance();
    const t = this.peek();
    throw new ParseError(`${message}, got '${t.value || t.type}'`, t.line, t.col);
  }
  private maybeSemi() {
    // Semicolons are optional statement separators in BlastScript.
    this.match(TokenType.SEMI);
  }

  // ---- statements ----
  private statement(): AST.Node {
    const t = this.peek();
    switch (t.type) {
      case TokenType.SPAWN:
      case TokenType.LOADOUT:
        return this.varDecl();
      case TokenType.WEAPON:
        return this.weaponDecl();
      case TokenType.AIM:
        return this.aimStmt();
      case TokenType.RESPAWN:
        return this.respawnStmt();
      case TokenType.WAVE:
        return this.waveStmt();
      case TokenType.SCORE:
        return this.scoreStmt();
      case TokenType.FLEE:
        this.advance();
        this.maybeSemi();
        return { kind: "FleeStmt", line: t.line };
      case TokenType.RELOAD:
        this.advance();
        this.maybeSemi();
        return { kind: "ReloadStmt", line: t.line };
      case TokenType.SHOUT:
        return this.shoutStmt();
      case TokenType.LOOT:
        return this.lootStmt();
      case TokenType.LBRACE:
        return this.block();
      default:
        return this.exprStmt();
    }
  }

  private typeAnnotation(): AST.TypeAnnotation | undefined {
    if (!this.match(TokenType.COLON)) return undefined;
    const t = this.advance();
    const mapped = TYPE_TOKENS[t.type];
    if (!mapped) throw new ParseError(`Expected a type after ':'`, t.line, t.col);
    return mapped;
  }

  private varDecl(): AST.VarDecl {
    const startTok = this.advance(); // spawn | loadout
    const constant = startTok.type === TokenType.LOADOUT;
    const name = this.expect(TokenType.IDENT, "Expected identifier").value;
    const typeAnnotation = this.typeAnnotation();
    this.expect(TokenType.ASSIGN, "Expected '=' in declaration");
    const init = this.expression();
    this.maybeSemi();
    return { kind: "VarDecl", constant, name, typeAnnotation, init, line: startTok.line };
  }

  private paramList(): AST.Param[] {
    this.expect(TokenType.LPAREN, "Expected '(' after weapon name");
    const params: AST.Param[] = [];
    if (!this.check(TokenType.RPAREN)) {
      do {
        const name = this.expect(TokenType.IDENT, "Expected parameter name").value;
        const typeAnnotation = this.typeAnnotation();
        params.push({ name, typeAnnotation });
      } while (this.match(TokenType.COMMA));
    }
    this.expect(TokenType.RPAREN, "Expected ')' after parameters");
    return params;
  }

  private weaponDecl(): AST.WeaponDecl {
    const startTok = this.advance(); // weapon
    const name = this.expect(TokenType.IDENT, "Expected weapon name").value;
    const params = this.paramList();
    let returnType: AST.TypeAnnotation | undefined;
    if (this.match(TokenType.ARROW)) {
      const t = this.advance();
      const mapped = TYPE_TOKENS[t.type];
      if (!mapped) throw new ParseError(`Expected a return type after '=>'`, t.line, t.col);
      returnType = mapped;
    }
    const body = this.block();
    return { kind: "WeaponDecl", name, params, returnType, body, line: startTok.line };
  }

  private block(): AST.Block {
    this.expect(TokenType.LBRACE, "Expected '{'");
    const body: AST.Node[] = [];
    while (!this.check(TokenType.RBRACE) && !this.check(TokenType.EOF)) {
      body.push(this.statement());
    }
    this.expect(TokenType.RBRACE, "Expected '}'");
    return { kind: "Block", body };
  }

  private aimStmt(): AST.AimStmt {
    const startTok = this.advance(); // aim
    this.expect(TokenType.LPAREN, "Expected '(' after aim");
    const test = this.expression();
    this.expect(TokenType.RPAREN, "Expected ')' after condition");
    const consequent = this.block();
    let alternate: AST.Block | AST.AimStmt | undefined;
    if (this.match(TokenType.ELSE)) {
      alternate = this.check(TokenType.AIM) ? this.aimStmt() : this.block();
    }
    return { kind: "AimStmt", test, consequent, alternate, line: startTok.line };
  }

  private respawnStmt(): AST.RespawnStmt {
    const startTok = this.advance(); // respawn
    this.expect(TokenType.LPAREN, "Expected '(' after respawn");
    const test = this.expression();
    this.expect(TokenType.RPAREN, "Expected ')' after condition");
    const body = this.block();
    return { kind: "RespawnStmt", test, body, line: startTok.line };
  }

  private waveStmt(): AST.WaveStmt {
    const startTok = this.advance(); // wave
    this.expect(TokenType.LPAREN, "Expected '(' after wave");
    const init = this.check(TokenType.SEMI) ? undefined : this.statement();
    if (!init) this.expect(TokenType.SEMI, "Expected ';' in wave header");
    const test = this.check(TokenType.SEMI) ? undefined : this.expression();
    this.expect(TokenType.SEMI, "Expected ';' in wave header");
    const update = this.check(TokenType.RPAREN) ? undefined : this.expression();
    this.expect(TokenType.RPAREN, "Expected ')' after wave header");
    const body = this.block();
    return { kind: "WaveStmt", init, test, update, body, line: startTok.line };
  }

  private scoreStmt(): AST.ScoreStmt {
    const startTok = this.advance(); // score
    let argument: AST.Node | undefined;
    if (!this.check(TokenType.SEMI) && !this.check(TokenType.RBRACE)) {
      argument = this.expression();
    }
    this.maybeSemi();
    return { kind: "ScoreStmt", argument, line: startTok.line };
  }

  private shoutStmt(): AST.ShoutStmt {
    const startTok = this.advance(); // shout
    this.expect(TokenType.LPAREN, "Expected '(' after shout");
    const args: AST.Node[] = [];
    if (!this.check(TokenType.RPAREN)) {
      do {
        args.push(this.expression());
      } while (this.match(TokenType.COMMA));
    }
    this.expect(TokenType.RPAREN, "Expected ')' after shout arguments");
    this.maybeSemi();
    return { kind: "ShoutStmt", args, line: startTok.line };
  }

  private lootStmt(): AST.LootStmt {
    const startTok = this.advance(); // loot
    const bindings: string[] = [];
    if (this.match(TokenType.LBRACE)) {
      if (!this.check(TokenType.RBRACE)) {
        do {
          bindings.push(this.expect(TokenType.IDENT, "Expected binding name").value);
        } while (this.match(TokenType.COMMA));
      }
      this.expect(TokenType.RBRACE, "Expected '}' after loot bindings");
      // `from "module"` — reuse IDENT check loosely via string
    }
    const source = this.expect(TokenType.STRING, "Expected module string after loot").value;
    this.maybeSemi();
    return { kind: "LootStmt", source, bindings, line: startTok.line };
  }

  private exprStmt(): AST.ExprStmt {
    const line = this.peek().line;
    const expression = this.expression();
    this.maybeSemi();
    return { kind: "ExprStmt", expression, line };
  }

  // ---- expressions (precedence climbing) ----
  private expression(): AST.Node {
    return this.assignment();
  }

  private assignment(): AST.Node {
    const expr = this.logicalOr();
    if (this.match(TokenType.ASSIGN)) {
      const eqTok = this.tokens[this.pos - 1];
      const value = this.assignment();
      if (expr.kind === "Identifier") {
        return { kind: "AssignExpr", name: expr.name, value, line: eqTok.line };
      }
      throw new ParseError("Invalid assignment target", eqTok.line, eqTok.col);
    }
    return expr;
  }

  private logicalOr(): AST.Node {
    let expr = this.logicalAnd();
    while (this.check(TokenType.OR)) {
      const opTok = this.advance();
      const right = this.logicalAnd();
      expr = { kind: "LogicalExpr", operator: "||", left: expr, right, line: opTok.line };
    }
    return expr;
  }

  private logicalAnd(): AST.Node {
    let expr = this.equality();
    while (this.check(TokenType.AND)) {
      const opTok = this.advance();
      const right = this.equality();
      expr = { kind: "LogicalExpr", operator: "&&", left: expr, right, line: opTok.line };
    }
    return expr;
  }

  private equality(): AST.Node {
    let expr = this.comparison();
    while (this.check(TokenType.EQ) || this.check(TokenType.NEQ)) {
      const opTok = this.advance();
      const right = this.comparison();
      expr = { kind: "BinaryExpr", operator: opTok.value, left: expr, right, line: opTok.line };
    }
    return expr;
  }

  private comparison(): AST.Node {
    let expr = this.additive();
    while (
      this.check(TokenType.LT) ||
      this.check(TokenType.LTE) ||
      this.check(TokenType.GT) ||
      this.check(TokenType.GTE)
    ) {
      const opTok = this.advance();
      const right = this.additive();
      expr = { kind: "BinaryExpr", operator: opTok.value, left: expr, right, line: opTok.line };
    }
    return expr;
  }

  private additive(): AST.Node {
    let expr = this.multiplicative();
    while (this.check(TokenType.PLUS) || this.check(TokenType.MINUS)) {
      const opTok = this.advance();
      const right = this.multiplicative();
      expr = { kind: "BinaryExpr", operator: opTok.value, left: expr, right, line: opTok.line };
    }
    return expr;
  }

  private multiplicative(): AST.Node {
    let expr = this.unary();
    while (this.check(TokenType.STAR) || this.check(TokenType.SLASH) || this.check(TokenType.PERCENT)) {
      const opTok = this.advance();
      const right = this.unary();
      expr = { kind: "BinaryExpr", operator: opTok.value, left: expr, right, line: opTok.line };
    }
    return expr;
  }

  private unary(): AST.Node {
    if (this.check(TokenType.NOT) || this.check(TokenType.MINUS)) {
      const opTok = this.advance();
      const argument = this.unary();
      return { kind: "UnaryExpr", operator: opTok.value, argument, line: opTok.line };
    }
    return this.callOrIndex();
  }

  private callOrIndex(): AST.Node {
    let expr = this.primary();
    while (true) {
      if (this.check(TokenType.LPAREN)) {
        const opTok = this.advance();
        const args: AST.Node[] = [];
        if (!this.check(TokenType.RPAREN)) {
          do {
            args.push(this.expression());
          } while (this.match(TokenType.COMMA));
        }
        this.expect(TokenType.RPAREN, "Expected ')' after arguments");
        expr = { kind: "CallExpr", callee: expr, args, line: opTok.line };
      } else if (this.check(TokenType.LBRACKET)) {
        const opTok = this.advance();
        const index = this.expression();
        this.expect(TokenType.RBRACKET, "Expected ']' after index");
        expr = { kind: "IndexExpr", object: expr, index, line: opTok.line };
      } else {
        break;
      }
    }
    return expr;
  }

  private primary(): AST.Node {
    const t = this.peek();
    if (this.match(TokenType.HIT)) {
      // `hit` as a prefix is sugar: `hit foo(...)` === `foo(...)`.
      return this.callOrIndex();
    }
    if (this.match(TokenType.NUMBER)) {
      return { kind: "NumberLit", value: parseFloat(t.value) };
    }
    if (this.match(TokenType.STRING)) {
      return { kind: "StringLit", value: t.value };
    }
    if (this.match(TokenType.ALIVE)) {
      return { kind: "BoolLit", value: true };
    }
    if (this.match(TokenType.DEAD)) {
      return { kind: "BoolLit", value: false };
    }
    if (this.match(TokenType.VOID)) {
      return { kind: "VoidLit" };
    }
    if (this.match(TokenType.IDENT)) {
      return { kind: "Identifier", name: t.value, line: t.line };
    }
    if (this.match(TokenType.LBRACKET)) {
      const elements: AST.Node[] = [];
      if (!this.check(TokenType.RBRACKET)) {
        do {
          elements.push(this.expression());
        } while (this.match(TokenType.COMMA));
      }
      this.expect(TokenType.RBRACKET, "Expected ']' after array literal");
      return { kind: "ArrayLit", elements };
    }
    if (this.match(TokenType.LPAREN)) {
      const expr = this.expression();
      this.expect(TokenType.RPAREN, "Expected ')' after expression");
      return expr;
    }
    throw new ParseError(`Unexpected token '${t.value || t.type}'`, t.line, t.col);
  }
}

export function parse(tokens: Token[]): AST.Program {
  return new Parser(tokens).parse();
}

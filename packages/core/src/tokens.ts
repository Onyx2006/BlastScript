// Token kinds for BlastScript.
// Keywords are all arcade/shooter vocabulary — see README.md for the full glossary.
export enum TokenType {
  // Literals
  NUMBER = "NUMBER",
  STRING = "STRING",
  IDENT = "IDENT",

  // Keywords — declarations
  SPAWN = "SPAWN", // mutable variable declaration
  LOADOUT = "LOADOUT", // constant declaration
  WEAPON = "WEAPON", // function declaration

  // Keywords — control flow
  AIM = "AIM", // if
  ELSE = "ELSE", // else
  RESPAWN = "RESPAWN", // while
  WAVE = "WAVE", // for
  FLEE = "FLEE", // break
  RELOAD = "RELOAD", // continue
  SCORE = "SCORE", // return

  // Keywords — calls / io / modules
  HIT = "HIT", // explicit statement-level call marker (optional sugar)
  SHOUT = "SHOUT", // print
  LOOT = "LOOT", // import

  // Keywords — literals
  ALIVE = "ALIVE", // true
  DEAD = "DEAD", // false
  VOID = "VOID", // null/undefined

  // Types (used after `:`)
  TYPE_NUM = "TYPE_NUM",
  TYPE_STR = "TYPE_STR",
  TYPE_BOOL = "TYPE_BOOL",
  TYPE_ARR = "TYPE_ARR",
  TYPE_FN = "TYPE_FN",
  TYPE_VOID = "TYPE_VOID",
  TYPE_ANY = "TYPE_ANY",

  // Punctuation
  LPAREN = "LPAREN",
  RPAREN = "RPAREN",
  LBRACE = "LBRACE",
  RBRACE = "RBRACE",
  LBRACKET = "LBRACKET",
  RBRACKET = "RBRACKET",
  COMMA = "COMMA",
  COLON = "COLON",
  SEMI = "SEMI",
  ARROW = "ARROW", // =>

  // Operators
  PLUS = "PLUS",
  MINUS = "MINUS",
  STAR = "STAR",
  SLASH = "SLASH",
  PERCENT = "PERCENT",
  ASSIGN = "ASSIGN",
  EQ = "EQ",
  NEQ = "NEQ",
  LT = "LT",
  LTE = "LTE",
  GT = "GT",
  GTE = "GTE",
  AND = "AND",
  OR = "OR",
  NOT = "NOT",

  EOF = "EOF",
}

export interface Token {
  type: TokenType;
  value: string;
  line: number;
  col: number;
}

export const KEYWORDS: Record<string, TokenType> = {
  spawn: TokenType.SPAWN,
  loadout: TokenType.LOADOUT,
  weapon: TokenType.WEAPON,
  aim: TokenType.AIM,
  else: TokenType.ELSE,
  respawn: TokenType.RESPAWN,
  wave: TokenType.WAVE,
  flee: TokenType.FLEE,
  reload: TokenType.RELOAD,
  score: TokenType.SCORE,
  hit: TokenType.HIT,
  shout: TokenType.SHOUT,
  loot: TokenType.LOOT,
  alive: TokenType.ALIVE,
  dead: TokenType.DEAD,
  void: TokenType.VOID,
  num: TokenType.TYPE_NUM,
  str: TokenType.TYPE_STR,
  bool: TokenType.TYPE_BOOL,
  arr: TokenType.TYPE_ARR,
  fn: TokenType.TYPE_FN,
  any: TokenType.TYPE_ANY,
};

// AST node definitions for BlastScript.

export type TypeAnnotation =
  | "num"
  | "str"
  | "bool"
  | "arr"
  | "fn"
  | "void"
  | "any";

export interface Param {
  name: string;
  typeAnnotation?: TypeAnnotation;
}

export type Node =
  | Program
  | VarDecl
  | WeaponDecl
  | AimStmt
  | RespawnStmt
  | WaveStmt
  | ScoreStmt
  | FleeStmt
  | ReloadStmt
  | ShoutStmt
  | LootStmt
  | ExprStmt
  | Block
  | Identifier
  | NumberLit
  | StringLit
  | BoolLit
  | VoidLit
  | ArrayLit
  | AssignExpr
  | BinaryExpr
  | UnaryExpr
  | LogicalExpr
  | CallExpr
  | IndexExpr;

export interface Program {
  kind: "Program";
  body: Node[];
}

export interface VarDecl {
  kind: "VarDecl";
  constant: boolean; // true for `loadout`, false for `spawn`
  name: string;
  typeAnnotation?: TypeAnnotation;
  init: Node;
  line: number;
}

export interface WeaponDecl {
  kind: "WeaponDecl";
  name: string;
  params: Param[];
  returnType?: TypeAnnotation;
  body: Block;
  line: number;
}

export interface AimStmt {
  kind: "AimStmt";
  test: Node;
  consequent: Block;
  alternate?: Block | AimStmt;
  line: number;
}

export interface RespawnStmt {
  kind: "RespawnStmt";
  test: Node;
  body: Block;
  line: number;
}

export interface WaveStmt {
  kind: "WaveStmt";
  init?: Node;
  test?: Node;
  update?: Node;
  body: Block;
  line: number;
}

export interface ScoreStmt {
  kind: "ScoreStmt";
  argument?: Node;
  line: number;
}

export interface FleeStmt {
  kind: "FleeStmt";
  line: number;
}

export interface ReloadStmt {
  kind: "ReloadStmt";
  line: number;
}

export interface ShoutStmt {
  kind: "ShoutStmt";
  args: Node[];
  line: number;
}

export interface LootStmt {
  kind: "LootStmt";
  source: string;
  bindings: string[]; // named imports; empty = whole-module loot
  line: number;
}

export interface ExprStmt {
  kind: "ExprStmt";
  expression: Node;
  line: number;
}

export interface Block {
  kind: "Block";
  body: Node[];
}

export interface Identifier {
  kind: "Identifier";
  name: string;
  line: number;
}

export interface NumberLit {
  kind: "NumberLit";
  value: number;
}

export interface StringLit {
  kind: "StringLit";
  value: string;
}

export interface BoolLit {
  kind: "BoolLit";
  value: boolean;
}

export interface VoidLit {
  kind: "VoidLit";
}

export interface ArrayLit {
  kind: "ArrayLit";
  elements: Node[];
}

export interface AssignExpr {
  kind: "AssignExpr";
  name: string;
  value: Node;
  line: number;
}

export interface BinaryExpr {
  kind: "BinaryExpr";
  operator: string;
  left: Node;
  right: Node;
  line: number;
}

export interface UnaryExpr {
  kind: "UnaryExpr";
  operator: string;
  argument: Node;
  line: number;
}

export interface LogicalExpr {
  kind: "LogicalExpr";
  operator: "&&" | "||";
  left: Node;
  right: Node;
  line: number;
}

export interface CallExpr {
  kind: "CallExpr";
  callee: Node;
  args: Node[];
  line: number;
}

export interface IndexExpr {
  kind: "IndexExpr";
  object: Node;
  index: Node;
  line: number;
}

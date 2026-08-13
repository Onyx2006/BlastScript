import * as AST from "./ast.js";

// BlastScript uses gradual typing: annotations are optional. When present,
// they're checked; when absent, the checker infers what it can and otherwise
// treats the value as `any` and stays out of the way.

export class TypeError_ extends Error {
  constructor(message: string, public line?: number) {
    super(line ? `${message} (line ${line})` : message);
    this.name = "TypeError";
  }
}

type BType = AST.TypeAnnotation;

interface FnSig {
  kind: "fn";
  params: BType[];
  ret: BType;
}

type Scheme = BType | FnSig;

class Scope {
  vars = new Map<string, Scheme>();
  constructor(public parent?: Scope) {}
  get(name: string): Scheme | undefined {
    return this.vars.get(name) ?? this.parent?.get(name);
  }
  set(name: string, t: Scheme) {
    this.vars.set(name, t);
  }
}

function schemeToLabel(s: Scheme): string {
  if (typeof s === "string") return s;
  return `fn(${s.params.join(", ")}) => ${s.ret}`;
}

function literalType(n: AST.Node): BType | undefined {
  switch (n.kind) {
    case "NumberLit":
      return "num";
    case "StringLit":
      return "str";
    case "BoolLit":
      return "bool";
    case "ArrayLit":
      return "arr";
    case "VoidLit":
      return "void";
    default:
      return undefined;
  }
}

export class TypeChecker {
  private errors: TypeError_[] = [];

  check(program: AST.Program): TypeError_[] {
    const global = new Scope();
    this.hoistWeapons(program.body, global);
    for (const stmt of program.body) this.checkStmt(stmt, global);
    return this.errors;
  }

  private hoistWeapons(body: AST.Node[], scope: Scope) {
    for (const stmt of body) {
      if (stmt.kind === "WeaponDecl") {
        scope.set(stmt.name, {
          kind: "fn",
          params: stmt.params.map((p) => p.typeAnnotation ?? "any"),
          ret: stmt.returnType ?? "any",
        });
      }
    }
  }

  private inferExpr(node: AST.Node, scope: Scope): BType {
    const lit = literalType(node);
    if (lit) return lit;

    switch (node.kind) {
      case "Identifier": {
        const t = scope.get(node.name);
        if (t === undefined) return "any"; // unknown binding — don't block execution
        return typeof t === "string" ? t : "fn";
      }
      case "AssignExpr": {
        const declared = scope.get(node.name);
        const valueType = this.inferExpr(node.value, scope);
        if (declared && typeof declared === "string" && declared !== "any" && valueType !== "any" && declared !== valueType) {
          this.errors.push(
            new TypeError_(
              `Cannot assign '${valueType}' to '${node.name}' of type '${declared}'`,
              node.line
            )
          );
        }
        return valueType;
      }
      case "BinaryExpr": {
        const l = this.inferExpr(node.left, scope);
        const r = this.inferExpr(node.right, scope);
        if (["==", "!=", "<", "<=", ">", ">="].includes(node.operator)) return "bool";
        if (node.operator === "+" && (l === "str" || r === "str")) return "str";
        if (l !== "any" && r !== "any" && l !== r) {
          this.errors.push(
            new TypeError_(
              `Operator '${node.operator}' type mismatch: '${l}' vs '${r}'`,
              node.line
            )
          );
        }
        return l === "any" ? r : l;
      }
      case "LogicalExpr":
        this.inferExpr(node.left, scope);
        this.inferExpr(node.right, scope);
        return "bool";
      case "UnaryExpr": {
        const t = this.inferExpr(node.argument, scope);
        if (node.operator === "!") return "bool";
        return t;
      }
      case "CallExpr": {
        if (node.callee.kind === "Identifier") {
          const sig = scope.get(node.callee.name);
          if (sig && typeof sig !== "string") {
            if (sig.params.length !== node.args.length) {
              this.errors.push(
                new TypeError_(
                  `'${node.callee.name}' expects ${sig.params.length} argument(s), got ${node.args.length}`,
                  node.line
                )
              );
            } else {
              node.args.forEach((arg, idx) => {
                const argT = this.inferExpr(arg, scope);
                const paramT = sig.params[idx];
                if (paramT !== "any" && argT !== "any" && argT !== paramT) {
                  this.errors.push(
                    new TypeError_(
                      `Argument ${idx + 1} to '${node.callee.kind === "Identifier" ? node.callee.name : "?"}' should be '${paramT}', got '${argT}'`,
                      node.line
                    )
                  );
                }
              });
            }
            return sig.ret;
          }
        } else {
          this.inferExpr(node.callee, scope);
          node.args.forEach((a) => this.inferExpr(a, scope));
        }
        return "any";
      }
      case "IndexExpr":
        this.inferExpr(node.object, scope);
        this.inferExpr(node.index, scope);
        return "any";
      default:
        return "any";
    }
  }

  private checkStmt(node: AST.Node, scope: Scope) {
    switch (node.kind) {
      case "VarDecl": {
        const inferred = this.inferExpr(node.init, scope);
        if (node.typeAnnotation && node.typeAnnotation !== "any" && inferred !== "any" && inferred !== node.typeAnnotation) {
          this.errors.push(
            new TypeError_(
              `'${node.name}' is declared as '${node.typeAnnotation}' but initialized with '${inferred}'`,
              node.line
            )
          );
        }
        scope.set(node.name, node.typeAnnotation ?? inferred);
        break;
      }
      case "WeaponDecl": {
        const inner = new Scope(scope);
        for (const p of node.params) inner.set(p.name, p.typeAnnotation ?? "any");
        inner.set(node.name, {
          kind: "fn",
          params: node.params.map((p) => p.typeAnnotation ?? "any"),
          ret: node.returnType ?? "any",
        }); // allow recursion
        this.hoistWeapons(node.body.body, inner);
        for (const s of node.body.body) this.checkStmt(s, inner);
        break;
      }
      case "AimStmt": {
        this.inferExpr(node.test, scope);
        this.checkStmt(node.consequent, new Scope(scope));
        if (node.alternate) this.checkStmt(node.alternate, new Scope(scope));
        break;
      }
      case "RespawnStmt": {
        this.inferExpr(node.test, scope);
        this.checkStmt(node.body, new Scope(scope));
        break;
      }
      case "WaveStmt": {
        const inner = new Scope(scope);
        if (node.init) this.checkStmt(node.init, inner);
        if (node.test) this.inferExpr(node.test, inner);
        if (node.update) this.inferExpr(node.update, inner);
        this.checkStmt(node.body, inner);
        break;
      }
      case "Block": {
        const inner = new Scope(scope);
        for (const s of node.body) this.checkStmt(s, inner);
        break;
      }
      case "ScoreStmt":
        if (node.argument) this.inferExpr(node.argument, scope);
        break;
      case "ShoutStmt":
        for (const a of node.args) this.inferExpr(a, scope);
        break;
      case "ExprStmt":
        this.inferExpr(node.expression, scope);
        break;
      default:
        break;
    }
  }
}

export function typecheck(program: AST.Program): TypeError_[] {
  return new TypeChecker().check(program);
}

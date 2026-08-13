import * as AST from "./ast.js";

// Compiles a BlastScript AST directly to readable JavaScript source.
// This is a straightforward structural translation, not an optimizing
// compiler — the goal is output a human can read and paste anywhere.

export class Compiler {
  private indentLevel = 0;

  compile(program: AST.Program): string {
    const runtime = [
      "function __blast_shout(...args) { console.log(...args); }",
    ].join("\n");
    const body = program.body.map((s) => this.stmt(s)).join("\n");
    return `${runtime}\n\n${body}\n`;
  }

  private indent(): string {
    return "  ".repeat(this.indentLevel);
  }

  private withIndent(fn: () => string): string {
    this.indentLevel++;
    const out = fn();
    this.indentLevel--;
    return out;
  }

  private stmt(node: AST.Node): string {
    const pad = this.indent();
    switch (node.kind) {
      case "VarDecl":
        return `${pad}${node.constant ? "const" : "let"} ${node.name} = ${this.expr(node.init)};`;
      case "WeaponDecl": {
        const params = node.params.map((p) => p.name).join(", ");
        const body = this.withIndent(() => node.body.body.map((s) => this.stmt(s)).join("\n"));
        return `${pad}function ${node.name}(${params}) {\n${body}\n${pad}}`;
      }
      case "AimStmt": {
        const cons = this.withIndent(() => node.consequent.body.map((s) => this.stmt(s)).join("\n"));
        let out = `${pad}if (${this.expr(node.test)}) {\n${cons}\n${pad}}`;
        if (node.alternate) {
          if (node.alternate.kind === "AimStmt") {
            out += ` else ${this.stmt(node.alternate).trimStart()}`;
          } else {
            const alt = this.withIndent(() => (node.alternate as AST.Block).body.map((s) => this.stmt(s)).join("\n"));
            out += ` else {\n${alt}\n${pad}}`;
          }
        }
        return out;
      }
      case "RespawnStmt": {
        const body = this.withIndent(() => node.body.body.map((s) => this.stmt(s)).join("\n"));
        return `${pad}while (${this.expr(node.test)}) {\n${body}\n${pad}}`;
      }
      case "WaveStmt": {
        const init = node.init ? this.stmt(node.init).trim().replace(/;$/, "") : "";
        const test = node.test ? this.expr(node.test) : "";
        const update = node.update ? this.expr(node.update) : "";
        const body = this.withIndent(() => node.body.body.map((s) => this.stmt(s)).join("\n"));
        return `${pad}for (${init}; ${test}; ${update}) {\n${body}\n${pad}}`;
      }
      case "ScoreStmt":
        return `${pad}return${node.argument ? " " + this.expr(node.argument) : ""};`;
      case "FleeStmt":
        return `${pad}break;`;
      case "ReloadStmt":
        return `${pad}continue;`;
      case "ShoutStmt":
        return `${pad}__blast_shout(${node.args.map((a) => this.expr(a)).join(", ")});`;
      case "LootStmt": {
        const bindings = node.bindings.length ? `{ ${node.bindings.join(", ")} }` : "__blast_mod";
        return `${pad}import ${bindings} from ${JSON.stringify(node.source)};`;
      }
      case "Block": {
        const inner = this.withIndent(() => node.body.map((s) => this.stmt(s)).join("\n"));
        return `${pad}{\n${inner}\n${pad}}`;
      }
      case "ExprStmt":
        return `${pad}${this.expr(node.expression)};`;
      default:
        return `${pad}${this.expr(node)};`;
    }
  }

  private expr(node: AST.Node): string {
    switch (node.kind) {
      case "NumberLit":
        return String(node.value);
      case "StringLit":
        return JSON.stringify(node.value);
      case "BoolLit":
        return String(node.value);
      case "VoidLit":
        return "null";
      case "ArrayLit":
        return `[${node.elements.map((e) => this.expr(e)).join(", ")}]`;
      case "Identifier":
        return node.name;
      case "AssignExpr":
        return `(${node.name} = ${this.expr(node.value)})`;
      case "LogicalExpr":
        return `(${this.expr(node.left)} ${node.operator} ${this.expr(node.right)})`;
      case "UnaryExpr":
        return `(${node.operator}${this.expr(node.argument)})`;
      case "BinaryExpr":
        return `(${this.expr(node.left)} ${node.operator} ${this.expr(node.right)})`;
      case "IndexExpr":
        return `${this.expr(node.object)}[${this.expr(node.index)}]`;
      case "CallExpr":
        return `${this.expr(node.callee)}(${node.args.map((a) => this.expr(a)).join(", ")})`;
      default:
        throw new Error(`Cannot compile node of kind '${(node as AST.Node).kind}'`);
    }
  }
}

export function compileToJS(program: AST.Program): string {
  return new Compiler().compile(program);
}

import * as AST from "./ast.js";

export class RuntimeError extends Error {
  constructor(message: string, public line?: number) {
    super(line ? `${message} (line ${line})` : message);
    this.name = "RuntimeError";
  }
}

export type BValue =
  | number
  | string
  | boolean
  | null
  | BValue[]
  | BFunction
  | ((...args: BValue[]) => BValue);

export interface BFunction {
  __blast_fn: true;
  name: string;
  params: AST.Param[];
  body: AST.Block;
  closure: Environment;
}

function isFunction(v: BValue): v is BFunction {
  return typeof v === "object" && v !== null && !Array.isArray(v) && (v as any).__blast_fn === true;
}

// Sentinel classes used to unwind the JS call stack for control flow.
class ScoreSignal {
  constructor(public value: BValue) {}
}
class FleeSignal {}
class ReloadSignal {}

export class Environment {
  private vars = new Map<string, { value: BValue; constant: boolean }>();
  constructor(public parent?: Environment) {}

  declare(name: string, value: BValue, constant: boolean) {
    this.vars.set(name, { value, constant });
  }

  assign(name: string, value: BValue, line?: number) {
    let env: Environment | undefined = this;
    while (env) {
      if (env.vars.has(name)) {
        const slot = env.vars.get(name)!;
        if (slot.constant) throw new RuntimeError(`Cannot reassign loadout '${name}'`, line);
        slot.value = value;
        return;
      }
      env = env.parent;
    }
    throw new RuntimeError(`Undefined variable '${name}'`, line);
  }

  get(name: string, line?: number): BValue {
    let env: Environment | undefined = this;
    while (env) {
      if (env.vars.has(name)) return env.vars.get(name)!.value;
      env = env.parent;
    }
    throw new RuntimeError(`Undefined variable '${name}'`, line);
  }
}

export interface InterpreterOptions {
  onShout?: (values: BValue[]) => void;
  /** Called before executing each statement — used by the playground for the live "combat log". */
  onStep?: (node: AST.Node) => void;
  maxSteps?: number; // guard against infinite loops in the browser
}

function stringify(v: BValue): string {
  if (v === null) return "void";
  if (Array.isArray(v)) return `[${v.map(stringify).join(", ")}]`;
  if (isFunction(v)) return `<weapon ${v.name}>`;
  if (typeof v === "function") return `<native fn>`;
  return String(v);
}

export class Interpreter {
  private steps = 0;
  private readonly maxSteps: number;

  constructor(private options: InterpreterOptions = {}) {
    this.maxSteps = options.maxSteps ?? 500_000;
  }

  run(program: AST.Program): BValue {
    const global = new Environment();
    this.installGlobals(global);
    let last: BValue = null;
    for (const stmt of program.body) {
      last = this.execStmt(stmt, global);
    }
    return last;
  }

  private installGlobals(env: Environment) {
    env.declare("len", ((...args: BValue[]) => {
      const v = args[0];
      if (typeof v === "string" || Array.isArray(v)) return v.length;
      throw new RuntimeError("len() expects a string or array");
    }) as unknown as BValue, true);
    env.declare("range", ((...args: BValue[]) => {
      const n = args[0] as number;
      return Array.from({ length: n }, (_, i) => i) as unknown as BValue;
    }) as unknown as BValue, true);
    env.declare("push", ((...args: BValue[]) => {
      const [arr, val] = args;
      if (!Array.isArray(arr)) throw new RuntimeError("push() expects an array");
      arr.push(val);
      return arr;
    }) as unknown as BValue, true);
  }

  private tick(node: AST.Node) {
    this.steps++;
    if (this.steps > this.maxSteps) {
      throw new RuntimeError("Execution aborted: too many steps (possible infinite respawn/wave loop)");
    }
    this.options.onStep?.(node);
  }

  private execBlock(block: AST.Block, env: Environment): BValue {
    let last: BValue = null;
    for (const stmt of block.body) {
      last = this.execStmt(stmt, env);
    }
    return last;
  }

  private execStmt(node: AST.Node, env: Environment): BValue {
    this.tick(node);
    switch (node.kind) {
      case "VarDecl": {
        const value = this.evalExpr(node.init, env);
        env.declare(node.name, value, node.constant);
        return null;
      }
      case "WeaponDecl": {
        const fn: BFunction = {
          __blast_fn: true,
          name: node.name,
          params: node.params,
          body: node.body,
          closure: env,
        };
        env.declare(node.name, fn as unknown as BValue, true);
        return null;
      }
      case "AimStmt": {
        if (this.truthy(this.evalExpr(node.test, env))) {
          return this.execBlock(node.consequent, new Environment(env));
        } else if (node.alternate) {
          if (node.alternate.kind === "AimStmt") return this.execStmt(node.alternate, env);
          return this.execBlock(node.alternate, new Environment(env));
        }
        return null;
      }
      case "RespawnStmt": {
        while (this.truthy(this.evalExpr(node.test, env))) {
          try {
            this.execBlock(node.body, new Environment(env));
          } catch (e) {
            if (e instanceof FleeSignal) break;
            if (e instanceof ReloadSignal) continue;
            throw e;
          }
        }
        return null;
      }
      case "WaveStmt": {
        const loopEnv = new Environment(env);
        if (node.init) this.execStmt(node.init, loopEnv);
        while (node.test === undefined || this.truthy(this.evalExpr(node.test, loopEnv))) {
          try {
            this.execBlock(node.body, new Environment(loopEnv));
          } catch (e) {
            if (e instanceof FleeSignal) break;
            if (e instanceof ReloadSignal) {
              if (node.update) this.evalExpr(node.update, loopEnv);
              continue;
            }
            throw e;
          }
          if (node.update) this.evalExpr(node.update, loopEnv);
        }
        return null;
      }
      case "ScoreStmt":
        throw new ScoreSignal(node.argument ? this.evalExpr(node.argument, env) : null);
      case "FleeStmt":
        throw new FleeSignal();
      case "ReloadStmt":
        throw new ReloadSignal();
      case "ShoutStmt": {
        const values = node.args.map((a) => this.evalExpr(a, env));
        this.options.onShout?.(values);
        return null;
      }
      case "LootStmt":
        // The playground/host environment is responsible for resolving modules;
        // the core interpreter treats `loot` as a no-op hook point.
        return null;
      case "Block":
        return this.execBlock(node, new Environment(env));
      case "ExprStmt":
        return this.evalExpr(node.expression, env);
      default:
        return this.evalExpr(node, env);
    }
  }

  private truthy(v: BValue): boolean {
    if (v === null) return false;
    if (typeof v === "number") return v !== 0;
    if (typeof v === "string") return v.length > 0;
    if (Array.isArray(v)) return v.length > 0;
    return Boolean(v);
  }

  private evalExpr(node: AST.Node, env: Environment): BValue {
    switch (node.kind) {
      case "NumberLit":
        return node.value;
      case "StringLit":
        return node.value;
      case "BoolLit":
        return node.value;
      case "VoidLit":
        return null;
      case "ArrayLit":
        return node.elements.map((e) => this.evalExpr(e, env));
      case "Identifier":
        return env.get(node.name, node.line);
      case "AssignExpr": {
        const value = this.evalExpr(node.value, env);
        env.assign(node.name, value, node.line);
        return value;
      }
      case "LogicalExpr": {
        const l = this.evalExpr(node.left, env);
        if (node.operator === "&&") return this.truthy(l) ? this.evalExpr(node.right, env) : l;
        return this.truthy(l) ? l : this.evalExpr(node.right, env);
      }
      case "UnaryExpr": {
        const v = this.evalExpr(node.argument, env);
        if (node.operator === "-") return -(v as number);
        if (node.operator === "!") return !this.truthy(v);
        throw new RuntimeError(`Unknown unary operator '${node.operator}'`, node.line);
      }
      case "BinaryExpr":
        return this.evalBinary(node, env);
      case "IndexExpr": {
        const obj = this.evalExpr(node.object, env);
        const idx = this.evalExpr(node.index, env);
        if (Array.isArray(obj) && typeof idx === "number") return obj[idx] ?? null;
        if (typeof obj === "string" && typeof idx === "number") return obj[idx] ?? null;
        throw new RuntimeError("Invalid index access", node.line);
      }
      case "CallExpr":
        return this.evalCall(node, env);
      default:
        throw new RuntimeError(`Cannot evaluate node of kind '${(node as AST.Node).kind}'`);
    }
  }

  private evalBinary(node: AST.BinaryExpr, env: Environment): BValue {
    const l = this.evalExpr(node.left, env);
    const r = this.evalExpr(node.right, env);
    switch (node.operator) {
      case "+":
        if (typeof l === "string" || typeof r === "string") return stringify(l) + stringify(r);
        return (l as number) + (r as number);
      case "-":
        return (l as number) - (r as number);
      case "*":
        return (l as number) * (r as number);
      case "/":
        return (l as number) / (r as number);
      case "%":
        return (l as number) % (r as number);
      case "==":
        return l === r;
      case "!=":
        return l !== r;
      case "<":
        return (l as number) < (r as number);
      case "<=":
        return (l as number) <= (r as number);
      case ">":
        return (l as number) > (r as number);
      case ">=":
        return (l as number) >= (r as number);
      default:
        throw new RuntimeError(`Unknown operator '${node.operator}'`, node.line);
    }
  }

  private evalCall(node: AST.CallExpr, env: Environment): BValue {
    const callee = this.evalExpr(node.callee, env);
    const args = node.args.map((a) => this.evalExpr(a, env));

    if (typeof callee === "function") {
      return (callee as (...a: BValue[]) => BValue)(...args);
    }

    if (isFunction(callee)) {
      const callEnv = new Environment(callee.closure);
      callee.params.forEach((p, idx) => callEnv.declare(p.name, args[idx] ?? null, false));
      try {
        this.execBlock(callee.body, callEnv);
      } catch (e) {
        if (e instanceof ScoreSignal) return e.value;
        throw e;
      }
      return null;
    }

    throw new RuntimeError("Attempted to call a non-weapon value", node.line);
  }
}

export function interpret(program: AST.Program, options?: InterpreterOptions): BValue {
  return new Interpreter(options).run(program);
}

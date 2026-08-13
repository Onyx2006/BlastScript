export { tokenize, LexError } from "./lexer.js";
export { parse, Parser, ParseError } from "./parser.js";
export { typecheck, TypeChecker, TypeError_ } from "./typechecker.js";
export {
  interpret,
  Interpreter,
  Environment,
  RuntimeError,
  type BValue,
  type BFunction,
  type InterpreterOptions,
} from "./interpreter.js";
export { compileToJS, Compiler } from "./compiler.js";
export * as AST from "./ast.js";
export { TokenType, KEYWORDS, type Token } from "./tokens.js";

import { tokenize } from "./lexer.js";
import { parse } from "./parser.js";
import { typecheck, TypeError_ } from "./typechecker.js";
import { interpret, InterpreterOptions, BValue } from "./interpreter.js";

export interface RunResult {
  value: BValue;
  typeErrors: TypeError_[];
}

/** Convenience: lex -> parse -> typecheck -> interpret a BlastScript source string. */
export function run(source: string, options?: InterpreterOptions): RunResult {
  const tokens = tokenize(source);
  const program = parse(tokens);
  const typeErrors = typecheck(program);
  const value = interpret(program, options);
  return { value, typeErrors };
}

import { tokenize } from "../lexer.js";
import { parse } from "../parser.js";
import { typecheck } from "../typechecker.js";
import { interpret, BValue } from "../interpreter.js";
import { compileToJS } from "../compiler.js";

let passed = 0;
let failed = 0;

function assertEqual(actual: unknown, expected: unknown, label: string) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) {
    passed++;
    console.log(`  ok   ${label}`);
  } else {
    failed++;
    console.log(`  FAIL ${label}\n       expected: ${e}\n       actual:   ${a}`);
  }
}

function runSrc(src: string): { output: BValue[]; result: BValue } {
  const output: BValue[] = [];
  const tokens = tokenize(src);
  const program = parse(tokens);
  const errs = typecheck(program);
  if (errs.length) throw new Error("Unexpected type errors: " + errs.map((e) => e.message).join("; "));
  const result = interpret(program, {
    onShout: (vals) => output.push(vals.length === 1 ? vals[0] : (vals as unknown as BValue)),
  });
  return { output, result };
}

console.log("BlastScript core — test suite\n");

console.log("arithmetic & variables");
{
  const { output } = runSrc(`
    spawn a = 3
    spawn b = 4
    shout(a * b + 1)
  `);
  assertEqual(output, [13], "spawn + arithmetic + shout");
}

console.log("\nconditionals (aim/else)");
{
  const { output } = runSrc(`
    spawn hp = 0
    aim (hp > 0) { shout("alive") } else { shout("dead") }
  `);
  assertEqual(output, ["dead"], "aim/else picks correct branch");
}

console.log("\nloops (respawn / wave, flee / reload)");
{
  const { output } = runSrc(`
    spawn i = 0
    respawn (i < 5) {
      i = i + 1
      aim (i == 3) { reload }
      aim (i == 5) { flee }
      shout(i)
    }
  `);
  assertEqual(output, [1, 2, 4], "respawn with reload/flee");
}
{
  const { output } = runSrc(`
    spawn total = 0
    wave (spawn i = 0; i < 4; i = i + 1) {
      total = total + i
    }
    shout(total)
  `);
  assertEqual(output, [6], "wave loop accumulates 0+1+2+3");
}

console.log("\nweapons (functions), closures, recursion");
{
  const { output } = runSrc(`
    weapon makeCounter(start: num) {
      spawn ammo = start
      weapon fire() {
        ammo = ammo + 1
        score ammo
      }
      score fire
    }
    spawn counter = makeCounter(10)
    shout(counter())
    shout(counter())
    shout(counter())
  `);
  assertEqual(output, [11, 12, 13], "closures capture and mutate outer scope");
}
{
  const { output } = runSrc(`
    weapon factorial(n: num) => num {
      aim (n <= 1) { score 1 }
      score n * factorial(n - 1)
    }
    shout(factorial(6))
  `);
  assertEqual(output, [720], "recursive factorial(6) == 720");
}

console.log("\nloadout immutability is enforced");
{
  let threw = false;
  try {
    runSrc(`
      loadout MAX = 3
      MAX = 4
    `);
  } catch (e) {
    threw = true;
  }
  assertEqual(threw, true, "reassigning a loadout throws a RuntimeError");
}

console.log("\ntype checker catches mismatches");
{
  const tokens = tokenize(`spawn x: num = "not a number"`);
  const program = parse(tokens);
  const errs = typecheck(program);
  assertEqual(errs.length > 0, true, "declared num but initialized with str");
}

console.log("\ncompiler emits runnable JS");
{
  const tokens = tokenize(`
    weapon square(n: num) => num { score n * n }
    shout(square(7))
  `);
  const program = parse(tokens);
  const js = compileToJS(program);
  const logs: number[] = [];
  const fn = new Function("console", js);
  fn({ log: (...a: number[]) => logs.push(a[0]) });
  assertEqual(logs, [49], "compiled JS produces the same result as the interpreter");
}

console.log("\narrays and built-ins");
{
  const { output } = runSrc(`
    spawn loot_bag = [1, 2, 3]
    shout(len(loot_bag))
    push(loot_bag, 4)
    shout(loot_bag[3])
  `);
  assertEqual(output, [3, 4], "len() and push() built-ins work on arrays");
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

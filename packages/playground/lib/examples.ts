export interface Example {
  id: string;
  label: string;
  source: string;
}

export const EXAMPLES: Example[] = [
  {
    id: "hello-arena",
    label: "hello-arena",
    source: `// hello-arena.blast — the canonical BlastScript starter.

loadout MAX_WAVES = 3
spawn points = 0
spawn player = "Neo"

weapon spawnEnemy(waveNum: num) => str {
  score "grunt-" + waveNum
}

shout("Player online:", player)

wave (spawn w = 1; w <= MAX_WAVES; w = w + 1) {
  spawn enemy = spawnEnemy(w)
  shout("Wave", w, "spawns", enemy)
  points = points + (w * 10)
}

aim (points >= 50) {
  shout("Rank: LEGENDARY —", points, "points")
} else {
  shout("Rank: RECRUIT —", points, "points")
}
`,
  },
  {
    id: "closures",
    label: "closures",
    source: `// A weapon that returns a weapon: classic closure over 'ammo'.
weapon makeCounter(start: num) {
  spawn ammo = start

  weapon fire() {
    ammo = ammo + 1
    score ammo
  }

  score fire
}

spawn counter = makeCounter(0)
shout(counter())   // 1
shout(counter())   // 2
shout(counter())   // 3

weapon factorial(n: num) => num {
  aim (n <= 1) {
    score 1
  }
  score n * factorial(n - 1)
}

shout("5! =", factorial(5))
`,
  },
  {
    id: "loop-control",
    label: "flee & reload",
    source: `// flee = break, reload = continue.
spawn i = 0
respawn (i < 10) {
  i = i + 1
  aim (i % 2 == 0) {
    reload
  }
  aim (i == 9) {
    shout("boss spotted, bailing")
    flee
  }
  shout("clearing wave", i)
}
`,
  },
  {
    id: "types",
    label: "type errors",
    source: `// Gradual typing: annotate what you want checked, leave the
// rest as 'any'. This one is intentionally wrong — run it and
// look at the diagnostics panel below the output.

spawn hp: num = "not a number"

weapon heal(amount: num) => num {
  score amount * 2
}

shout(heal("also wrong"))
`,
  },
];

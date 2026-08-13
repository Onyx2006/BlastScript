const ENTRIES: { kw: string; meaning: string; tone: "score" | "hit" | "loot" }[] = [
  { kw: "spawn x = 1", meaning: "mutable variable declaration", tone: "score" },
  { kw: "loadout x = 1", meaning: "constant declaration", tone: "loot" },
  { kw: "weapon f(a) { }", meaning: "function declaration", tone: "score" },
  { kw: "hit f(a)", meaning: "call a function (statement sugar)", tone: "hit" },
  { kw: "score expr", meaning: "return a value", tone: "score" },
  { kw: "aim (c) { } else { }", meaning: "if / else", tone: "loot" },
  { kw: "respawn (c) { }", meaning: "while loop", tone: "hit" },
  { kw: "wave (i;c;s) { }", meaning: "for loop", tone: "hit" },
  { kw: "flee", meaning: "break out of a loop", tone: "hit" },
  { kw: "reload", meaning: "continue to the next iteration", tone: "loot" },
  { kw: "shout(x)", meaning: "print to output", tone: "score" },
  { kw: "loot \"mod\"", meaning: "import a module", tone: "loot" },
  { kw: "alive / dead", meaning: "boolean true / false", tone: "score" },
  { kw: "x: num, => num", meaning: "optional type annotations", tone: "loot" },
];

export function Glossary() {
  return (
    <section style={{ padding: "56px 0" }}>
      <div className="container">
        <div className="eyebrow" style={{ marginBottom: 10 }}>
          loadout select
        </div>
        <h2 style={{ fontSize: 22, margin: "0 0 6px", color: "var(--ink)" }}>
          Every keyword maps to something in the game
        </h2>
        <p style={{ color: "var(--fog)", margin: "0 0 28px", maxWidth: 560, fontSize: 14 }}>
          Fourteen keywords, all reserved — none of them can double as a variable name.
          Once you know the game, the syntax reads itself.
        </p>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))",
            gap: 1,
            background: "var(--hairline)",
            border: "1px solid var(--hairline)",
            borderRadius: "var(--radius)",
            overflow: "hidden",
          }}
        >
          {ENTRIES.map((e) => (
            <div
              key={e.kw}
              style={{
                background: "var(--panel)",
                padding: "16px 16px",
              }}
            >
              <div
                style={{
                  fontSize: 13,
                  color: `var(--${e.tone})`,
                  marginBottom: 8,
                  fontWeight: 600,
                }}
              >
                {e.kw}
              </div>
              <div style={{ fontSize: 12.5, color: "var(--fog)" }}>{e.meaning}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

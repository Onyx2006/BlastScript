const STATS: { value: string; label: string }[] = [
  { value: "14", label: "reserved keywords" },
  { value: "0", label: "runtime dependencies in @blastscript/core" },
  { value: "AST → JS", label: "compiles down to plain JavaScript" },
];

export function StatsStrip() {
  return (
    <section style={{ borderTop: "1px solid var(--hairline)", borderBottom: "1px solid var(--hairline)" }}>
      <div
        className="container"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 24,
          padding: "24px 24px",
        }}
      >
        {STATS.map((s) => (
          <div key={s.label}>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 20, color: "var(--score)" }}>
              {s.value}
            </div>
            <div style={{ fontSize: 12, color: "var(--fog)", marginTop: 6 }}>{s.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

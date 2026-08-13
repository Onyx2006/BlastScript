export function SiteNav() {
  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 10,
        background: "rgba(10, 12, 16, 0.85)",
        backdropFilter: "blur(6px)",
        borderBottom: "1px solid var(--hairline)",
      }}
    >
      <div
        className="container"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          height: 52,
        }}
      >
        <div style={{ fontFamily: "var(--font-display)", fontSize: 11, color: "var(--ink)" }}>
          <span style={{ color: "var(--score)" }}>BLAST</span>
          <span style={{ color: "var(--hit)" }}>SCRIPT</span>
        </div>
        <a
          href="#playground"
          style={{
            fontSize: 12.5,
            color: "var(--fog)",
            border: "1px solid var(--hairline)",
            borderRadius: "var(--radius)",
            padding: "6px 12px",
            textDecoration: "none",
          }}
        >
          ▶ open the arena
        </a>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer style={{ borderTop: "1px solid var(--hairline)", padding: "28px 0 40px" }}>
      <div
        className="container"
        style={{
          display: "flex",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
          color: "var(--fog)",
          fontSize: 12,
        }}
      >
        <span>BlastScript — a language, a compiler, and a playground, all in one repo.</span>
        <span>zero runtime dependencies in @blastscript/core</span>
      </div>
    </footer>
  );
}

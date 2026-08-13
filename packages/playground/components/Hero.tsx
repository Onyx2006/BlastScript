"use client";

import { useEffect, useRef, useState } from "react";
import { run } from "@blastscript/core";
import { KillFeed, FeedEntry, FeedTone } from "./KillFeed";
import { EXAMPLES } from "@/lib/examples";

const DEMO_SOURCE = EXAMPLES[0].source;

/**
 * Types the demo source out character-by-character, then runs it and
 * streams the shout() calls into the kill-feed, then loops. This is the
 * page's signature moment — the language is the hero, not a screenshot
 * of it.
 */
export function Hero() {
  const [typed, setTyped] = useState("");
  const [feed, setFeed] = useState<FeedEntry[]>([]);
  const feedId = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout>;

    async function playOnce() {
      setTyped("");
      setFeed([]);
      for (let i = 1; i <= DEMO_SOURCE.length; i++) {
        if (cancelled) return;
        setTyped(DEMO_SOURCE.slice(0, i));
        await sleep(6);
      }
      await sleep(400);
      if (cancelled) return;

      const entries: FeedEntry[] = [];
      try {
        const { typeErrors } = run(DEMO_SOURCE, {
          onShout: (values) => {
            entries.push({
              id: feedId.current++,
              tone: "score",
              text: values.map(String).join(" "),
            });
          },
        });
        if (typeErrors.length) {
          entries.push({ id: feedId.current++, tone: "hit", text: typeErrors[0].message });
        }
      } catch (err) {
        entries.push({ id: feedId.current++, tone: "hit", text: String((err as Error).message) });
      }

      for (const entry of entries) {
        if (cancelled) return;
        await sleep(220);
        setFeed((f) => [...f, entry]);
      }

      await sleep(2600);
      if (!cancelled) playOnce();
    }

    playOnce();
    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, []);

  return (
    <section style={{ padding: "72px 0 40px" }}>
      <div className="container">
        <div className="eyebrow" style={{ marginBottom: 18 }}>
          spawn · hit · score · loot
        </div>

        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(28px, 6vw, 52px)",
            lineHeight: 1.35,
            margin: "0 0 20px",
            color: "var(--ink)",
            letterSpacing: "0.01em",
          }}
        >
          <span style={{ color: "var(--score)" }}>BLAST</span>
          <span style={{ color: "var(--hit)" }}>SCRIPT</span>
        </h1>

        <p style={{ maxWidth: 560, color: "var(--fog)", fontSize: 16, marginBottom: 40 }}>
          A small, ambitious language with an arcade shooter&apos;s vocabulary. Gradual
          types, closures, recursion, and a compiler down to JavaScript — spoken entirely
          in <code style={{ color: "var(--loot)" }}>spawn</code>,{" "}
          <code style={{ color: "var(--loot)" }}>hit</code>,{" "}
          <code style={{ color: "var(--loot)" }}>score</code> and{" "}
          <code style={{ color: "var(--loot)" }}>loot</code>.
        </p>

        <div
          ref={containerRef}
          style={{
            display: "grid",
            gridTemplateColumns: "1.1fr 0.9fr",
            gap: 1,
            background: "var(--hairline)",
            borderRadius: "var(--radius)",
            overflow: "hidden",
            boxShadow: "var(--shadow-panel)",
          }}
          className="hero-demo-grid"
        >
          <div style={{ background: "var(--panel)", padding: "16px 18px", minHeight: 320 }}>
            <TerminalChrome label="hello-arena.blast" />
            <pre
              style={{
                margin: 0,
                marginTop: 14,
                fontSize: 13,
                lineHeight: 1.65,
                color: "var(--ink)",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                minHeight: 260,
              }}
            >
              <Highlighted source={typed} />
              <span style={{ animation: "blink 1s step-end infinite", color: "var(--score)" }}>█</span>
            </pre>
          </div>
          <div style={{ background: "var(--panel)", padding: "16px 18px", minHeight: 320 }}>
            <TerminalChrome label="kill-feed" dim />
            <div style={{ marginTop: 14 }}>
              <KillFeed entries={feed} emptyHint="// output streams in once the run starts…" />
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 720px) {
          .hero-demo-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </section>
  );
}

function TerminalChrome({ label, dim }: { label: string; dim?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--hit-dim)" }} />
      <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--loot-dim)" }} />
      <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--score-dim)" }} />
      <span
        style={{
          marginLeft: 8,
          fontSize: 11,
          color: dim ? "var(--fog)" : "var(--fog)",
          letterSpacing: "0.03em",
        }}
      >
        {label}
      </span>
    </div>
  );
}

// Minimal, dependency-free syntax coloring — just enough to make the demo
// read as "code" without pulling in a full highlighter for four keywords.
const KEYWORD_RE =
  /\b(spawn|loadout|weapon|aim|else|respawn|wave|score|shout|loot|hit|flee|reload|alive|dead|void)\b/g;
const STRING_RE = /"(?:[^"\\]|\\.)*"/g;
const COMMENT_RE = /\/\/.*$/gm;
const NUMBER_RE = /\b\d+(\.\d+)?\b/g;

function Highlighted({ source }: { source: string }) {
  const tokens: { text: string; color?: string }[] = [];
  let rest = source;
  let cursor = 0;

  // Build a combined match list by scanning left to right.
  const matches: { start: number; end: number; color: string }[] = [];
  for (const re of [
    { re: COMMENT_RE, color: "var(--fog)" },
    { re: STRING_RE, color: "var(--loot)" },
    { re: KEYWORD_RE, color: "var(--hit)" },
    { re: NUMBER_RE, color: "var(--score)" },
  ]) {
    re.re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.re.exec(source))) {
      matches.push({ start: m.index, end: m.index + m[0].length, color: re.color });
      if (m[0].length === 0) re.re.lastIndex++;
    }
  }
  matches.sort((a, b) => a.start - b.start);

  const accepted: typeof matches = [];
  let lastEnd = 0;
  for (const m of matches) {
    if (m.start >= lastEnd) {
      accepted.push(m);
      lastEnd = m.end;
    }
  }

  for (const m of accepted) {
    if (m.start > cursor) tokens.push({ text: source.slice(cursor, m.start) });
    tokens.push({ text: source.slice(m.start, m.end), color: m.color });
    cursor = m.end;
  }
  if (cursor < source.length) tokens.push({ text: source.slice(cursor) });

  return (
    <>
      {tokens.map((t, i) => (
        <span key={i} style={{ color: t.color ?? "var(--ink)" }}>
          {t.text}
        </span>
      ))}
    </>
  );
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

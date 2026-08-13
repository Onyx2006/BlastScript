"use client";

import { useMemo, useRef, useState } from "react";
import { tokenize, parse, typecheck, interpret, compileToJS } from "@blastscript/core";
import { KillFeed, FeedEntry } from "./KillFeed";
import { EXAMPLES } from "@/lib/examples";

type ViewTab = "output" | "js";

export function Playground() {
  const [exampleId, setExampleId] = useState(EXAMPLES[0].id);
  const [source, setSource] = useState(EXAMPLES[0].source);
  const [feed, setFeed] = useState<FeedEntry[]>([]);
  const [diagnostics, setDiagnostics] = useState<string[]>([]);
  const [jsOutput, setJsOutput] = useState("");
  const [tab, setTab] = useState<ViewTab>("output");
  const [status, setStatus] = useState<"idle" | "ok" | "error">("idle");
  const feedId = useRef(0);

  const selected = useMemo(() => EXAMPLES.find((e) => e.id === exampleId)!, [exampleId]);

  function loadExample(id: string) {
    const ex = EXAMPLES.find((e) => e.id === id);
    if (!ex) return;
    setExampleId(id);
    setSource(ex.source);
    setFeed([]);
    setDiagnostics([]);
    setJsOutput("");
    setStatus("idle");
  }

  function runProgram() {
    const entries: FeedEntry[] = [];
    const diags: string[] = [];
    try {
      const tokens = tokenize(source);
      const program = parse(tokens);
      const typeErrors = typecheck(program);
      for (const err of typeErrors) diags.push(err.message);

      interpret(program, {
        onShout: (values) => {
          entries.push({
            id: feedId.current++,
            tone: "score",
            text: values.map((v) => String(v)).join(" "),
          });
        },
      });

      try {
        setJsOutput(compileToJS(program));
      } catch {
        setJsOutput("// this program could not be compiled to JS");
      }

      setFeed(entries);
      setDiagnostics(diags);
      setStatus(diags.length ? "error" : "ok");
    } catch (err) {
      entries.push({ id: feedId.current++, tone: "hit", text: (err as Error).message });
      setFeed(entries);
      setDiagnostics([]);
      setStatus("error");
    }
  }

  return (
    <section id="playground" style={{ padding: "56px 0 96px" }}>
      <div className="container">
        <div className="eyebrow" style={{ marginBottom: 10 }}>
          the arena
        </div>
        <h2 style={{ fontSize: 22, margin: "0 0 24px", color: "var(--ink)" }}>
          Run BlastScript right here
        </h2>

        <div
          style={{
            display: "flex",
            gap: 8,
            marginBottom: 12,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          {EXAMPLES.map((ex) => (
            <button
              key={ex.id}
              onClick={() => loadExample(ex.id)}
              style={{
                background: ex.id === exampleId ? "var(--panel-raised)" : "transparent",
                color: ex.id === exampleId ? "var(--score)" : "var(--fog)",
                border: `1px solid ${ex.id === exampleId ? "var(--score-dim)" : "var(--hairline)"}`,
                borderRadius: "var(--radius)",
                padding: "6px 12px",
                fontSize: 12.5,
                fontFamily: "var(--font-mono)",
              }}
            >
              {ex.label}
            </button>
          ))}
          <div style={{ flex: 1 }} />
          <button
            onClick={runProgram}
            style={{
              background: "var(--score)",
              color: "var(--void)",
              border: "none",
              borderRadius: "var(--radius)",
              padding: "8px 18px",
              fontSize: 13,
              fontWeight: 700,
              fontFamily: "var(--font-mono)",
            }}
          >
            ▶ run
          </button>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.15fr 0.85fr",
            gap: 1,
            background: "var(--hairline)",
            borderRadius: "var(--radius)",
            overflow: "hidden",
            boxShadow: "var(--shadow-panel)",
          }}
          className="playground-grid"
        >
          <div style={{ background: "var(--panel)" }}>
            <textarea
              value={source}
              onChange={(e) => setSource(e.target.value)}
              spellCheck={false}
              style={{
                width: "100%",
                minHeight: 420,
                background: "transparent",
                color: "var(--ink)",
                border: "none",
                outline: "none",
                resize: "vertical",
                fontFamily: "var(--font-mono)",
                fontSize: 13,
                lineHeight: 1.65,
                padding: "16px 18px",
              }}
            />
          </div>

          <div style={{ background: "var(--panel)", display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", borderBottom: "1px solid var(--hairline)" }}>
              <TabButton active={tab === "output"} onClick={() => setTab("output")}>
                kill-feed
              </TabButton>
              <TabButton active={tab === "js"} onClick={() => setTab("js")}>
                compiled JS
              </TabButton>
              <div style={{ flex: 1 }} />
              <StatusPill status={status} />
            </div>

            <div style={{ padding: "14px 16px", flex: 1, overflow: "auto", minHeight: 380 }}>
              {tab === "output" ? (
                <>
                  <KillFeed entries={feed} emptyHint="// hit run to execute the program" />
                  {diagnostics.length > 0 && (
                    <div style={{ marginTop: 16 }}>
                      <div
                        className="eyebrow"
                        style={{ color: "var(--loot)", marginBottom: 8, fontSize: 9 }}
                      >
                        type diagnostics
                      </div>
                      {diagnostics.map((d, i) => (
                        <div
                          key={i}
                          style={{
                            fontSize: 12.5,
                            color: "var(--loot)",
                            padding: "4px 0",
                            borderLeft: "2px solid var(--loot-dim)",
                            paddingLeft: 8,
                            marginBottom: 4,
                          }}
                        >
                          {d}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <pre
                  style={{
                    margin: 0,
                    fontSize: 12.5,
                    lineHeight: 1.6,
                    color: "var(--fog)",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                  }}
                >
                  {jsOutput || "// run the program to see its JS translation"}
                </pre>
              )}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 720px) {
          .playground-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </section>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        background: "transparent",
        border: "none",
        borderBottom: `2px solid ${active ? "var(--score)" : "transparent"}`,
        color: active ? "var(--ink)" : "var(--fog)",
        padding: "10px 14px",
        fontSize: 12.5,
        fontFamily: "var(--font-mono)",
      }}
    >
      {children}
    </button>
  );
}

function StatusPill({ status }: { status: "idle" | "ok" | "error" }) {
  if (status === "idle") return null;
  const color = status === "ok" ? "var(--score)" : "var(--hit)";
  const label = status === "ok" ? "clean run" : "diagnostics";
  return (
    <div
      style={{
        alignSelf: "center",
        marginRight: 14,
        fontSize: 11,
        color,
        border: `1px solid ${color}`,
        borderRadius: 20,
        padding: "3px 10px",
      }}
    >
      {label}
    </div>
  );
}

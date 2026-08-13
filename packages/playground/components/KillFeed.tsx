"use client";

export type FeedTone = "score" | "hit" | "loot" | "fog";

export interface FeedEntry {
  id: number;
  tone: FeedTone;
  text: string;
}

const toneColor: Record<FeedTone, string> = {
  score: "var(--score)",
  hit: "var(--hit)",
  loot: "var(--loot)",
  fog: "var(--fog)",
};

const toneLabel: Record<FeedTone, string> = {
  score: "SHOUT",
  hit: "ERROR",
  loot: "TYPE",
  fog: "SYS",
};

export function KillFeed({ entries, emptyHint }: { entries: FeedEntry[]; emptyHint?: string }) {
  if (entries.length === 0) {
    return (
      <div style={{ color: "var(--fog)", fontSize: 13, padding: "4px 2px" }}>
        {emptyHint ?? "// waiting for output…"}
      </div>
    );
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {entries.map((e) => (
        <div
          key={e.id}
          className="killfeed-row"
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 10,
            padding: "6px 10px",
            background: "var(--panel-raised)",
            borderLeft: `3px solid ${toneColor[e.tone]}`,
            borderRadius: "0 var(--radius) var(--radius) 0",
            fontSize: 13,
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 8,
              color: toneColor[e.tone],
              flexShrink: 0,
              letterSpacing: "0.05em",
            }}
          >
            {toneLabel[e.tone]}
          </span>
          <span style={{ color: "var(--ink)", wordBreak: "break-word" }}>{e.text}</span>
        </div>
      ))}
    </div>
  );
}

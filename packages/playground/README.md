# @blastscript/playground

A Next.js (App Router) site that showcases and runs BlastScript entirely
client-side — `@blastscript/core` has zero runtime dependencies, so the
lexer/parser/type-checker/interpreter all ship straight to the browser
and execute there. Nothing is sent to a server to run your code.

## Design

The visual language is an arcade cabinet HUD, not a generic dark SaaS
landing page — deliberately, since the product's whole identity is "a
programming language that talks like a shooter." Concretely:

- **Tri-color accent system** (`--hit` magenta-red, `--score` phosphor
  green, `--loot` amber) mirrors the three things a shooter HUD actually
  tracks — damage, points, drops — rather than one generic accent color.
- **Two-face typography**: `Press Start 2P` (pixel display face) used
  *only* for the wordmark, eyebrows, and stat numbers; `JetBrains Mono`
  for everything else, because the product is source code.
- **Signature element — the kill-feed.** Every `shout()` call renders as
  a HUD notification chip that slides in from the right, styled like a
  shooter's kill-feed, instead of a plain `console.log` line. The hero
  section auto-types a program and plays its own kill-feed output on a
  loop; the live playground below reuses the identical component for
  real output.

All tokens live in `app/globals.css` as CSS custom properties.

## Structure

```
app/
  layout.tsx      — fonts, metadata
  page.tsx         — composes the sections below
  globals.css      — design tokens + resets
components/
  Hero.tsx         — animated wordmark + auto-playing terminal demo
  KillFeed.tsx     — the shared HUD-toast list (signature element)
  Glossary.tsx      — keyword ↔ meaning reference, "loadout select" styling
  StatsStrip.tsx    — small stat row (keyword count, deps, compile target)
  Playground.tsx    — the real interactive editor + run button
  SiteChrome.tsx    — nav + footer
lib/
  examples.ts       — bundled .blast example programs (inlined as strings
                       so they ship with the client bundle, no fs access
                       needed in the browser)
```

## How the live playground works

`components/Playground.tsx` imports `tokenize`, `parse`, `typecheck`,
`interpret`, and `compileToJS` directly from `@blastscript/core` and
calls them on every "run" click:

1. `tokenize` + `parse` the textarea contents into an AST
2. `typecheck` it — diagnostics are collected but never block execution
   (gradual typing)
3. `interpret` it, with an `onShout` callback that pushes into the
   kill-feed
4. `compileToJS` it for the "compiled JS" tab, so you can see what the
   program looks like translated to plain JavaScript

Because this all runs in-browser with no server round-trip, there's no
sandboxing concern beyond what runs in any browser tab — the interpreter
also caps execution at 500,000 evaluated statements
(`InterpreterOptions.maxSteps`) so a runaway `respawn`/`wave` loop can't
hang the tab.

## Running it

```bash
npm install
npm run dev --workspace=packages/playground
```

Requires network access once (to install `next`/`react` and to fetch the
Google Fonts stylesheet at runtime — the CSS falls back to the system
monospace stack if that request fails).

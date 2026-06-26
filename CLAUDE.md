# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Mind Trail is a local-first web app for visualizing learning paths: a vertical **main line** (学习正常推进) with rightward **branches** (探索细节). No backend, no accounts — all state lives in `localStorage` under the key `mind-trail:v0.1.0`. `README.md` is the user-facing overview; the authoritative product behavior is `docs/PRODUCT_SPEC.md`; roadmap is `docs/ROADMAP.md`; changelog is `docs/CHANGELOG.md`; the architecture overview is `docs/architecture.md`; the v0.1.0 implementation plan is in `docs/specs/`.

UI copy is **Chinese**.

## Commands

Use **npm**. pnpm is unavailable here — Node lives in an admin-locked dir, so `corepack enable/prepare pnpm` fails with `EPERM`. (`pnpm add X` → `npm install X`.)

```bash
npm run dev          # Vite dev server (http://localhost:5173)
npm run build        # tsc type-check + vite production build
npm test             # vitest run (single pass)
npm run test:watch   # vitest watch
npm run typecheck    # tsc --noEmit only

npm test src/lib/layout.test.ts        # run one test file
npx vitest run -t "keeps a main chain" # run tests matching a name
```

## Architecture

Three layers, strictly separated. The dependency direction is **lib → store → features**; never the reverse.

**1. Pure logic — `src/lib/` (no React, no Zustand; this is the TDD surface)**
- `storage.ts` — localStorage load/save, default project/node factories, corrupt-data fallback.
- `tree.ts` — `getChildren` / `getParentId` / `getDescendants` over the edge list.
- `layout.ts` — two distinct concerns: per-creation positioning (`mainChildPosition`, `branchChildPosition`) used when growing the graph, and `autoLayout` for full re-layout. `autoLayout` is a deterministic DFS that produces a centered tree: column = branch-depth from root; a **per-column** Y cursor keeps separate sub-trees from overlapping, and a `topY` threaded down the main spine makes a node's branch children anchor to *that node's* row — so a branch of a mid-spine node follows it down instead of floating up to a free slot one column over (the 图一→图二 fix; placing branches against the bare column cursor before the parent's row was known was the original bug). Invariants: a main child shares `parent.x` and sits directly below; a branch child is one column right (`parent.x + 260`) and the parent is **vertically centered on its branch children** (so a lone branch sits level with its parent, two branches straddle it).

**2. State — `src/store/useMindTrailStore.ts` (the single source of truth)**
- One Zustand store holds `projects[]` + `activeProjectId`. Every domain mutation is an action here.
- **Every mutating action persists synchronously** to localStorage via the internal `persist()` (no debounce — keep it that way; it's what makes refresh reliable).
- Node actions (`continueMainLine`, `createBranch`, `deleteNode`, `selectNode`, `setNodeStatus`, `moveNode`, …) operate on the **active project implicitly** through the `updateActive()` helper. Project-lifecycle actions (`createProject`, `openProject`, `closeProject`, `deleteProject`, `renameProject`) take an explicit id.
- Selectors `selectActiveProject` / `selectCurrentNode` are exported from this same file.
- `deleteNode` deletes the node **and all descendants**, cleans edges, then reselects parent → else any remaining node → else recreates a fresh initial node (a project always has ≥1 node).
- **Undo/redo** is a session-only history of **project-scoped snapshots** (`past`/`future` stacks). Canvas-mutating actions call the internal `pushHistory(tag)` *before* mutating — `tag` coalesces a burst of same-field text edits into one step, `null` is a discrete step; `undo`/`redo` restore a snapshot and persist. A snapshot captures only the active project's `nodes/edges/currentNodeId` (not its title), so undo never reverts a rename or touches other projects; switching/creating/deleting a project clears the stacks. The stacks are **not** persisted (refresh starts empty), but an undo's *result* is. Relies on actions doing immutable updates, so a snapshot is just cheap references to the old arrays.

**3. UI — `src/features/` (thin: render store state, dispatch actions)**
- `App.tsx` routes by state alone: `activeProjectId ? <Workbench/> : <ProjectHome/>`. No router library; "open last project on launch" falls out for free because `activeProjectId` is persisted.
- `home/` — ProjectHome (list/create/open/delete) + ConfirmDialog (project delete needs二次确认; node delete does not).
- `workbench/` — Workbench wraps everything in `<ReactFlowProvider>`; Toolbar, Canvas, Inspector, and the `useKeyboardShortcuts` hook (Enter=继续主线 / Tab=创建支线 / Delete or Backspace=删除 / Ctrl+Z=撤销 / Ctrl+Shift+Z or Ctrl+Y=重做, all suppressed while typing in an input/textarea — so Ctrl+Z there falls back to the browser's native text undo). RF's own `deleteKeyCode` is disabled (`null`) so Backspace deletes through the store, not RF's local state. Double-clicking a node (`TrailNodeView`) opens an inline title editor. Two IME (e.g. Chinese pinyin) gotchas shaped its design — both stem from the node title being **synced into RF through a Canvas effect**, so `data.title` lags one render behind a keystroke (the Inspector's title input reads the store directly, so it has neither problem, which is why right-panel editing always worked):
  - The editor is driven by **local `draft` state**, not the store — `onChange` only `setDraft`s, and the draft is committed to the store on blur / Enter (`commitTitle`). Binding the input to the lagging `data.title` and writing it back mid-composition fed a stale value into the controlled input and **duplicated the pinyin** ("shide" → "sshshishi'dshi'de"). Local state stays in lockstep with what's typed, so the IME is never fought.
  - `onKeyDown` only treats Enter/Escape as commit/close when **`e.nativeEvent.isComposing` is false** — otherwise the Enter that confirms an IME candidate would `preventDefault` + close the editor mid-composition.

### Canvas ↔ store sync (the one subtle bit)

`src/features/workbench/Canvas.tsx` uses React Flow (`@xyflow/react`) as a **rendering layer only** — the store stays authoritative. RF nodes are re-synced **from** the store in an effect keyed on a serialization of node positions/data + `currentNodeId`. Drag updates local RF state for smoothness and commits back to the store **on drag-stop** (`moveNode`). Do not invert this and make RF the source of truth. Canvas is pinned to `colorMode="light"` (with `color-scheme: light` in `index.css`) so it doesn't follow OS dark mode.

Three non-obvious details about edges/handles/selection:
- **Edges bind to named handles.** Each node (`TrailNodeView`) exposes four handles with ids — `top`/`left` (targets), `bottom`/`right` (sources). Main edges connect `bottom → top` (vertical spine); branch edges connect `right → left` (rightward). Both carry an arrowhead (`markerEnd: ArrowClosed`). Changing these ids requires updating the edge mapping in `Canvas.tsx` in lockstep.
- **The sync must preserve RF-measured `handleBounds`.** A per-handle edge only resolves once RF has measured that handle's bounds; if you rebuild node objects from scratch each sync you wipe `measured`/`handleBounds` and RF silently drops the edges (warning `#008`). So the sync **merges** onto the previous node objects (`...prevById.get(id)`) instead of replacing them, and a second effect calls `useUpdateNodeInternals` when the node-id set changes. (RF's own measurement is `requestAnimationFrame`-driven, so it won't run in a backgrounded/hidden tab.)
- **`nodeClickDistance` and `nodeDragThreshold` must match** (both `NODE_CLICK_SLOP = 4`). With RF's defaults (`nodeClickDistance: 0`, `nodeDragThreshold: 1`) a ~1px pointer jitter during a press falls into a dead zone — past 0px the click is suppressed, but under 1px no drag starts — so **neither `onNodeClick` nor `onNodeDragStart` fires** and the node never becomes current (you have to click twice). Setting them equal closes the gap: ≤4px is a click (node doesn't move, `selectNode` fires), >4px is a drag. `onNodeDragStart` also calls `selectNode` so grabbing a node focuses it. Don't set `nodeDragThreshold` to 0 — every click would then commit a no-op `moveNode`, polluting undo history.

## Testing conventions

Logic-only TDD — there are intentionally **no component/render tests and no jsdom**. Vitest runs in the fast `node` environment with a `localStorage` polyfill in `src/test/setup.ts`. Store tests isolate via `localStorage.clear()` + `useMindTrailStore.setState({ projects: [], activeProjectId: null })` in `beforeEach`.

## Scope guardrails (v0.1.0)

Out of scope by design — don't add without discussion: search, export, AI, cloud sync, accounts, tags. (Undo/redo was originally deferred but **shipped in v0.1.0** — Ctrl+Z/Ctrl+Y over a session-only history; see the State section.) The core value is "main line clear, branches controlled, current node obvious, nothing lost on refresh." Anything that makes the canvas messier, adds concepts, or weakens persistence should be deferred (see `docs/ROADMAP.md`).

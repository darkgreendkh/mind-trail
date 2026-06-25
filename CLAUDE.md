# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Mind Trail is a local-first web app for visualizing learning paths: a vertical **main line** (学习正常推进) with rightward **branches** (探索细节). No backend, no accounts — all state lives in `localStorage` under the key `mind-trail:v0.1.0`. The authoritative product behavior is `docs/PRODUCT_SPEC.md`; roadmap is `docs/ROADMAP.md`; the v0.1.0 implementation plan is in `docs/specs/`.

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
- `layout.ts` — two distinct concerns: per-creation positioning (`mainChildPosition`, `branchChildPosition`) used when growing the graph, and `autoLayout` for full re-layout. `autoLayout` is a deterministic DFS: column = branch-depth from root, a single shared pixel cursor guarantees unique, non-overlapping positions. Invariant it must preserve: a main child shares `parent.x` and sits below; a branch child is at `parent.x + 260` and below.

**2. State — `src/store/useMindTrailStore.ts` (the single source of truth)**
- One Zustand store holds `projects[]` + `activeProjectId`. Every domain mutation is an action here.
- **Every mutating action persists synchronously** to localStorage via the internal `persist()` (no debounce — keep it that way; it's what makes refresh reliable).
- Node actions (`continueMainLine`, `createBranch`, `deleteNode`, `selectNode`, `setNodeStatus`, `moveNode`, …) operate on the **active project implicitly** through the `updateActive()` helper. Project-lifecycle actions (`createProject`, `openProject`, `closeProject`, `deleteProject`, `renameProject`) take an explicit id.
- Selectors `selectActiveProject` / `selectCurrentNode` are exported from this same file.
- `deleteNode` deletes the node **and all descendants**, cleans edges, then reselects parent → else any remaining node → else recreates a fresh initial node (a project always has ≥1 node).

**3. UI — `src/features/` (thin: render store state, dispatch actions)**
- `App.tsx` routes by state alone: `activeProjectId ? <Workbench/> : <ProjectHome/>`. No router library; "open last project on launch" falls out for free because `activeProjectId` is persisted.
- `home/` — ProjectHome (list/create/open/delete) + ConfirmDialog (project delete needs二次确认; node delete does not).
- `workbench/` — Workbench wraps everything in `<ReactFlowProvider>`; Toolbar, Canvas, Inspector, and the `useKeyboardShortcuts` hook (Enter=继续主线 / Tab=创建支线 / Delete=删除, suppressed while typing in an input/textarea).

### Canvas ↔ store sync (the one subtle bit)

`src/features/workbench/Canvas.tsx` uses React Flow (`@xyflow/react`) as a **rendering layer only** — the store stays authoritative. RF nodes are rebuilt **from** the store in an effect keyed on a serialization of node positions/data + `currentNodeId`. Drag updates local RF state for smoothness and commits back to the store **on drag-stop** (`moveNode`). Do not invert this and make RF the source of truth. Canvas is pinned to `colorMode="light"` (with `color-scheme: light` in `index.css`) so it doesn't follow OS dark mode.

## Testing conventions

Logic-only TDD — there are intentionally **no component/render tests and no jsdom**. Vitest runs in the fast `node` environment with a `localStorage` polyfill in `src/test/setup.ts`. Store tests isolate via `localStorage.clear()` + `useMindTrailStore.setState({ projects: [], activeProjectId: null })` in `beforeEach`.

## Scope guardrails (v0.1.0)

Out of scope by design — don't add without discussion: undo/redo, search, export, AI, cloud sync, accounts, tags. The core value is "main line clear, branches controlled, current node obvious, nothing lost on refresh." Anything that makes the canvas messier, adds concepts, or weakens persistence should be deferred (see `docs/ROADMAP.md`).

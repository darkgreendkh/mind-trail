# Mind Trail v0.1.0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the v0.1.0 MVP of Mind Trail — a local-first web app for visualizing learning paths with a vertical main line and rightward branches, persisted to localStorage.

**Architecture:** Pure logic (id / storage / tree / layout) lives in `src/lib` and is the TDD target. A single Zustand store (`src/store`) holds all state and exposes every spec action, persisting synchronously to localStorage after each mutation. The UI (`src/features`) is thin: `App` routes between Project Home and Workbench based on `activeProjectId`; the Workbench renders a React Flow canvas, a toolbar, and an inspector that only dispatch store actions.

**Tech Stack:** Vite · React 19 · TypeScript · `@xyflow/react` (React Flow v12) · Zustand 5 · Tailwind CSS v4 · localStorage · Vitest + jsdom · pnpm.

## Global Constraints

- localStorage key is exactly `mind-trail:v0.1.0`; storage `version` field is exactly `"0.1.0"`.
- Node statuses are exactly `"in_progress" | "completed" | "abandoned"`; edge types are exactly `"main" | "branch"`.
- New node default status is `in_progress`. New project default title is `新的学习图`; initial node title is `新的学习节点` at `x=100, y=100`.
- Layout constants: main child `x = parent.x`, `y = parent.y + 180`. Branch child `x = parent.x + 260`, `y = parent.y + 140 * existingBranchCount`.
- All UI copy is Chinese.
- Persistence is synchronous on every mutating action (no debounce).
- Deletion removes the node and all descendants reachable via main/branch edges, plus all edges touching them; never leave orphan nodes or dangling edges.
- After deletion reselect: prefer the deleted node's parent; else any remaining node; if the project is emptied, create a fresh initial node so a project always has ≥1 node.
- No git commits (workspace is not a git repo and commits were not requested). Each task ends by running tests/build as the verification gate.
- Package manager is pnpm. Run all commands from the project root `D:\code_folder\mind-trail`.

---

## File Structure

```
mind-trail/
  package.json            # scripts + deps (deps added via pnpm add)
  vite.config.ts          # react + tailwind plugins + vitest test config
  tsconfig.json           # app TS config
  tsconfig.node.json      # TS config for vite.config.ts
  index.html              # Vite entry
  src/
    main.tsx              # React root render
    App.tsx               # route: activeProjectId ? Workbench : ProjectHome
    index.css             # @import "tailwindcss"
    vite-env.d.ts
    types.ts              # all shared domain types (spec §12)
    lib/
      id.ts               # createId()
      storage.ts          # STORAGE_KEY, load/save, default factories
      tree.ts             # getChildren/getParentId/getDescendants
      layout.ts           # position helpers + autoLayout (approach A)
    store/
      useMindTrailStore.ts # Zustand store: state + all actions + selectors
    features/
      home/
        ProjectHome.tsx
        ConfirmDialog.tsx  # reusable confirm (project delete)
      workbench/
        Workbench.tsx      # wraps ReactFlowProvider; 3-pane layout
        Toolbar.tsx
        Canvas.tsx
        TrailNodeView.tsx  # custom React Flow node
        Inspector.tsx
        useKeyboardShortcuts.ts
  src/test/                # (tests colocated as *.test.ts next to lib/store)
```

---

### Task 1: Project scaffold + tooling

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `tsconfig.node.json`, `index.html`, `.gitignore`
- Create: `src/main.tsx`, `src/App.tsx`, `src/index.css`, `src/vite-env.d.ts`

**Interfaces:**
- Produces: a buildable Vite React+TS app with Tailwind v4 and a working Vitest runner.

- [ ] **Step 1: Verify pnpm is available**

Run: `pnpm --version`
If missing: `corepack enable pnpm` (or `npm i -g pnpm`), then re-run.

- [ ] **Step 2: Write `package.json`** (deps added in step 4, not hand-pinned)

```json
{
  "name": "mind-trail",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc -b --noEmit"
  }
}
```

- [ ] **Step 3: Write config + entry files**

`index.html`:
```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Mind Trail</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`vite.config.ts`:
```ts
/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'jsdom',
  },
})
```

`tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

`tsconfig.node.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2023"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "composite": true,
    "strict": true
  },
  "include": ["vite.config.ts"]
}
```

`.gitignore`:
```
node_modules
dist
*.local
```

`src/vite-env.d.ts`:
```ts
/// <reference types="vite/client" />
```

`src/index.css`:
```css
@import "tailwindcss";

html, body, #root {
  height: 100%;
  margin: 0;
}
```

`src/main.tsx`:
```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

`src/App.tsx` (placeholder, replaced in Task 9):
```tsx
export default function App() {
  return <div className="p-8 text-slate-700">Mind Trail</div>
}
```

- [ ] **Step 4: Install dependencies**

```bash
pnpm add react react-dom @xyflow/react zustand
pnpm add -D vite @vitejs/plugin-react typescript @types/react @types/react-dom tailwindcss @tailwindcss/vite vitest jsdom
```

- [ ] **Step 5: Add a smoke test** `src/lib/smoke.test.ts`

```ts
import { describe, it, expect } from 'vitest'

describe('smoke', () => {
  it('runs vitest', () => {
    expect(1 + 1).toBe(2)
  })
})
```

- [ ] **Step 6: Verify** — build + test both pass

Run: `pnpm run build`
Expected: completes with no TS errors, emits `dist/`.

Run: `pnpm test`
Expected: 1 passing test.

Then delete `src/lib/smoke.test.ts`.

---

### Task 2: Domain types

**Files:**
- Create: `src/types.ts`

**Interfaces:**
- Produces: `NodeStatus`, `EdgeType`, `TrailNode`, `TrailEdge`, `MindTrailProject`, `MindTrailStorage`.

- [ ] **Step 1: Write `src/types.ts`** verbatim from spec §12

```ts
export type NodeStatus = 'in_progress' | 'completed' | 'abandoned'
export type EdgeType = 'main' | 'branch'

export type TrailNode = {
  id: string
  title: string
  status: NodeStatus
  note: string
  x: number
  y: number
}

export type TrailEdge = {
  id: string
  from: string
  to: string
  type: EdgeType
}

export type MindTrailProject = {
  id: string
  title: string
  currentNodeId: string
  nodes: TrailNode[]
  edges: TrailEdge[]
  createdAt: number
  updatedAt: number
}

export type MindTrailStorage = {
  version: '0.1.0'
  activeProjectId: string | null
  projects: MindTrailProject[]
}
```

- [ ] **Step 2: Verify** — `pnpm run typecheck` passes.

---

### Task 3: ID generation

**Files:**
- Create: `src/lib/id.ts`

**Interfaces:**
- Produces: `createId(): string`

- [ ] **Step 1: Write `src/lib/id.ts`**

```ts
export function createId(): string {
  return crypto.randomUUID()
}
```

- [ ] **Step 2: Verify** — `pnpm run typecheck` passes. (Trivial wrapper; no dedicated test.)

---

### Task 4: Storage layer (TDD)

**Files:**
- Create: `src/lib/storage.ts`
- Test: `src/lib/storage.test.ts`

**Interfaces:**
- Consumes: `createId` (Task 3), types (Task 2).
- Produces:
  - `STORAGE_KEY = 'mind-trail:v0.1.0'`
  - `createInitialNode(): TrailNode`
  - `createDefaultProject(): MindTrailProject`
  - `emptyStorage(): MindTrailStorage`
  - `loadStorage(): MindTrailStorage`
  - `saveStorage(storage: MindTrailStorage): void`

- [ ] **Step 1: Write failing test** `src/lib/storage.test.ts`

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import {
  STORAGE_KEY,
  createInitialNode,
  createDefaultProject,
  emptyStorage,
  loadStorage,
  saveStorage,
} from './storage'

beforeEach(() => {
  localStorage.clear()
})

describe('createInitialNode', () => {
  it('defaults to in_progress at (100,100)', () => {
    const node = createInitialNode()
    expect(node.title).toBe('新的学习节点')
    expect(node.status).toBe('in_progress')
    expect(node.note).toBe('')
    expect(node.x).toBe(100)
    expect(node.y).toBe(100)
    expect(node.id).toBeTruthy()
  })
})

describe('createDefaultProject', () => {
  it('has one node, current points to it, no edges', () => {
    const p = createDefaultProject()
    expect(p.title).toBe('新的学习图')
    expect(p.nodes).toHaveLength(1)
    expect(p.edges).toHaveLength(0)
    expect(p.currentNodeId).toBe(p.nodes[0].id)
    expect(p.createdAt).toBeTypeOf('number')
  })
})

describe('loadStorage', () => {
  it('returns empty storage when nothing stored', () => {
    expect(loadStorage()).toEqual(emptyStorage())
  })

  it('returns empty storage when stored JSON is corrupt', () => {
    localStorage.setItem(STORAGE_KEY, '{not json')
    expect(loadStorage()).toEqual(emptyStorage())
  })

  it('round-trips saved storage', () => {
    const storage = emptyStorage()
    const project = createDefaultProject()
    storage.projects.push(project)
    storage.activeProjectId = project.id
    saveStorage(storage)
    expect(loadStorage()).toEqual(storage)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/lib/storage.test.ts`
Expected: FAIL (module not found / exports missing).

- [ ] **Step 3: Implement `src/lib/storage.ts`**

```ts
import type { MindTrailProject, MindTrailStorage, TrailNode } from '../types'
import { createId } from './id'

export const STORAGE_KEY = 'mind-trail:v0.1.0'

export function createInitialNode(): TrailNode {
  return {
    id: createId(),
    title: '新的学习节点',
    status: 'in_progress',
    note: '',
    x: 100,
    y: 100,
  }
}

export function createDefaultProject(): MindTrailProject {
  const node = createInitialNode()
  const now = Date.now()
  return {
    id: createId(),
    title: '新的学习图',
    currentNodeId: node.id,
    nodes: [node],
    edges: [],
    createdAt: now,
    updatedAt: now,
  }
}

export function emptyStorage(): MindTrailStorage {
  return { version: '0.1.0', activeProjectId: null, projects: [] }
}

export function loadStorage(): MindTrailStorage {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return emptyStorage()
    const parsed = JSON.parse(raw) as MindTrailStorage
    if (!parsed || parsed.version !== '0.1.0' || !Array.isArray(parsed.projects)) {
      return emptyStorage()
    }
    return parsed
  } catch {
    return emptyStorage()
  }
}

export function saveStorage(storage: MindTrailStorage): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(storage))
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test src/lib/storage.test.ts`
Expected: PASS.

---

### Task 5: Tree helpers (TDD)

**Files:**
- Create: `src/lib/tree.ts`
- Test: `src/lib/tree.test.ts`

**Interfaces:**
- Consumes: types (Task 2).
- Produces:
  - `getChildren(edges: TrailEdge[], nodeId: string): TrailEdge[]` — edges whose `from === nodeId`, in array order.
  - `getParentId(edges: TrailEdge[], nodeId: string): string | null`
  - `getDescendants(edges: TrailEdge[], rootId: string): string[]` — all node ids reachable from `rootId` via `from→to`, excluding `rootId`.

- [ ] **Step 1: Write failing test** `src/lib/tree.test.ts`

```ts
import { describe, it, expect } from 'vitest'
import { getChildren, getParentId, getDescendants } from './tree'
import type { TrailEdge } from '../types'

// a -> b (main) -> c (main); b -> d (branch)
const edges: TrailEdge[] = [
  { id: 'e1', from: 'a', to: 'b', type: 'main' },
  { id: 'e2', from: 'b', to: 'c', type: 'main' },
  { id: 'e3', from: 'b', to: 'd', type: 'branch' },
]

describe('getChildren', () => {
  it('returns outgoing edges of a node', () => {
    expect(getChildren(edges, 'b').map((e) => e.to)).toEqual(['c', 'd'])
    expect(getChildren(edges, 'c')).toEqual([])
  })
})

describe('getParentId', () => {
  it('returns the parent id or null for a root', () => {
    expect(getParentId(edges, 'c')).toBe('b')
    expect(getParentId(edges, 'b')).toBe('a')
    expect(getParentId(edges, 'a')).toBeNull()
  })
})

describe('getDescendants', () => {
  it('returns all reachable nodes excluding the root', () => {
    expect(getDescendants(edges, 'b').sort()).toEqual(['c', 'd'])
    expect(getDescendants(edges, 'a').sort()).toEqual(['b', 'c', 'd'])
    expect(getDescendants(edges, 'c')).toEqual([])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/lib/tree.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `src/lib/tree.ts`**

```ts
import type { TrailEdge } from '../types'

export function getChildren(edges: TrailEdge[], nodeId: string): TrailEdge[] {
  return edges.filter((e) => e.from === nodeId)
}

export function getParentId(edges: TrailEdge[], nodeId: string): string | null {
  const edge = edges.find((e) => e.to === nodeId)
  return edge ? edge.from : null
}

export function getDescendants(edges: TrailEdge[], rootId: string): string[] {
  const result: string[] = []
  const stack = [rootId]
  const seen = new Set<string>([rootId])
  while (stack.length > 0) {
    const current = stack.pop()!
    for (const edge of edges) {
      if (edge.from === current && !seen.has(edge.to)) {
        seen.add(edge.to)
        result.push(edge.to)
        stack.push(edge.to)
      }
    }
  }
  return result
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test src/lib/tree.test.ts`
Expected: PASS.

---

### Task 6: Layout engine (TDD, approach A)

**Files:**
- Create: `src/lib/layout.ts`
- Test: `src/lib/layout.test.ts`

**Interfaces:**
- Consumes: types (Task 2), `getChildren` (Task 5).
- Produces:
  - constants `ROOT_X=100, ROOT_Y=100, MAIN_DY=180, BRANCH_DX=260, BRANCH_DY=140`
  - `mainChildPosition(parent: { x: number; y: number }): { x: number; y: number }`
  - `branchChildPosition(parent: { x: number; y: number }, existingBranchCount: number): { x: number; y: number }`
  - `autoLayout(nodes: TrailNode[], edges: TrailEdge[]): TrailNode[]` — returns nodes with recomputed `x,y`. Algorithm: roots = nodes with no incoming edge (in array order); place each via a depth-first walk sharing one pixel cursor; a node's children are visited main-first then branch (each in edge insertion order); main children keep the parent's column (x), branch children move one column right (`x + BRANCH_DX`); every placement advances the cursor by `MAIN_DY`, guaranteeing unique positions, main strictly below parent, branch strictly to parent's right.

- [ ] **Step 1: Write failing test** `src/lib/layout.test.ts`

```ts
import { describe, it, expect } from 'vitest'
import { mainChildPosition, branchChildPosition, autoLayout } from './layout'
import type { TrailEdge, TrailNode } from '../types'

const node = (id: string, x = 0, y = 0): TrailNode => ({
  id,
  title: id,
  status: 'in_progress',
  note: '',
  x,
  y,
})

describe('position helpers', () => {
  it('places a main child directly below', () => {
    expect(mainChildPosition({ x: 100, y: 100 })).toEqual({ x: 100, y: 280 })
  })
  it('stacks branch children to the right by index', () => {
    expect(branchChildPosition({ x: 100, y: 100 }, 0)).toEqual({ x: 360, y: 100 })
    expect(branchChildPosition({ x: 100, y: 100 }, 1)).toEqual({ x: 360, y: 240 })
  })
})

describe('autoLayout', () => {
  it('places a single root at (100,100)', () => {
    const [a] = autoLayout([node('a', 5, 5)], [])
    expect({ x: a.x, y: a.y }).toEqual({ x: 100, y: 100 })
  })

  it('keeps a main chain vertical', () => {
    const nodes = [node('a'), node('b'), node('c')]
    const edges: TrailEdge[] = [
      { id: 'e1', from: 'a', to: 'b', type: 'main' },
      { id: 'e2', from: 'b', to: 'c', type: 'main' },
    ]
    const out = autoLayout(nodes, edges)
    const pos = Object.fromEntries(out.map((n) => [n.id, { x: n.x, y: n.y }]))
    expect(pos.a).toEqual({ x: 100, y: 100 })
    expect(pos.b).toEqual({ x: 100, y: 280 })
    expect(pos.c).toEqual({ x: 100, y: 460 })
  })

  it('puts branches to the right, below, and never overlapping', () => {
    const nodes = [node('a'), node('b'), node('c')]
    const edges: TrailEdge[] = [
      { id: 'e1', from: 'a', to: 'b', type: 'branch' },
      { id: 'e2', from: 'a', to: 'c', type: 'branch' },
    ]
    const out = autoLayout(nodes, edges)
    const pos = Object.fromEntries(out.map((n) => [n.id, { x: n.x, y: n.y }]))
    expect(pos.a).toEqual({ x: 100, y: 100 })
    expect(pos.b.x).toBe(360)
    expect(pos.c.x).toBe(360)
    expect(pos.b.y).toBeGreaterThan(pos.a.y)
    expect(pos.c.y).toBeGreaterThan(pos.a.y)
    expect(pos.b.y).not.toBe(pos.c.y)
  })

  it('preserves invariants for a mixed tree', () => {
    const nodes = [node('a'), node('b'), node('c')]
    const edges: TrailEdge[] = [
      { id: 'e1', from: 'a', to: 'b', type: 'main' },
      { id: 'e2', from: 'a', to: 'c', type: 'branch' },
    ]
    const out = autoLayout(nodes, edges)
    const pos = Object.fromEntries(out.map((n) => [n.id, { x: n.x, y: n.y }]))
    // main child shares column, sits below
    expect(pos.b.x).toBe(pos.a.x)
    expect(pos.b.y).toBeGreaterThan(pos.a.y)
    // branch child to the right, below
    expect(pos.c.x).toBe(pos.a.x + 260)
    expect(pos.c.y).toBeGreaterThan(pos.a.y)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/lib/layout.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `src/lib/layout.ts`**

```ts
import type { TrailEdge, TrailNode } from '../types'
import { getChildren } from './tree'

export const ROOT_X = 100
export const ROOT_Y = 100
export const MAIN_DY = 180
export const BRANCH_DX = 260
export const BRANCH_DY = 140

export function mainChildPosition(parent: { x: number; y: number }): { x: number; y: number } {
  return { x: parent.x, y: parent.y + MAIN_DY }
}

export function branchChildPosition(
  parent: { x: number; y: number },
  existingBranchCount: number,
): { x: number; y: number } {
  return { x: parent.x + BRANCH_DX, y: parent.y + BRANCH_DY * existingBranchCount }
}

export function autoLayout(nodes: TrailNode[], edges: TrailEdge[]): TrailNode[] {
  const positions = new Map<string, { x: number; y: number }>()
  const hasParent = new Set(edges.map((e) => e.to))
  const roots = nodes.filter((n) => !hasParent.has(n.id))

  let cursorY = ROOT_Y

  const place = (nodeId: string, col: number) => {
    positions.set(nodeId, { x: ROOT_X + col * BRANCH_DX, y: cursorY })
    cursorY += MAIN_DY
    const children = getChildren(edges, nodeId)
    const mainFirst = [
      ...children.filter((e) => e.type === 'main'),
      ...children.filter((e) => e.type === 'branch'),
    ]
    for (const edge of mainFirst) {
      place(edge.to, edge.type === 'branch' ? col + 1 : col)
    }
  }

  for (const root of roots) place(root.id, 0)

  return nodes.map((n) => {
    const pos = positions.get(n.id)
    return pos ? { ...n, x: pos.x, y: pos.y } : n
  })
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test src/lib/layout.test.ts`
Expected: PASS.

---

### Task 7: Store — project lifecycle (TDD)

**Files:**
- Create: `src/store/useMindTrailStore.ts`
- Test: `src/store/projects.test.ts`

**Interfaces:**
- Consumes: storage factories (Task 4), types.
- Produces (full store typed below; this task implements the project-lifecycle slice + selectors + persistence helper):
  - state: `projects: MindTrailProject[]`, `activeProjectId: string | null`
  - `createProject(): string`
  - `openProject(id: string): void`
  - `closeProject(): void`
  - `deleteProject(id: string): void`
  - `renameProject(id: string, title: string): void`
  - selectors: `selectActiveProject(state): MindTrailProject | null`, `selectCurrentNode(state): TrailNode | null`

- [ ] **Step 1: Write failing test** `src/store/projects.test.ts`

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { useMindTrailStore, selectActiveProject } from './useMindTrailStore'
import { loadStorage } from '../lib/storage'

const reset = () => {
  localStorage.clear()
  useMindTrailStore.setState({ projects: [], activeProjectId: null })
}

beforeEach(reset)

describe('createProject', () => {
  it('adds a default project, makes it active, persists', () => {
    const id = useMindTrailStore.getState().createProject()
    const s = useMindTrailStore.getState()
    expect(s.projects).toHaveLength(1)
    expect(s.activeProjectId).toBe(id)
    expect(selectActiveProject(s)!.nodes).toHaveLength(1)
    expect(loadStorage().activeProjectId).toBe(id)
  })
})

describe('openProject / closeProject', () => {
  it('sets and clears activeProjectId', () => {
    const id = useMindTrailStore.getState().createProject()
    useMindTrailStore.getState().closeProject()
    expect(useMindTrailStore.getState().activeProjectId).toBeNull()
    useMindTrailStore.getState().openProject(id)
    expect(useMindTrailStore.getState().activeProjectId).toBe(id)
  })
})

describe('deleteProject', () => {
  it('removes the project and clears active when it was active', () => {
    const id = useMindTrailStore.getState().createProject()
    useMindTrailStore.getState().deleteProject(id)
    const s = useMindTrailStore.getState()
    expect(s.projects).toHaveLength(0)
    expect(s.activeProjectId).toBeNull()
    expect(loadStorage().projects).toHaveLength(0)
  })
})

describe('renameProject', () => {
  it('updates the title', () => {
    const id = useMindTrailStore.getState().createProject()
    useMindTrailStore.getState().renameProject(id, '学 Agent Loop')
    expect(selectActiveProject(useMindTrailStore.getState())!.title).toBe('学 Agent Loop')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/store/projects.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `src/store/useMindTrailStore.ts`** (full store skeleton + project slice; node actions added in Tasks 8–11 are declared here as part of the type but implemented incrementally — implement them as no-throwing stubs now only if needed for typecheck, otherwise add in later tasks)

> Implementation note: write the whole store in this file. In this task, implement state, persistence helper, selectors, and the five project actions. Node actions (Tasks 8–11) are added to this same file in their tasks. To keep the file compiling between tasks, include the node-action implementations as you reach each task; they are independent functions on the store.

```ts
import { create } from 'zustand'
import type {
  MindTrailProject,
  MindTrailStorage,
  NodeStatus,
  TrailNode,
} from '../types'
import { createId } from '../lib/id'
import {
  createDefaultProject,
  createInitialNode,
  loadStorage,
  saveStorage,
} from '../lib/storage'
import { getDescendants, getParentId } from '../lib/tree'
import {
  autoLayout as computeLayout,
  branchChildPosition,
  mainChildPosition,
} from '../lib/layout'
import { getChildren } from '../lib/tree'

type MindTrailState = {
  projects: MindTrailProject[]
  activeProjectId: string | null
  // project lifecycle
  createProject: () => string
  openProject: (id: string) => void
  closeProject: () => void
  deleteProject: (id: string) => void
  renameProject: (id: string, title: string) => void
  // node actions (active project)
  selectNode: (nodeId: string) => void
  updateNodeTitle: (nodeId: string, title: string) => void
  updateNodeNote: (nodeId: string, note: string) => void
  setNodeStatus: (nodeId: string, status: NodeStatus) => void
  moveNode: (nodeId: string, x: number, y: number) => void
  continueMainLine: () => string | null
  createBranch: () => string | null
  deleteNode: (nodeId: string) => void
  autoLayout: () => void
}

const initial = loadStorage()

function persist(state: MindTrailState): void {
  const storage: MindTrailStorage = {
    version: '0.1.0',
    activeProjectId: state.activeProjectId,
    projects: state.projects,
  }
  saveStorage(storage)
}

export const useMindTrailStore = create<MindTrailState>((set, get) => {
  // Apply an update to the active project, bump updatedAt, persist.
  const updateActive = (updater: (project: MindTrailProject) => MindTrailProject) => {
    const { activeProjectId } = get()
    if (!activeProjectId) return
    set((state) => {
      const projects = state.projects.map((p) =>
        p.id === activeProjectId ? { ...updater(p), updatedAt: Date.now() } : p,
      )
      return { projects }
    })
    persist(get())
  }

  return {
    projects: initial.projects,
    activeProjectId: initial.activeProjectId,

    createProject: () => {
      const project = createDefaultProject()
      set((state) => ({
        projects: [...state.projects, project],
        activeProjectId: project.id,
      }))
      persist(get())
      return project.id
    },

    openProject: (id) => {
      set({ activeProjectId: id })
      persist(get())
    },

    closeProject: () => {
      set({ activeProjectId: null })
      persist(get())
    },

    deleteProject: (id) => {
      set((state) => ({
        projects: state.projects.filter((p) => p.id !== id),
        activeProjectId: state.activeProjectId === id ? null : state.activeProjectId,
      }))
      persist(get())
    },

    renameProject: (id, title) => {
      set((state) => ({
        projects: state.projects.map((p) =>
          p.id === id ? { ...p, title, updatedAt: Date.now() } : p,
        ),
      }))
      persist(get())
    },

    selectNode: (nodeId) => {
      updateActive((p) => ({ ...p, currentNodeId: nodeId }))
    },

    updateNodeTitle: (nodeId, title) => {
      updateActive((p) => ({
        ...p,
        nodes: p.nodes.map((n) => (n.id === nodeId ? { ...n, title } : n)),
      }))
    },

    updateNodeNote: (nodeId, note) => {
      updateActive((p) => ({
        ...p,
        nodes: p.nodes.map((n) => (n.id === nodeId ? { ...n, note } : n)),
      }))
    },

    setNodeStatus: (nodeId, status) => {
      updateActive((p) => ({
        ...p,
        nodes: p.nodes.map((n) => (n.id === nodeId ? { ...n, status } : n)),
      }))
    },

    moveNode: (nodeId, x, y) => {
      updateActive((p) => ({
        ...p,
        nodes: p.nodes.map((n) => (n.id === nodeId ? { ...n, x, y } : n)),
      }))
    },

    continueMainLine: () => {
      const project = selectActiveProject(get())
      if (!project) return null
      const current = project.nodes.find((n) => n.id === project.currentNodeId)
      if (!current) return null
      const node: TrailNode = {
        id: createId(),
        title: '新的学习节点',
        status: 'in_progress',
        note: '',
        ...mainChildPosition(current),
      }
      const edgeId = createId()
      updateActive((p) => ({
        ...p,
        nodes: [...p.nodes, node],
        edges: [...p.edges, { id: edgeId, from: current.id, to: node.id, type: 'main' }],
        currentNodeId: node.id,
      }))
      return node.id
    },

    createBranch: () => {
      const project = selectActiveProject(get())
      if (!project) return null
      const current = project.nodes.find((n) => n.id === project.currentNodeId)
      if (!current) return null
      const branchCount = getChildren(project.edges, current.id).filter(
        (e) => e.type === 'branch',
      ).length
      const node: TrailNode = {
        id: createId(),
        title: '新的学习节点',
        status: 'in_progress',
        note: '',
        ...branchChildPosition(current, branchCount),
      }
      const edgeId = createId()
      updateActive((p) => ({
        ...p,
        nodes: [...p.nodes, node],
        edges: [...p.edges, { id: edgeId, from: current.id, to: node.id, type: 'branch' }],
        currentNodeId: node.id,
      }))
      return node.id
    },

    deleteNode: (nodeId) => {
      updateActive((p) => {
        const toRemove = new Set<string>([nodeId, ...getDescendants(p.edges, nodeId)])
        const parentId = getParentId(p.edges, nodeId)
        let nodes = p.nodes.filter((n) => !toRemove.has(n.id))
        let edges = p.edges.filter((e) => !toRemove.has(e.from) && !toRemove.has(e.to))
        let currentNodeId: string
        if (nodes.length === 0) {
          const fresh = createInitialNode()
          nodes = [fresh]
          edges = []
          currentNodeId = fresh.id
        } else if (parentId && nodes.some((n) => n.id === parentId)) {
          currentNodeId = parentId
        } else {
          currentNodeId = nodes[0].id
        }
        return { ...p, nodes, edges, currentNodeId }
      })
    },

    autoLayout: () => {
      updateActive((p) => ({ ...p, nodes: computeLayout(p.nodes, p.edges) }))
    },
  }
})

export function selectActiveProject(state: MindTrailState): MindTrailProject | null {
  return state.projects.find((p) => p.id === state.activeProjectId) ?? null
}

export function selectCurrentNode(state: MindTrailState): TrailNode | null {
  const project = selectActiveProject(state)
  if (!project) return null
  return project.nodes.find((n) => n.id === project.currentNodeId) ?? null
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test src/store/projects.test.ts`
Expected: PASS.

> Note: the store file above already contains the node actions used by Tasks 8–11. Those tasks add tests proving each behavior; if a test fails, fix the corresponding action here.

---

### Task 8: Store — node editing (TDD)

**Files:**
- Modify: `src/store/useMindTrailStore.ts` (actions already present from Task 7)
- Test: `src/store/node-edit.test.ts`

**Interfaces:**
- Consumes: store (Task 7).
- Produces: verified `selectNode`, `updateNodeTitle`, `updateNodeNote`, `setNodeStatus`, `moveNode`.

- [ ] **Step 1: Write failing test** `src/store/node-edit.test.ts`

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { useMindTrailStore, selectActiveProject, selectCurrentNode } from './useMindTrailStore'
import { loadStorage } from '../lib/storage'

const store = () => useMindTrailStore.getState()
beforeEach(() => {
  localStorage.clear()
  useMindTrailStore.setState({ projects: [], activeProjectId: null })
  store().createProject()
})

const currentId = () => selectActiveProject(store())!.currentNodeId

describe('node editing', () => {
  it('edits title and persists', () => {
    store().updateNodeTitle(currentId(), '学 Prompt 部分')
    expect(selectCurrentNode(store())!.title).toBe('学 Prompt 部分')
    expect(loadStorage().projects[0].nodes[0].title).toBe('学 Prompt 部分')
  })

  it('edits note', () => {
    store().updateNodeNote(currentId(), '记一点东西')
    expect(selectCurrentNode(store())!.note).toBe('记一点东西')
  })

  it('changes status', () => {
    store().setNodeStatus(currentId(), 'completed')
    expect(selectCurrentNode(store())!.status).toBe('completed')
  })

  it('moves a node', () => {
    const id = currentId()
    store().moveNode(id, 420, 360)
    const node = selectActiveProject(store())!.nodes.find((n) => n.id === id)!
    expect({ x: node.x, y: node.y }).toEqual({ x: 420, y: 360 })
  })

  it('selectNode updates currentNodeId', () => {
    const newId = store().continueMainLine()!
    store().selectNode(currentId() === newId ? newId : newId)
    expect(selectActiveProject(store())!.currentNodeId).toBe(newId)
  })
})
```

- [ ] **Step 2: Run test to verify it fails (or passes if Task 7 store is complete)**

Run: `pnpm test src/store/node-edit.test.ts`
Expected: PASS (actions implemented in Task 7). If any fail, fix the action in `useMindTrailStore.ts`.

---

### Task 9: Store — main line & branches (TDD)

**Files:**
- Test: `src/store/grow.test.ts`

**Interfaces:**
- Consumes: store (Task 7).
- Produces: verified `continueMainLine`, `createBranch` (positions, edges, current-node handoff, multi-branch spacing).

- [ ] **Step 1: Write failing test** `src/store/grow.test.ts`

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { useMindTrailStore, selectActiveProject } from './useMindTrailStore'

const store = () => useMindTrailStore.getState()
const project = () => selectActiveProject(store())!

beforeEach(() => {
  localStorage.clear()
  useMindTrailStore.setState({ projects: [], activeProjectId: null })
  store().createProject()
})

describe('continueMainLine', () => {
  it('adds a node below with a main edge and selects it', () => {
    const root = project().currentNodeId
    const newId = store().continueMainLine()!
    const p = project()
    expect(p.nodes).toHaveLength(2)
    expect(p.currentNodeId).toBe(newId)
    const rootNode = p.nodes.find((n) => n.id === root)!
    const newNode = p.nodes.find((n) => n.id === newId)!
    expect(newNode.x).toBe(rootNode.x)
    expect(newNode.y).toBe(rootNode.y + 180)
    expect(p.edges).toContainEqual(
      expect.objectContaining({ from: root, to: newId, type: 'main' }),
    )
  })
})

describe('createBranch', () => {
  it('stacks multiple branches to the right by fixed spacing', () => {
    const root = project().currentNodeId
    const rootNode = project().nodes.find((n) => n.id === root)!
    const b1 = store().createBranch()!
    // re-select root to branch again from the same node
    store().selectNode(root)
    const b2 = store().createBranch()!
    const p = project()
    const n1 = p.nodes.find((n) => n.id === b1)!
    const n2 = p.nodes.find((n) => n.id === b2)!
    expect(n1.x).toBe(rootNode.x + 260)
    expect(n2.x).toBe(rootNode.x + 260)
    expect(n1.y).toBe(rootNode.y)
    expect(n2.y).toBe(rootNode.y + 140)
    expect(p.edges.filter((e) => e.type === 'branch')).toHaveLength(2)
  })
})
```

- [ ] **Step 2: Run test**

Run: `pnpm test src/store/grow.test.ts`
Expected: PASS. Fix `continueMainLine`/`createBranch` in the store if not.

---

### Task 10: Store — subtree deletion (TDD)

**Files:**
- Test: `src/store/delete.test.ts`

**Interfaces:**
- Consumes: store (Task 7).
- Produces: verified `deleteNode` (subtree removal, edge cleanup, reselect rules, empty-project recreation).

- [ ] **Step 1: Write failing test** `src/store/delete.test.ts`

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { useMindTrailStore, selectActiveProject } from './useMindTrailStore'

const store = () => useMindTrailStore.getState()
const project = () => selectActiveProject(store())!

beforeEach(() => {
  localStorage.clear()
  useMindTrailStore.setState({ projects: [], activeProjectId: null })
  store().createProject()
})

describe('deleteNode', () => {
  it('removes a subtree and reselects the parent', () => {
    const root = project().currentNodeId
    const child = store().continueMainLine()! // current = child
    const grandchild = store().continueMainLine()! // current = grandchild
    expect(project().nodes).toHaveLength(3)
    store().deleteNode(child) // removes child + grandchild
    const p = project()
    expect(p.nodes.map((n) => n.id)).toEqual([root])
    expect(p.edges).toHaveLength(0)
    expect(p.currentNodeId).toBe(root)
    void grandchild
  })

  it('recreates a fresh node when the project is emptied', () => {
    const root = project().currentNodeId
    store().deleteNode(root)
    const p = project()
    expect(p.nodes).toHaveLength(1)
    expect(p.nodes[0].id).not.toBe(root)
    expect(p.currentNodeId).toBe(p.nodes[0].id)
    expect(p.edges).toHaveLength(0)
  })
})
```

- [ ] **Step 2: Run test**

Run: `pnpm test src/store/delete.test.ts`
Expected: PASS. Fix `deleteNode` if not.

---

### Task 11: Store — auto layout (TDD) + full suite gate

**Files:**
- Test: `src/store/layout.test.ts`

**Interfaces:**
- Consumes: store (Task 7), layout engine (Task 6).
- Produces: verified `autoLayout` action rewrites positions while preserving structure.

- [ ] **Step 1: Write failing test** `src/store/layout.test.ts`

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { useMindTrailStore, selectActiveProject } from './useMindTrailStore'

const store = () => useMindTrailStore.getState()
const project = () => selectActiveProject(store())!

beforeEach(() => {
  localStorage.clear()
  useMindTrailStore.setState({ projects: [], activeProjectId: null })
  store().createProject()
})

describe('autoLayout action', () => {
  it('re-derives positions: main stays vertical after manual moves', () => {
    const root = project().currentNodeId
    const child = store().continueMainLine()!
    store().moveNode(child, 999, 999)
    store().autoLayout()
    const p = project()
    const rootNode = p.nodes.find((n) => n.id === root)!
    const childNode = p.nodes.find((n) => n.id === child)!
    expect(childNode.x).toBe(rootNode.x)
    expect(childNode.y).toBeGreaterThan(rootNode.y)
  })
})
```

- [ ] **Step 2: Run test**

Run: `pnpm test src/store/layout.test.ts`
Expected: PASS.

- [ ] **Step 3: Full logic suite gate**

Run: `pnpm test`
Expected: all lib + store tests pass. This closes the TDD portion.

---

### Task 12: App routing + Project Home

**Files:**
- Modify: `src/App.tsx`
- Create: `src/features/home/ProjectHome.tsx`, `src/features/home/ConfirmDialog.tsx`

**Interfaces:**
- Consumes: store actions `createProject/openProject/deleteProject`, `projects` state.
- Produces: `App` renders `ProjectHome` when `activeProjectId` is null, else `Workbench`.

- [ ] **Step 1: Write `src/features/home/ConfirmDialog.tsx`**

```tsx
type ConfirmDialogProps = {
  title: string
  message: string
  confirmLabel?: string
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel = '删除',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40">
      <div className="w-[360px] rounded-xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-slate-800">{title}</h2>
        <p className="mt-2 text-sm text-slate-600">{message}</p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            className="rounded-lg px-4 py-2 text-sm text-slate-600 hover:bg-slate-100"
            onClick={onCancel}
          >
            取消
          </button>
          <button
            className="rounded-lg bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700"
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Write `src/features/home/ProjectHome.tsx`**

```tsx
import { useState } from 'react'
import { useMindTrailStore } from '../../store/useMindTrailStore'
import { ConfirmDialog } from './ConfirmDialog'

export function ProjectHome() {
  const projects = useMindTrailStore((s) => s.projects)
  const createProject = useMindTrailStore((s) => s.createProject)
  const openProject = useMindTrailStore((s) => s.openProject)
  const deleteProject = useMindTrailStore((s) => s.deleteProject)
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)

  const sorted = [...projects].sort((a, b) => b.updatedAt - a.updatedAt)
  const pendingTitle = projects.find((p) => p.id === pendingDelete)?.title ?? ''

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Mind Trail</h1>
          <p className="mt-1 text-sm text-slate-500">本地学习路径可视化</p>
        </div>
        <button
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          onClick={() => createProject()}
        >
          新建项目
        </button>
      </header>

      {sorted.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 p-12 text-center text-slate-500">
          还没有学习图。点击「新建项目」开始你的第一条学习路径。
        </div>
      ) : (
        <ul className="space-y-3">
          {sorted.map((p) => (
            <li
              key={p.id}
              className="group flex items-center justify-between rounded-xl border border-slate-200 bg-white px-5 py-4 hover:border-blue-300 hover:shadow-sm"
            >
              <button className="flex-1 text-left" onClick={() => openProject(p.id)}>
                <div className="font-medium text-slate-800">{p.title}</div>
                <div className="mt-1 text-xs text-slate-400">
                  {p.nodes.length} 个节点 · 更新于{' '}
                  {new Date(p.updatedAt).toLocaleString('zh-CN')}
                </div>
              </button>
              <button
                className="ml-4 rounded-lg px-3 py-1.5 text-sm text-slate-400 opacity-0 transition group-hover:opacity-100 hover:bg-red-50 hover:text-red-600"
                onClick={() => setPendingDelete(p.id)}
              >
                删除
              </button>
            </li>
          ))}
        </ul>
      )}

      {pendingDelete && (
        <ConfirmDialog
          title="删除项目"
          message={`确定删除「${pendingTitle}」吗？该操作无法撤销。`}
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => {
            deleteProject(pendingDelete)
            setPendingDelete(null)
          }}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 3: Rewrite `src/App.tsx`**

```tsx
import { useMindTrailStore } from './store/useMindTrailStore'
import { ProjectHome } from './features/home/ProjectHome'
import { Workbench } from './features/workbench/Workbench'

export default function App() {
  const activeProjectId = useMindTrailStore((s) => s.activeProjectId)
  return activeProjectId ? <Workbench /> : <ProjectHome />
}
```

- [ ] **Step 4: Verify** — `pnpm run build` fails only on the missing `Workbench` import until Task 13. Create the Workbench files in Task 13, then build. (Do not run build as a gate here; proceed to Task 13.)

---

### Task 13: Workbench shell + Toolbar

**Files:**
- Create: `src/features/workbench/Workbench.tsx`, `src/features/workbench/Toolbar.tsx`

**Interfaces:**
- Consumes: store selectors/actions, React Flow `ReactFlowProvider`, `useReactFlow`.
- Produces: `Workbench` component wrapping the canvas + inspector in a `ReactFlowProvider`; `Toolbar` with title edit, back, auto-layout, focus-current.

- [ ] **Step 1: Write `src/features/workbench/Toolbar.tsx`**

```tsx
import { useReactFlow } from '@xyflow/react'
import { useMindTrailStore, selectActiveProject, selectCurrentNode } from '../../store/useMindTrailStore'

export function Toolbar() {
  const project = useMindTrailStore(selectActiveProject)
  const renameProject = useMindTrailStore((s) => s.renameProject)
  const closeProject = useMindTrailStore((s) => s.closeProject)
  const autoLayout = useMindTrailStore((s) => s.autoLayout)
  const current = useMindTrailStore(selectCurrentNode)
  const { setCenter } = useReactFlow()

  if (!project) return null

  const focusCurrent = () => {
    if (!current) return
    setCenter(current.x + 100, current.y + 50, { zoom: 1, duration: 400 })
  }

  return (
    <div className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-2">
      <button
        className="rounded-lg px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
        onClick={() => closeProject()}
      >
        ← 项目列表
      </button>
      <input
        className="min-w-0 flex-1 rounded-lg px-2 py-1.5 text-sm font-medium text-slate-800 hover:bg-slate-50 focus:bg-slate-50 focus:outline-none"
        value={project.title}
        onChange={(e) => renameProject(project.id, e.target.value)}
      />
      <button
        className="rounded-lg px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
        onClick={() => autoLayout()}
      >
        自动整理布局
      </button>
      <button
        className="rounded-lg px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
        onClick={focusCurrent}
      >
        回到当前节点
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Write `src/features/workbench/Workbench.tsx`**

```tsx
import { ReactFlowProvider } from '@xyflow/react'
import { Toolbar } from './Toolbar'
import { Canvas } from './Canvas'
import { Inspector } from './Inspector'
import { useKeyboardShortcuts } from './useKeyboardShortcuts'

export function Workbench() {
  useKeyboardShortcuts()
  return (
    <ReactFlowProvider>
      <div className="flex h-screen flex-col">
        <Toolbar />
        <div className="flex min-h-0 flex-1">
          <div className="min-w-0 flex-1">
            <Canvas />
          </div>
          <Inspector />
        </div>
      </div>
    </ReactFlowProvider>
  )
}
```

- [ ] **Step 3: Verify** — build still fails on missing `Canvas`, `Inspector`, `useKeyboardShortcuts`; create them in Tasks 14–16 then build there.

---

### Task 14: Canvas + custom node

**Files:**
- Create: `src/features/workbench/Canvas.tsx`, `src/features/workbench/TrailNodeView.tsx`

**Interfaces:**
- Consumes: store, `@xyflow/react` (`ReactFlow`, `Background`, `Controls`, `useNodesState`, `Handle`, `Position`, types).
- Produces: a React Flow canvas bound to the active project; custom `trail` node with status styling + current badge; drag commits via `moveNode`; click selects via `selectNode`.

- [ ] **Step 1: Write `src/features/workbench/TrailNodeView.tsx`**

```tsx
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react'
import type { NodeStatus } from '../../types'

export type TrailNodeData = {
  title: string
  status: NodeStatus
  isCurrent: boolean
}

export type TrailFlowNode = Node<TrailNodeData, 'trail'>

const statusStyles: Record<NodeStatus, string> = {
  in_progress: 'border-blue-500 bg-white',
  completed: 'border-green-500 bg-green-50',
  abandoned: 'border-slate-300 bg-slate-50 opacity-60',
}

const statusLabel: Record<NodeStatus, string> = {
  in_progress: '进行中',
  completed: '已完成',
  abandoned: '已放弃',
}

export function TrailNodeView({ data, selected }: NodeProps<TrailFlowNode>) {
  return (
    <div
      className={[
        'relative w-[200px] rounded-xl border-2 px-4 py-3 transition',
        statusStyles[data.status],
        data.isCurrent || selected ? 'border-[3px] shadow-lg' : '',
      ].join(' ')}
    >
      <Handle type="target" position={Position.Top} isConnectable={false} />
      {data.isCurrent && (
        <span className="absolute -right-2 -top-2 rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-medium text-white">
          当前
        </span>
      )}
      <div className="truncate text-sm font-medium text-slate-800">
        {data.title || '未命名节点'}
      </div>
      <div className="mt-1 text-[11px] text-slate-400">{statusLabel[data.status]}</div>
      <Handle type="source" position={Position.Bottom} isConnectable={false} />
    </div>
  )
}
```

- [ ] **Step 2: Write `src/features/workbench/Canvas.tsx`**

```tsx
import { useEffect, useMemo } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  useNodesState,
  type Edge,
  type NodeMouseHandler,
  type NodeChange,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useMindTrailStore, selectActiveProject } from '../../store/useMindTrailStore'
import { TrailNodeView, type TrailFlowNode } from './TrailNodeView'

const nodeTypes = { trail: TrailNodeView }

export function Canvas() {
  const project = useMindTrailStore(selectActiveProject)
  const selectNode = useMindTrailStore((s) => s.selectNode)
  const moveNode = useMindTrailStore((s) => s.moveNode)

  const [rfNodes, setRfNodes, onNodesChange] = useNodesState<TrailFlowNode>([])

  const storeNodes = project?.nodes
  const currentNodeId = project?.currentNodeId
  const syncKey = useMemo(
    () =>
      (storeNodes ?? [])
        .map((n) => `${n.id}:${n.x}:${n.y}:${n.title}:${n.status}`)
        .join('|') + `#${currentNodeId}`,
    [storeNodes, currentNodeId],
  )

  useEffect(() => {
    if (!storeNodes) return
    setRfNodes(
      storeNodes.map((n) => ({
        id: n.id,
        type: 'trail' as const,
        position: { x: n.x, y: n.y },
        data: { title: n.title, status: n.status, isCurrent: n.id === currentNodeId },
        selected: n.id === currentNodeId,
      })),
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syncKey])

  const rfEdges = useMemo<Edge[]>(
    () =>
      (project?.edges ?? []).map((e) => ({
        id: e.id,
        source: e.from,
        target: e.to,
        style:
          e.type === 'main'
            ? { strokeWidth: 2.5, stroke: '#334155' }
            : { strokeWidth: 1.25, stroke: '#94a3b8' },
      })),
    [project?.edges],
  )

  const handleNodesChange = (changes: NodeChange<TrailFlowNode>[]) => {
    onNodesChange(changes)
    for (const change of changes) {
      if (change.type === 'position' && change.dragging === false && change.position) {
        moveNode(change.id, change.position.x, change.position.y)
      }
    }
  }

  const onNodeClick: NodeMouseHandler<TrailFlowNode> = (_, node) => selectNode(node.id)

  if (!project) return null

  return (
    <ReactFlow
      nodes={rfNodes}
      edges={rfEdges}
      nodeTypes={nodeTypes}
      onNodesChange={handleNodesChange}
      onNodeClick={onNodeClick}
      fitView
      minZoom={0.2}
      maxZoom={2}
      proOptions={{ hideAttribution: true }}
    >
      <Background gap={20} />
      <Controls showInteractive={false} />
    </ReactFlow>
  )
}
```

- [ ] **Step 3: Verify** — build still needs `Inspector` + `useKeyboardShortcuts` (Tasks 15–16).

---

### Task 15: Inspector

**Files:**
- Create: `src/features/workbench/Inspector.tsx`

**Interfaces:**
- Consumes: store selectors/actions.
- Produces: right panel editing the current node (title, status, note) + actions (继续主线 / 创建支线 / 删除节点).

- [ ] **Step 1: Write `src/features/workbench/Inspector.tsx`**

```tsx
import { useMindTrailStore, selectCurrentNode } from '../../store/useMindTrailStore'
import type { NodeStatus } from '../../types'

const statusOptions: { value: NodeStatus; label: string }[] = [
  { value: 'in_progress', label: '进行中' },
  { value: 'completed', label: '已完成' },
  { value: 'abandoned', label: '已放弃' },
]

export function Inspector() {
  const node = useMindTrailStore(selectCurrentNode)
  const updateNodeTitle = useMindTrailStore((s) => s.updateNodeTitle)
  const updateNodeNote = useMindTrailStore((s) => s.updateNodeNote)
  const setNodeStatus = useMindTrailStore((s) => s.setNodeStatus)
  const continueMainLine = useMindTrailStore((s) => s.continueMainLine)
  const createBranch = useMindTrailStore((s) => s.createBranch)
  const deleteNode = useMindTrailStore((s) => s.deleteNode)

  if (!node) return null

  return (
    <aside className="flex w-[320px] flex-col gap-4 border-l border-slate-200 bg-white p-5">
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-500">节点标题</label>
        <input
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
          value={node.title}
          onChange={(e) => updateNodeTitle(node.id, e.target.value)}
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-500">状态</label>
        <div className="flex gap-2">
          {statusOptions.map((opt) => (
            <button
              key={opt.value}
              className={[
                'flex-1 rounded-lg border px-2 py-1.5 text-xs',
                node.status === opt.value
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-slate-200 text-slate-500 hover:bg-slate-50',
              ].join(' ')}
              onClick={() => setNodeStatus(node.id, opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1">
        <label className="mb-1 block text-xs font-medium text-slate-500">笔记</label>
        <textarea
          className="h-32 w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
          value={node.note}
          placeholder="简短记录这个学习点…"
          onChange={(e) => updateNodeNote(node.id, e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-2">
        <button
          className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
          onClick={() => continueMainLine()}
        >
          继续主线 (Enter)
        </button>
        <button
          className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100"
          onClick={() => createBranch()}
        >
          创建支线 (Tab)
        </button>
        <button
          className="rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50"
          onClick={() => deleteNode(node.id)}
        >
          删除节点 (Delete)
        </button>
      </div>
    </aside>
  )
}
```

- [ ] **Step 2: Verify** — build still needs `useKeyboardShortcuts` (Task 16).

---

### Task 16: Keyboard shortcuts

**Files:**
- Create: `src/features/workbench/useKeyboardShortcuts.ts`

**Interfaces:**
- Consumes: store actions + current node.
- Produces: `useKeyboardShortcuts()` hook binding Enter/Tab/Delete, ignoring events while typing in inputs/textareas.

- [ ] **Step 1: Write `src/features/workbench/useKeyboardShortcuts.ts`**

```ts
import { useEffect } from 'react'
import { useMindTrailStore, selectCurrentNode } from '../../store/useMindTrailStore'

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable
}

export function useKeyboardShortcuts() {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return
      const state = useMindTrailStore.getState()
      const current = selectCurrentNode(state)
      if (!current) return

      if (e.key === 'Enter') {
        e.preventDefault()
        state.continueMainLine()
      } else if (e.key === 'Tab') {
        e.preventDefault()
        state.createBranch()
      } else if (e.key === 'Delete') {
        e.preventDefault()
        state.deleteNode(current.id)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
}
```

- [ ] **Step 2: Verify build + tests**

Run: `pnpm run build`
Expected: typechecks and builds, emits `dist/`.

Run: `pnpm test`
Expected: all logic/store tests pass.

---

### Task 17: Manual acceptance pass

**Files:** none (verification only).

- [ ] **Step 1: Start dev server**

Run: `pnpm dev` (background). Open the printed URL.

- [ ] **Step 2: Walk the spec §15 acceptance checklist**

Confirm each, fixing the responsible component/action if any fails:
1. First open with no projects → Project Home shown.
2. Create project → enters Workbench with one initial node.
3. Click a node → Inspector shows its fields.
4. Edit title + note → reflected on the node, survives refresh.
5. Change status across all three values → node restyles.
6. 继续主线 → new node below + main edge; becomes current.
7. 创建支线 → new node to the right + branch edge; multiple branches stack down.
8. Enter / Tab / Delete trigger their actions (and do NOT fire while typing in title/note).
9. Delete a node → descendants removed, no dangling edges; parent reselected.
10. 自动整理布局 → main stays vertical, branches stay right.
11. 回到当前节点 → recenters on current node.
12. ← 项目列表 → returns to Project Home.
13. Delete project → confirm dialog, then removed.
14. Refresh → projects/nodes/edges/status/notes/positions all restored; reopens last project.

- [ ] **Step 3: Stop dev server.** v0.1.0 is complete.

---

## Self-Review

**Spec coverage (§14 feature list → task):**
- Project Home / new / open / delete / default-open-last → Tasks 7, 12 (default-open-last is automatic: `activeProjectId` persists and `App` routes on it).
- Return to Project Home → Task 13 (Toolbar `closeProject`).
- Initial node, select, edit title/note, status → Tasks 4, 7, 8, 12, 15.
- Continue main / create branch → Tasks 9, 15.
- Delete subtree → Tasks 10, 15.
- Auto layout → Tasks 6, 11, 13.
- Focus current → Task 13.
- localStorage autosave + restore → Tasks 4, 7 (every action persists; store seeds from `loadStorage`).
- Zoom/pan, drag, current highlight → Task 14.
- Enter/Tab/Delete → Task 16.

**Placeholder scan:** none — every code step contains full content.

**Type consistency:** store action names used by UI (`continueMainLine`, `createBranch`, `deleteNode`, `selectNode`, `moveNode`, `setNodeStatus`, `updateNodeTitle`, `updateNodeNote`, `autoLayout`, `renameProject`, `closeProject`, `openProject`, `createProject`, `deleteProject`) match the `MindTrailState` type in Task 7. Selectors `selectActiveProject` / `selectCurrentNode` are consumed consistently. Custom node data type `TrailNodeData` and `TrailFlowNode` are shared between `TrailNodeView` and `Canvas`.

**Decisions captured:** synchronous persistence (no debounce); column = branch-depth layout with shared pixel cursor (approach A); single source/target handle per node (branch direction conveyed by node position, not handle side); no node-delete confirmation (only project delete confirms, per spec); no git commits.

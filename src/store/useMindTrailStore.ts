import { create } from 'zustand'
import type {
  MindTrailProject,
  MindTrailStorage,
  NodeStatus,
  TrailEdge,
  TrailNode,
} from '../types'
import { createId } from '../lib/id'
import {
  createDefaultProject,
  createInitialNode,
  loadStorage,
  saveStorage,
} from '../lib/storage'
import { getChildren, getDescendants, getParentId } from '../lib/tree'
import {
  autoLayout as computeLayout,
  branchChildPosition,
  mainChildPosition,
} from '../lib/layout'

// One undo step: the canvas state of a single project. We snapshot only the
// fields the canvas/node actions touch (not the title), so undo never reverts a
// project rename or disturbs other projects. History is session-only — it is not
// part of the persisted storage shape, so a refresh starts with an empty stack.
type Snapshot = {
  projectId: string
  nodes: TrailNode[]
  edges: TrailEdge[]
  currentNodeId: string
}

const HISTORY_LIMIT = 50

type MindTrailState = {
  projects: MindTrailProject[]
  activeProjectId: string | null
  // undo/redo history (session-only, not persisted)
  past: Snapshot[]
  future: Snapshot[]
  historyTag: string | null
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
  undo: () => void
  redo: () => void
}

const clearedHistory: Pick<MindTrailState, 'past' | 'future' | 'historyTag'> = {
  past: [],
  future: [],
  historyTag: null,
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

  // Record the active project's current canvas as one undo step. Call this
  // *before* a mutating canvas action. `tag` coalesces a burst of same-kind
  // edits (e.g. typing a title) into a single step: a repeated non-null tag is
  // skipped, while `null` always pushes a discrete step. Doing anything new also
  // drops the redo stack. Relies on the actions' immutable updates — the old
  // arrays we capture here are never mutated in place.
  const pushHistory = (tag: string | null) => {
    const s = get()
    const project = s.projects.find((p) => p.id === s.activeProjectId)
    if (!project) return
    if (tag !== null && tag === s.historyTag) return
    const snap: Snapshot = {
      projectId: project.id,
      nodes: project.nodes,
      edges: project.edges,
      currentNodeId: project.currentNodeId,
    }
    set({ past: [...s.past, snap].slice(-HISTORY_LIMIT), future: [], historyTag: tag })
  }

  // Restore a snapshot onto its project, pushing the displaced state onto the
  // opposite stack. Shared by undo (past→future) and redo (future→past).
  const applySnapshot = (snap: Snapshot, toFuture: boolean) => {
    set((state) => {
      const project = state.projects.find((p) => p.id === snap.projectId)
      if (!project) return {}
      const displaced: Snapshot = {
        projectId: project.id,
        nodes: project.nodes,
        edges: project.edges,
        currentNodeId: project.currentNodeId,
      }
      const projects = state.projects.map((p) =>
        p.id === snap.projectId
          ? {
              ...p,
              nodes: snap.nodes,
              edges: snap.edges,
              currentNodeId: snap.currentNodeId,
              updatedAt: Date.now(),
            }
          : p,
      )
      return toFuture
        ? { projects, past: state.past.slice(0, -1), future: [displaced, ...state.future].slice(0, HISTORY_LIMIT), historyTag: null }
        : { projects, past: [...state.past, displaced].slice(-HISTORY_LIMIT), future: state.future.slice(1), historyTag: null }
    })
    persist(get())
  }

  return {
    projects: initial.projects,
    activeProjectId: initial.activeProjectId,
    past: [],
    future: [],
    historyTag: null,

    createProject: () => {
      const project = createDefaultProject()
      set((state) => ({
        projects: [...state.projects, project],
        activeProjectId: project.id,
        ...clearedHistory,
      }))
      persist(get())
      return project.id
    },

    openProject: (id) => {
      set({ activeProjectId: id, ...clearedHistory })
      persist(get())
    },

    closeProject: () => {
      set({ activeProjectId: null, ...clearedHistory })
      persist(get())
    },

    deleteProject: (id) => {
      set((state) => ({
        projects: state.projects.filter((p) => p.id !== id),
        activeProjectId: state.activeProjectId === id ? null : state.activeProjectId,
        ...clearedHistory,
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
      pushHistory(`title:${nodeId}`)
      updateActive((p) => ({
        ...p,
        nodes: p.nodes.map((n) => (n.id === nodeId ? { ...n, title } : n)),
      }))
    },

    updateNodeNote: (nodeId, note) => {
      pushHistory(`note:${nodeId}`)
      updateActive((p) => ({
        ...p,
        nodes: p.nodes.map((n) => (n.id === nodeId ? { ...n, note } : n)),
      }))
    },

    setNodeStatus: (nodeId, status) => {
      pushHistory(null)
      updateActive((p) => ({
        ...p,
        nodes: p.nodes.map((n) => (n.id === nodeId ? { ...n, status } : n)),
      }))
    },

    moveNode: (nodeId, x, y) => {
      pushHistory(null)
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
      pushHistory(null)
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
      pushHistory(null)
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
      pushHistory(null)
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
      pushHistory(null)
      updateActive((p) => ({ ...p, nodes: computeLayout(p.nodes, p.edges) }))
    },

    undo: () => {
      const { past } = get()
      if (past.length === 0) return
      applySnapshot(past[past.length - 1], true)
    },

    redo: () => {
      const { future } = get()
      if (future.length === 0) return
      applySnapshot(future[0], false)
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

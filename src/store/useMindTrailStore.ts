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
import { getChildren, getDescendants, getParentId } from '../lib/tree'
import {
  autoLayout as computeLayout,
  branchChildPosition,
  mainChildPosition,
} from '../lib/layout'

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

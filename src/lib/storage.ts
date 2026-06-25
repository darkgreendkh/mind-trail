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

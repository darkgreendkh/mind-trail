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

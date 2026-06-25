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
    store().selectNode(newId)
    expect(selectActiveProject(store())!.currentNodeId).toBe(newId)
  })
})

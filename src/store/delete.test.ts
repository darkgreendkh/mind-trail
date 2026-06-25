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
    const child = store().continueMainLine()!
    const grandchild = store().continueMainLine()!
    expect(project().nodes).toHaveLength(3)
    store().deleteNode(child)
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

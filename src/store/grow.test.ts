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

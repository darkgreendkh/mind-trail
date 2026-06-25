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

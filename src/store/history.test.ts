import { describe, it, expect, beforeEach } from 'vitest'
import { useMindTrailStore, selectActiveProject } from './useMindTrailStore'
import { loadStorage } from '../lib/storage'

const store = () => useMindTrailStore.getState()
const project = () => selectActiveProject(store())!

beforeEach(() => {
  localStorage.clear()
  useMindTrailStore.setState({ projects: [], activeProjectId: null })
  store().createProject()
})

describe('undo / redo', () => {
  it('undoes a delete and brings the subtree back', () => {
    const child = store().continueMainLine()!
    expect(project().nodes).toHaveLength(2)
    store().deleteNode(child)
    expect(project().nodes).toHaveLength(1)

    store().undo()

    const p = project()
    expect(p.nodes).toHaveLength(2)
    expect(p.nodes.some((n) => n.id === child)).toBe(true)
    expect(p.edges).toHaveLength(1)
  })

  it('is a no-op when there is nothing to undo', () => {
    const before = project()
    store().undo()
    expect(project()).toEqual(before)
  })

  it('redoes an undone delete', () => {
    const child = store().continueMainLine()!
    store().deleteNode(child)
    store().undo()
    expect(project().nodes).toHaveLength(2)

    store().redo()
    expect(project().nodes).toHaveLength(1)
  })

  it('clears the redo stack when a new action happens after undo', () => {
    const child = store().continueMainLine()!
    store().deleteNode(child)
    store().undo() // child restored, the delete sits in the redo stack
    store().continueMainLine() // a new action must drop the redo stack
    expect(store().future).toHaveLength(0)

    store().redo() // nothing to redo
    expect(project().nodes).toHaveLength(3) // root + restored child + new node
  })

  it('coalesces consecutive title edits into a single undo step', () => {
    const root = project().currentNodeId
    const original = project().nodes.find((n) => n.id === root)!.title
    store().updateNodeTitle(root, 'a')
    store().updateNodeTitle(root, 'ab')
    store().updateNodeTitle(root, 'abc')
    expect(store().past).toHaveLength(1) // only the pre-burst snapshot

    store().undo()
    expect(project().nodes.find((n) => n.id === root)!.title).toBe(original)
  })

  it('undoes continueMainLine and restores the current node', () => {
    const root = project().currentNodeId
    store().continueMainLine()
    store().undo()
    const p = project()
    expect(p.nodes).toHaveLength(1)
    expect(p.currentNodeId).toBe(root)
  })

  it('persists the restored state so a reload keeps it', () => {
    const child = store().continueMainLine()!
    store().deleteNode(child)
    store().undo()

    const persisted = loadStorage()
    const p = persisted.projects.find((pr) => pr.id === store().activeProjectId)!
    expect(p.nodes).toHaveLength(2)
  })

  it('clears history when switching to a new project', () => {
    store().continueMainLine()
    expect(store().past.length).toBeGreaterThan(0)

    store().createProject()
    expect(store().past).toHaveLength(0)
    expect(store().future).toHaveLength(0)
  })
})

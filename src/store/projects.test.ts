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

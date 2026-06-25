import { describe, it, expect } from 'vitest'
import { getChildren, getParentId, getDescendants } from './tree'
import type { TrailEdge } from '../types'

// a -> b (main) -> c (main); b -> d (branch)
const edges: TrailEdge[] = [
  { id: 'e1', from: 'a', to: 'b', type: 'main' },
  { id: 'e2', from: 'b', to: 'c', type: 'main' },
  { id: 'e3', from: 'b', to: 'd', type: 'branch' },
]

describe('getChildren', () => {
  it('returns outgoing edges of a node', () => {
    expect(getChildren(edges, 'b').map((e) => e.to)).toEqual(['c', 'd'])
    expect(getChildren(edges, 'c')).toEqual([])
  })
})

describe('getParentId', () => {
  it('returns the parent id or null for a root', () => {
    expect(getParentId(edges, 'c')).toBe('b')
    expect(getParentId(edges, 'b')).toBe('a')
    expect(getParentId(edges, 'a')).toBeNull()
  })
})

describe('getDescendants', () => {
  it('returns all reachable nodes excluding the root', () => {
    expect(getDescendants(edges, 'b').sort()).toEqual(['c', 'd'])
    expect(getDescendants(edges, 'a').sort()).toEqual(['b', 'c', 'd'])
    expect(getDescendants(edges, 'c')).toEqual([])
  })
})

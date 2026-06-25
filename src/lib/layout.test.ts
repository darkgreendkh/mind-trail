import { describe, it, expect } from 'vitest'
import { mainChildPosition, branchChildPosition, autoLayout } from './layout'
import type { TrailEdge, TrailNode } from '../types'

const node = (id: string, x = 0, y = 0): TrailNode => ({
  id,
  title: id,
  status: 'in_progress',
  note: '',
  x,
  y,
})

describe('position helpers', () => {
  it('places a main child directly below', () => {
    expect(mainChildPosition({ x: 100, y: 100 })).toEqual({ x: 100, y: 280 })
  })
  it('stacks branch children to the right by index', () => {
    expect(branchChildPosition({ x: 100, y: 100 }, 0)).toEqual({ x: 360, y: 100 })
    expect(branchChildPosition({ x: 100, y: 100 }, 1)).toEqual({ x: 360, y: 240 })
  })
})

describe('autoLayout', () => {
  it('places a single root at (100,100)', () => {
    const [a] = autoLayout([node('a', 5, 5)], [])
    expect({ x: a.x, y: a.y }).toEqual({ x: 100, y: 100 })
  })

  it('keeps a main chain vertical', () => {
    const nodes = [node('a'), node('b'), node('c')]
    const edges: TrailEdge[] = [
      { id: 'e1', from: 'a', to: 'b', type: 'main' },
      { id: 'e2', from: 'b', to: 'c', type: 'main' },
    ]
    const out = autoLayout(nodes, edges)
    const pos = Object.fromEntries(out.map((n) => [n.id, { x: n.x, y: n.y }]))
    expect(pos.a).toEqual({ x: 100, y: 100 })
    expect(pos.b).toEqual({ x: 100, y: 280 })
    expect(pos.c).toEqual({ x: 100, y: 460 })
  })

  it('puts branches to the right, below, and never overlapping', () => {
    const nodes = [node('a'), node('b'), node('c')]
    const edges: TrailEdge[] = [
      { id: 'e1', from: 'a', to: 'b', type: 'branch' },
      { id: 'e2', from: 'a', to: 'c', type: 'branch' },
    ]
    const out = autoLayout(nodes, edges)
    const pos = Object.fromEntries(out.map((n) => [n.id, { x: n.x, y: n.y }]))
    expect(pos.a).toEqual({ x: 100, y: 100 })
    expect(pos.b.x).toBe(360)
    expect(pos.c.x).toBe(360)
    expect(pos.b.y).toBeGreaterThan(pos.a.y)
    expect(pos.c.y).toBeGreaterThan(pos.a.y)
    expect(pos.b.y).not.toBe(pos.c.y)
  })

  it('preserves invariants for a mixed tree', () => {
    const nodes = [node('a'), node('b'), node('c')]
    const edges: TrailEdge[] = [
      { id: 'e1', from: 'a', to: 'b', type: 'main' },
      { id: 'e2', from: 'a', to: 'c', type: 'branch' },
    ]
    const out = autoLayout(nodes, edges)
    const pos = Object.fromEntries(out.map((n) => [n.id, { x: n.x, y: n.y }]))
    expect(pos.b.x).toBe(pos.a.x)
    expect(pos.b.y).toBeGreaterThan(pos.a.y)
    expect(pos.c.x).toBe(pos.a.x + 260)
    expect(pos.c.y).toBeGreaterThan(pos.a.y)
  })
})

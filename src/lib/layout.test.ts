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

  it('puts branches to the right and centers the parent on them', () => {
    const nodes = [node('a'), node('b'), node('c')]
    const edges: TrailEdge[] = [
      { id: 'e1', from: 'a', to: 'b', type: 'branch' },
      { id: 'e2', from: 'a', to: 'c', type: 'branch' },
    ]
    const out = autoLayout(nodes, edges)
    const pos = Object.fromEntries(out.map((n) => [n.id, { x: n.x, y: n.y }]))
    // both branches sit one column to the right, stacked (no overlap)
    expect(pos.b.x).toBe(360)
    expect(pos.c.x).toBe(360)
    expect(pos.b.y).not.toBe(pos.c.y)
    // the parent is vertically centered between its branches
    expect(pos.a.x).toBe(100)
    expect(pos.a.y).toBe((pos.b.y + pos.c.y) / 2)
  })

  it('keeps the main child below and a lone branch level with its parent', () => {
    const nodes = [node('a'), node('b'), node('c')]
    const edges: TrailEdge[] = [
      { id: 'e1', from: 'a', to: 'b', type: 'main' },
      { id: 'e2', from: 'a', to: 'c', type: 'branch' },
    ]
    const out = autoLayout(nodes, edges)
    const pos = Object.fromEntries(out.map((n) => [n.id, { x: n.x, y: n.y }]))
    expect(pos.b.x).toBe(pos.a.x) // main child stays in the same column…
    expect(pos.b.y).toBeGreaterThan(pos.a.y) // …directly below
    expect(pos.c.x).toBe(pos.a.x + 260) // branch goes one column right…
    expect(pos.c.y).toBe(pos.a.y) // …and a single branch is level with its parent
  })

  it('lays out a spine with a centered branch sub-tree', () => {
    const nodes = ['a', 'b', 'c', 'd', 'e', 'f'].map((id) => node(id))
    const edges: TrailEdge[] = [
      { id: 'e1', from: 'a', to: 'b', type: 'main' },
      { id: 'e2', from: 'b', to: 'c', type: 'main' },
      { id: 'e3', from: 'a', to: 'd', type: 'branch' },
      { id: 'e4', from: 'd', to: 'e', type: 'branch' },
      { id: 'e5', from: 'd', to: 'f', type: 'branch' },
    ]
    const pos = Object.fromEntries(
      autoLayout(nodes, edges).map((n) => [n.id, { x: n.x, y: n.y }]),
    )
    // spine in column 0, straight down
    expect(pos.a.x).toBe(100)
    expect(pos.b).toEqual({ x: 100, y: pos.a.y + 180 })
    expect(pos.c).toEqual({ x: 100, y: pos.a.y + 360 })
    // d one column right, centered on a (its only branch parent)
    expect(pos.d).toEqual({ x: 360, y: pos.a.y })
    // e, f two columns right, straddling d without overlapping
    expect(pos.e.x).toBe(620)
    expect(pos.f.x).toBe(620)
    expect(pos.e.y).not.toBe(pos.f.y)
    expect(pos.d.y).toBe((pos.e.y + pos.f.y) / 2)
  })
})

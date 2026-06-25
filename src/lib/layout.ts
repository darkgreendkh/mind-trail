import type { TrailEdge, TrailNode } from '../types'
import { getChildren } from './tree'

export const ROOT_X = 100
export const ROOT_Y = 100
export const MAIN_DY = 180
export const BRANCH_DX = 260
export const BRANCH_DY = 140

export function mainChildPosition(parent: { x: number; y: number }): { x: number; y: number } {
  return { x: parent.x, y: parent.y + MAIN_DY }
}

export function branchChildPosition(
  parent: { x: number; y: number },
  existingBranchCount: number,
): { x: number; y: number } {
  return { x: parent.x + BRANCH_DX, y: parent.y + BRANCH_DY * existingBranchCount }
}

export function autoLayout(nodes: TrailNode[], edges: TrailEdge[]): TrailNode[] {
  const positions = new Map<string, { x: number; y: number }>()
  const hasParent = new Set(edges.map((e) => e.to))
  const roots = nodes.filter((n) => !hasParent.has(n.id))

  let cursorY = ROOT_Y

  const place = (nodeId: string, col: number) => {
    positions.set(nodeId, { x: ROOT_X + col * BRANCH_DX, y: cursorY })
    cursorY += MAIN_DY
    const children = getChildren(edges, nodeId)
    const mainFirst = [
      ...children.filter((e) => e.type === 'main'),
      ...children.filter((e) => e.type === 'branch'),
    ]
    for (const edge of mainFirst) {
      place(edge.to, edge.type === 'branch' ? col + 1 : col)
    }
  }

  for (const root of roots) place(root.id, 0)

  return nodes.map((n) => {
    const pos = positions.get(n.id)
    return pos ? { ...n, x: pos.x, y: pos.y } : n
  })
}

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

  // Next free Y per column. The column is the branch-depth from a root.
  const freeY = new Map<number, number>()
  const nextFreeY = (col: number) => freeY.get(col) ?? ROOT_Y

  // Place a node's subtree and return the Y it was given. Branch children go one
  // column to the right and the node is vertically centered on them; main
  // children continue straight down in the same column. The per-column cursor
  // stops separate sub-trees from overlapping.
  const place = (nodeId: string, col: number): number => {
    const children = getChildren(edges, nodeId)
    const branchKids = children.filter((e) => e.type === 'branch')
    const mainKids = children.filter((e) => e.type === 'main')

    const branchYs = branchKids.map((e) => place(e.to, col + 1))
    const centered =
      branchYs.length > 0
        ? (branchYs[0] + branchYs[branchYs.length - 1]) / 2
        : nextFreeY(col)
    const y = Math.max(centered, nextFreeY(col))

    positions.set(nodeId, { x: ROOT_X + col * BRANCH_DX, y })
    freeY.set(col, y + MAIN_DY)

    for (const edge of mainKids) place(edge.to, col)

    return y
  }

  for (const root of roots) place(root.id, 0)

  return nodes.map((n) => {
    const pos = positions.get(n.id)
    return pos ? { ...n, x: pos.x, y: pos.y } : n
  })
}

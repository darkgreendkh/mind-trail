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

  // Next free Y per column. The column is the branch-depth from a root; the
  // cursor stops separate sub-trees from overlapping within a column.
  const freeY = new Map<number, number>()
  const nextFreeY = (col: number) => freeY.get(col) ?? ROOT_Y

  // Place a node's subtree and return the Y it was given. `topY` is the lowest Y
  // this node may take; it is propagated down the main spine so a branch follows
  // its parent's row instead of floating up to a free slot one column over (the
  // 图一 bug). Branch children stack to the right starting at that row and the
  // node is centered on them; the main child continues straight down a row below.
  const place = (nodeId: string, col: number, topY: number): number => {
    const start = Math.max(topY, nextFreeY(col))
    const children = getChildren(edges, nodeId)
    const branchKids = children.filter((e) => e.type === 'branch')
    const mainKids = children.filter((e) => e.type === 'main')

    const branchYs: number[] = []
    let childTop = start
    for (const edge of branchKids) {
      branchYs.push(place(edge.to, col + 1, childTop))
      childTop = nextFreeY(col + 1)
    }
    const centered =
      branchYs.length > 0 ? (branchYs[0] + branchYs[branchYs.length - 1]) / 2 : start
    const y = Math.max(centered, start)

    positions.set(nodeId, { x: ROOT_X + col * BRANCH_DX, y })
    freeY.set(col, Math.max(nextFreeY(col), y + MAIN_DY))

    for (const edge of mainKids) place(edge.to, col, y + MAIN_DY)

    return y
  }

  for (const root of roots) place(root.id, 0, ROOT_Y)

  return nodes.map((n) => {
    const pos = positions.get(n.id)
    return pos ? { ...n, x: pos.x, y: pos.y } : n
  })
}

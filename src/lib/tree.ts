import type { TrailEdge } from '../types'

export function getChildren(edges: TrailEdge[], nodeId: string): TrailEdge[] {
  return edges.filter((e) => e.from === nodeId)
}

export function getParentId(edges: TrailEdge[], nodeId: string): string | null {
  const edge = edges.find((e) => e.to === nodeId)
  return edge ? edge.from : null
}

export function getDescendants(edges: TrailEdge[], rootId: string): string[] {
  const result: string[] = []
  const stack = [rootId]
  const seen = new Set<string>([rootId])
  while (stack.length > 0) {
    const current = stack.pop()!
    for (const edge of edges) {
      if (edge.from === current && !seen.has(edge.to)) {
        seen.add(edge.to)
        result.push(edge.to)
        stack.push(edge.to)
      }
    }
  }
  return result
}

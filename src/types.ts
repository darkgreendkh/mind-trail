export type NodeStatus = 'in_progress' | 'completed' | 'abandoned'
export type EdgeType = 'main' | 'branch'

export type TrailNode = {
  id: string
  title: string
  status: NodeStatus
  note: string
  x: number
  y: number
}

export type TrailEdge = {
  id: string
  from: string
  to: string
  type: EdgeType
}

export type MindTrailProject = {
  id: string
  title: string
  currentNodeId: string
  nodes: TrailNode[]
  edges: TrailEdge[]
  createdAt: number
  updatedAt: number
}

export type MindTrailStorage = {
  version: '0.1.0'
  activeProjectId: string | null
  projects: MindTrailProject[]
}

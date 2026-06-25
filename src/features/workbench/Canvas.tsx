import { useEffect, useMemo } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  useNodesState,
  type Edge,
  type NodeMouseHandler,
  type NodeChange,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useMindTrailStore, selectActiveProject } from '../../store/useMindTrailStore'
import { TrailNodeView, type TrailFlowNode } from './TrailNodeView'

const nodeTypes = { trail: TrailNodeView }

export function Canvas() {
  const project = useMindTrailStore(selectActiveProject)
  const selectNode = useMindTrailStore((s) => s.selectNode)
  const moveNode = useMindTrailStore((s) => s.moveNode)

  const [rfNodes, setRfNodes, onNodesChange] = useNodesState<TrailFlowNode>([])

  const storeNodes = project?.nodes
  const currentNodeId = project?.currentNodeId
  const syncKey = useMemo(
    () =>
      (storeNodes ?? [])
        .map((n) => `${n.id}:${n.x}:${n.y}:${n.title}:${n.status}`)
        .join('|') + `#${currentNodeId}`,
    [storeNodes, currentNodeId],
  )

  useEffect(() => {
    if (!storeNodes) return
    setRfNodes(
      storeNodes.map((n) => ({
        id: n.id,
        type: 'trail' as const,
        position: { x: n.x, y: n.y },
        data: { title: n.title, status: n.status, isCurrent: n.id === currentNodeId },
        selected: n.id === currentNodeId,
      })),
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syncKey])

  const rfEdges = useMemo<Edge[]>(
    () =>
      (project?.edges ?? []).map((e) => ({
        id: e.id,
        source: e.from,
        target: e.to,
        style:
          e.type === 'main'
            ? { strokeWidth: 2.5, stroke: '#334155' }
            : { strokeWidth: 1.25, stroke: '#94a3b8' },
      })),
    [project?.edges],
  )

  const handleNodesChange = (changes: NodeChange<TrailFlowNode>[]) => {
    onNodesChange(changes)
    for (const change of changes) {
      if (change.type === 'position' && change.dragging === false && change.position) {
        moveNode(change.id, change.position.x, change.position.y)
      }
    }
  }

  const onNodeClick: NodeMouseHandler<TrailFlowNode> = (_, node) => selectNode(node.id)

  if (!project) return null

  return (
    <ReactFlow
      nodes={rfNodes}
      edges={rfEdges}
      nodeTypes={nodeTypes}
      onNodesChange={handleNodesChange}
      onNodeClick={onNodeClick}
      colorMode="light"
      fitView
      minZoom={0.2}
      maxZoom={2}
      proOptions={{ hideAttribution: true }}
    >
      <Background gap={20} />
      <Controls showInteractive={false} />
    </ReactFlow>
  )
}

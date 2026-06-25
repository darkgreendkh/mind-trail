import { useEffect, useMemo } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  useNodesState,
  useUpdateNodeInternals,
  MarkerType,
  type Edge,
  type NodeMouseHandler,
  type OnNodeDrag,
  type NodeChange,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useMindTrailStore, selectActiveProject } from '../../store/useMindTrailStore'
import { TrailNodeView, type TrailFlowNode } from './TrailNodeView'
import type { TrailNode } from '../../types'

const nodeTypes = { trail: TrailNodeView }

// React Flow swallows a node click when the pointer jitters during the press:
// `nodeClickDistance` defaults to 0 (any movement > 0px suppresses the click)
// while `nodeDragThreshold` defaults to 1 (a drag only starts past 1px). A ~1px
// micro-move therefore fires *neither* onNodeClick nor onNodeDragStart, so the
// node never becomes current and the click feels lost. Setting the click slop
// equal to the drag threshold closes that gap: movement up to this many pixels
// counts as a click (the node does not move), and only beyond it starts a drag.
const NODE_CLICK_SLOP = 4

function toRfNodes(nodes: TrailNode[], currentNodeId: string | undefined): TrailFlowNode[] {
  return nodes.map((n) => ({
    id: n.id,
    type: 'trail',
    position: { x: n.x, y: n.y },
    data: { title: n.title, status: n.status, isCurrent: n.id === currentNodeId },
    selected: n.id === currentNodeId,
  }))
}

export function Canvas() {
  const project = useMindTrailStore(selectActiveProject)
  const selectNode = useMindTrailStore((s) => s.selectNode)
  const moveNode = useMindTrailStore((s) => s.moveNode)
  const updateNodeInternals = useUpdateNodeInternals()

  const storeNodes = project?.nodes
  const currentNodeId = project?.currentNodeId

  // Seed from the store so nodes exist on the first render. RF stays a pure
  // render layer; the store remains authoritative.
  const [rfNodes, setRfNodes, onNodesChange] = useNodesState<TrailFlowNode>(
    toRfNodes(storeNodes ?? [], currentNodeId),
  )

  const syncKey = useMemo(
    () =>
      (storeNodes ?? [])
        .map((n) => `${n.id}:${n.x}:${n.y}:${n.title}:${n.status}`)
        .join('|') + `#${currentNodeId}`,
    [storeNodes, currentNodeId],
  )

  // Sync RF nodes from the store, but preserve the dimensions/handle bounds RF
  // has measured onto each node. Rebuilding nodes from scratch wipes `measured`,
  // and edges that target a specific handle then can't be resolved and get
  // dropped (#008) — which would make them flicker out on every interaction.
  useEffect(() => {
    setRfNodes((prev) => {
      const prevById = new Map(prev.map((p) => [p.id, p]))
      return (storeNodes ?? []).map((n) => ({
        ...prevById.get(n.id),
        id: n.id,
        type: 'trail' as const,
        position: { x: n.x, y: n.y },
        data: { title: n.title, status: n.status, isCurrent: n.id === currentNodeId },
        selected: n.id === currentNodeId,
      }))
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syncKey])

  // When the set of nodes changes, ask RF to (re)measure their handle bounds so
  // per-handle edges resolve (main: bottom→top, branch: right→left). Keyed on
  // the rendered node ids so it fires when nodes are added/removed, not on drag.
  const renderedIdsKey = rfNodes.map((n) => n.id).join(',')
  useEffect(() => {
    if (rfNodes.length > 0) updateNodeInternals(rfNodes.map((n) => n.id))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [renderedIdsKey])

  const rfEdges = useMemo<Edge[]>(
    () =>
      (project?.edges ?? []).map((e) => {
        const isMain = e.type === 'main'
        const color = isMain ? '#334155' : '#94a3b8'
        return {
          id: e.id,
          source: e.from,
          target: e.to,
          sourceHandle: isMain ? 'bottom' : 'right',
          targetHandle: isMain ? 'top' : 'left',
          style: { strokeWidth: isMain ? 2.5 : 1.5, stroke: color },
          markerEnd: { type: MarkerType.ArrowClosed, width: 18, height: 18, color },
        }
      }),
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
  // Grabbing a node (a deliberate drag past the slop) also focuses it. Click and
  // drag-start fire on mutually exclusive movement ranges, so selectNode runs once.
  const onNodeDragStart: OnNodeDrag<TrailFlowNode> = (_, node) => selectNode(node.id)

  if (!project) return null

  return (
    <ReactFlow
      nodes={rfNodes}
      edges={rfEdges}
      nodeTypes={nodeTypes}
      onNodesChange={handleNodesChange}
      onNodeClick={onNodeClick}
      onNodeDragStart={onNodeDragStart}
      nodeClickDistance={NODE_CLICK_SLOP}
      nodeDragThreshold={NODE_CLICK_SLOP}
      deleteKeyCode={null}
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

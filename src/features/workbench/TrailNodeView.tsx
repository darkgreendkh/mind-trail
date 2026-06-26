import { useState } from 'react'
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react'
import { useMindTrailStore } from '../../store/useMindTrailStore'
import type { NodeStatus } from '../../types'

export type TrailNodeData = {
  title: string
  status: NodeStatus
  isCurrent: boolean
}

export type TrailFlowNode = Node<TrailNodeData, 'trail'>

const statusConfig: Record<NodeStatus, {
  bg: string; border: string; text: string
  dot: string; dotHollow: boolean; shadow?: string; opacity?: number
}> = {
  in_progress: {
    bg: '#e2ebe0', border: '#d4dece', text: '#5a6856',
    dot: '#6f9070', dotHollow: true,
    shadow: '0 3px 12px rgba(74,97,74,.09)',
  },
  completed: {
    bg: '#c8dcc0', border: '#b8d0ae', text: '#3e5c3a',
    dot: '#3f5e48', dotHollow: false,
  },
  abandoned: {
    bg: '#e9e4d9', border: '#ddd6c8', text: '#a59c8e',
    dot: '#c2bbac', dotHollow: false, opacity: 0.72,
  },
}

const statusLabel: Record<NodeStatus, string> = {
  in_progress: '进行中',
  completed: '已完成',
  abandoned: '已放弃',
}

export function TrailNodeView({ id, data }: NodeProps<TrailFlowNode>) {
  const updateNodeTitle = useMindTrailStore((s) => s.updateNodeTitle)
  const [editing, setEditing] = useState(false)
  const cfg = statusConfig[data.status]

  const nodeStyle: React.CSSProperties = data.isCurrent
    ? {
        backgroundColor: '#fffdf8',
        borderColor: '#5f7d63',
        borderWidth: 2,
        borderStyle: 'solid',
        boxShadow: '0 0 0 5px rgba(95,125,99,.13)',
      }
    : {
        backgroundColor: cfg.bg,
        borderColor: cfg.border,
        borderWidth: 2,
        borderStyle: 'solid',
        boxShadow: cfg.shadow,
        opacity: cfg.opacity,
      }

  const dotStyle: React.CSSProperties = {
    width: 9,
    height: 9,
    borderRadius: '50%',
    flexShrink: 0,
    position: 'relative',
    top: 1,
    ...(cfg.dotHollow
      ? { border: `2px solid ${cfg.dot}`, backgroundColor: 'transparent' }
      : { backgroundColor: cfg.dot }),
  }

  return (
    <div
      className="relative w-[200px] rounded-xl px-4 py-3"
      style={nodeStyle}
      onDoubleClick={(e) => {
        e.stopPropagation()
        setEditing(true)
      }}
    >
      <Handle id="top" type="target" position={Position.Top} isConnectable={false} />
      <Handle id="left" type="target" position={Position.Left} isConnectable={false} />
      {data.isCurrent && (
        <span
          className="absolute -right-2 -top-2 rounded-full px-2 py-0.5 text-[10px] font-medium text-white"
          style={{ backgroundColor: '#5f7d63' }}
        >
          当前
        </span>
      )}
      {/* Dot sits on the title row only, so it centers on the title line (not the
          whole title+status block). The status line below is indented to line up
          under the title text (dot 9px + gap 10px). */}
      <div className="flex items-center gap-2.5">
        <span style={dotStyle} />
        <div className="min-w-0 flex-1">
          {editing ? (
            <input
              autoFocus
              className="nodrag w-full rounded border px-1 py-0.5 font-medium focus:outline-none"
              style={{
                fontSize: 15,
                color: cfg.text,
                borderColor: '#5f7d63',
                backgroundColor: '#fffdf9',
              }}
              value={data.title}
              onChange={(e) => updateNodeTitle(id, e.target.value)}
              onBlur={() => setEditing(false)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === 'Escape') {
                  e.preventDefault()
                  setEditing(false)
                }
                e.stopPropagation()
              }}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <div
              className="truncate font-medium"
              style={{ fontSize: 15, color: cfg.text }}
            >
              {data.title || '未命名节点'}
            </div>
          )}
        </div>
      </div>
      <div
        className="truncate"
        style={{ fontSize: 12, color: cfg.text, marginTop: 2, marginLeft: 19 }}
      >
        {statusLabel[data.status]}
      </div>
      <Handle id="bottom" type="source" position={Position.Bottom} isConnectable={false} />
      <Handle id="right" type="source" position={Position.Right} isConnectable={false} />
    </div>
  )
}

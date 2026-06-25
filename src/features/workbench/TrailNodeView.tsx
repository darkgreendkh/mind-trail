import { Handle, Position, type NodeProps, type Node } from '@xyflow/react'
import type { NodeStatus } from '../../types'

export type TrailNodeData = {
  title: string
  status: NodeStatus
  isCurrent: boolean
}

export type TrailFlowNode = Node<TrailNodeData, 'trail'>

const statusStyles: Record<NodeStatus, string> = {
  in_progress: 'border-blue-500 bg-white',
  completed: 'border-green-500 bg-green-50',
  abandoned: 'border-slate-300 bg-slate-50 opacity-60',
}

const statusLabel: Record<NodeStatus, string> = {
  in_progress: '进行中',
  completed: '已完成',
  abandoned: '已放弃',
}

export function TrailNodeView({ data, selected }: NodeProps<TrailFlowNode>) {
  return (
    <div
      className={[
        'relative w-[200px] rounded-xl border-2 px-4 py-3 transition',
        statusStyles[data.status],
        data.isCurrent || selected ? 'border-[3px] shadow-lg' : '',
      ].join(' ')}
    >
      <Handle type="target" position={Position.Top} isConnectable={false} />
      {data.isCurrent && (
        <span className="absolute -right-2 -top-2 rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-medium text-white">
          当前
        </span>
      )}
      <div className="truncate text-sm font-medium text-slate-800">
        {data.title || '未命名节点'}
      </div>
      <div className="mt-1 text-[11px] text-slate-400">{statusLabel[data.status]}</div>
      <Handle type="source" position={Position.Bottom} isConnectable={false} />
    </div>
  )
}

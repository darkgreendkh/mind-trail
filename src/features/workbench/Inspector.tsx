import { useMindTrailStore, selectCurrentNode } from '../../store/useMindTrailStore'
import type { NodeStatus } from '../../types'

const statusOptions: { value: NodeStatus; label: string }[] = [
  { value: 'in_progress', label: '进行中' },
  { value: 'completed', label: '已完成' },
  { value: 'abandoned', label: '已放弃' },
]

export function Inspector() {
  const node = useMindTrailStore(selectCurrentNode)
  const updateNodeTitle = useMindTrailStore((s) => s.updateNodeTitle)
  const updateNodeNote = useMindTrailStore((s) => s.updateNodeNote)
  const setNodeStatus = useMindTrailStore((s) => s.setNodeStatus)
  const continueMainLine = useMindTrailStore((s) => s.continueMainLine)
  const createBranch = useMindTrailStore((s) => s.createBranch)
  const deleteNode = useMindTrailStore((s) => s.deleteNode)

  if (!node) return null

  return (
    <aside className="flex w-[320px] flex-col gap-4 border-l border-slate-200 bg-white p-5">
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-500">节点标题</label>
        <input
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
          value={node.title}
          onChange={(e) => updateNodeTitle(node.id, e.target.value)}
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-500">状态</label>
        <div className="flex gap-2">
          {statusOptions.map((opt) => (
            <button
              key={opt.value}
              className={[
                'flex-1 rounded-lg border px-2 py-1.5 text-xs',
                node.status === opt.value
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-slate-200 text-slate-500 hover:bg-slate-50',
              ].join(' ')}
              onClick={() => setNodeStatus(node.id, opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1">
        <label className="mb-1 block text-xs font-medium text-slate-500">笔记</label>
        <textarea
          className="h-32 w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
          value={node.note}
          placeholder="简短记录这个学习点…"
          onChange={(e) => updateNodeNote(node.id, e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-2">
        <button
          className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
          onClick={() => continueMainLine()}
        >
          继续主线 (Enter)
        </button>
        <button
          className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100"
          onClick={() => createBranch()}
        >
          创建支线 (Tab)
        </button>
        <button
          className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
          onClick={() => deleteNode(node.id)}
        >
          删除节点 (Delete)
        </button>
      </div>
    </aside>
  )
}

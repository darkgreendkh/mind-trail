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
    <aside
      className="flex w-[320px] flex-col gap-4 p-5"
      style={{ backgroundColor: '#f7f4ec', borderLeft: '1px solid #ece6da' }}
    >
      <div>
        <label className="mb-1 block text-xs font-medium" style={{ color: '#5a6856' }}>
          节点标题
        </label>
        <input
          className="w-full px-3 py-2 text-sm focus:outline-none"
          style={{
            backgroundColor: '#fffdf9',
            border: '1px solid #e6e0d4',
            borderRadius: 10,
            color: '#33352f',
          }}
          value={node.title}
          onChange={(e) => updateNodeTitle(node.id, e.target.value)}
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium" style={{ color: '#5a6856' }}>
          状态
        </label>
        <div className="flex gap-2 p-2" style={{ backgroundColor: '#e2ebe0', borderRadius: 10 }}>
          {statusOptions.map((opt) => (
            <button
              key={opt.value}
              className="flex-1 px-2 py-1.5 text-xs font-medium transition"
              style={
                node.status === opt.value
                  ? { backgroundColor: '#5f7d63', color: '#fff', borderRadius: 8 }
                  : { color: '#5a6856', borderRadius: 8 }
              }
              onClick={() => setNodeStatus(node.id, opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1">
        <label className="mb-1 block text-xs font-medium" style={{ color: '#5a6856' }}>
          笔记
        </label>
        <textarea
          className="w-full resize-none px-3 py-2 focus:outline-none"
          style={{
            height: 240,
            backgroundColor: '#eef1e8',
            border: 'none',
            borderRadius: 10,
            color: '#33352f',
            fontSize: 13,
            lineHeight: 1.75,
          }}
          value={node.note}
          placeholder="简短记录这个学习点…"
          onChange={(e) => updateNodeNote(node.id, e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-2">
        <button
          className="px-3 py-2 text-sm font-medium transition hover:opacity-90"
          style={{ backgroundColor: '#5f7d63', color: '#fff', borderRadius: 10 }}
          onClick={() => continueMainLine()}
        >
          继续主线 Enter
        </button>
        <button
          className="px-3 py-2 text-sm font-medium transition hover:opacity-90"
          style={{ backgroundColor: '#a8c4a0', color: '#2d4633', borderRadius: 10 }}
          onClick={() => createBranch()}
        >
          创建支线 Tab
        </button>
        <button
          className="px-3 py-2 text-sm font-medium transition hover:opacity-90"
          style={{ backgroundColor: '#d8cfc6', color: '#7a5e53', borderRadius: 10 }}
          onClick={() => deleteNode(node.id)}
        >
          删除节点 Delete
        </button>
      </div>
    </aside>
  )
}

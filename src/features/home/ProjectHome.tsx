import { useState } from 'react'
import { useMindTrailStore } from '../../store/useMindTrailStore'
import { ConfirmDialog } from './ConfirmDialog'

export function ProjectHome() {
  const projects = useMindTrailStore((s) => s.projects)
  const createProject = useMindTrailStore((s) => s.createProject)
  const openProject = useMindTrailStore((s) => s.openProject)
  const deleteProject = useMindTrailStore((s) => s.deleteProject)
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)

  const sorted = [...projects].sort((a, b) => b.updatedAt - a.updatedAt)
  const pendingTitle = projects.find((p) => p.id === pendingDelete)?.title ?? ''

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Mind Trail</h1>
          <p className="mt-1 text-sm text-slate-500">本地学习路径可视化</p>
        </div>
        <button
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          onClick={() => createProject()}
        >
          新建项目
        </button>
      </header>

      {sorted.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 p-12 text-center text-slate-500">
          还没有学习图。点击「新建项目」开始你的第一条学习路径。
        </div>
      ) : (
        <ul className="space-y-3">
          {sorted.map((p) => (
            <li
              key={p.id}
              className="group flex items-center justify-between rounded-xl border border-slate-200 bg-white px-5 py-4 hover:border-blue-300 hover:shadow-sm"
            >
              <button className="flex-1 text-left" onClick={() => openProject(p.id)}>
                <div className="font-medium text-slate-800">{p.title}</div>
                <div className="mt-1 text-xs text-slate-400">
                  {p.nodes.length} 个节点 · 更新于{' '}
                  {new Date(p.updatedAt).toLocaleString('zh-CN')}
                </div>
              </button>
              <button
                className="ml-4 rounded-lg px-3 py-1.5 text-sm text-slate-400 opacity-0 transition group-hover:opacity-100 hover:bg-red-50 hover:text-red-600"
                onClick={() => setPendingDelete(p.id)}
              >
                删除
              </button>
            </li>
          ))}
        </ul>
      )}

      {pendingDelete && (
        <ConfirmDialog
          title="删除项目"
          message={`确定删除「${pendingTitle}」吗？该操作无法撤销。`}
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => {
            deleteProject(pendingDelete)
            setPendingDelete(null)
          }}
        />
      )}
    </div>
  )
}

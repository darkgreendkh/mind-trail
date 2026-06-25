import { useReactFlow } from '@xyflow/react'
import {
  useMindTrailStore,
  selectActiveProject,
  selectCurrentNode,
} from '../../store/useMindTrailStore'

export function Toolbar() {
  const project = useMindTrailStore(selectActiveProject)
  const renameProject = useMindTrailStore((s) => s.renameProject)
  const closeProject = useMindTrailStore((s) => s.closeProject)
  const autoLayout = useMindTrailStore((s) => s.autoLayout)
  const current = useMindTrailStore(selectCurrentNode)
  const { setCenter } = useReactFlow()

  if (!project) return null

  const focusCurrent = () => {
    if (!current) return
    setCenter(current.x + 100, current.y + 50, { zoom: 1, duration: 400 })
  }

  return (
    <div className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-2">
      <button
        className="rounded-lg px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
        onClick={() => closeProject()}
      >
        ← 项目列表
      </button>
      <input
        className="min-w-0 flex-1 rounded-lg px-2 py-1.5 text-sm font-medium text-slate-800 hover:bg-slate-50 focus:bg-slate-50 focus:outline-none"
        value={project.title}
        onChange={(e) => renameProject(project.id, e.target.value)}
      />
      <button
        className="rounded-lg px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
        onClick={() => autoLayout()}
      >
        自动整理布局
      </button>
      <button
        className="rounded-lg px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
        onClick={focusCurrent}
      >
        回到当前节点
      </button>
    </div>
  )
}

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
    <div
      className="flex items-center gap-3 px-4 py-2"
      style={{ backgroundColor: '#fffdf8', borderBottom: '1px solid #ece6da' }}
    >
      <button
        className="px-3 py-1.5 text-sm transition hover:opacity-70"
        style={{ color: '#5a6856', borderRadius: 10 }}
        onClick={() => closeProject()}
      >
        ← 项目列表
      </button>
      {/* Auto-sizing title: a hidden span mirrors the value and defines the grid
          cell width, so the input shrink-wraps the text instead of stretching. */}
      <div
        className="grid items-center"
        style={{ border: '1px solid #ece6da', borderRadius: 10, maxWidth: 420 }}
      >
        <span
          aria-hidden
          className="invisible whitespace-pre px-2 py-1.5 text-sm font-medium"
          style={{ gridArea: '1 / 1', minWidth: '3rem' }}
        >
          {project.title || ' '}
        </span>
        <input
          size={1}
          className="bg-transparent px-2 py-1.5 text-sm font-medium focus:outline-none"
          style={{ gridArea: '1 / 1', width: '100%', minWidth: 0, color: '#5f7d63' }}
          value={project.title}
          onChange={(e) => renameProject(project.id, e.target.value)}
        />
      </div>
      <div className="ml-auto flex items-center gap-3">
        <button
          className="px-3 py-1.5 text-sm transition hover:opacity-70"
          style={{ color: '#5a6856', borderRadius: 10 }}
          onClick={() => autoLayout()}
        >
          自动整理布局
        </button>
        <button
          className="px-3 py-1.5 text-sm transition hover:opacity-70"
          style={{ color: '#5a6856', borderRadius: 10 }}
          onClick={focusCurrent}
        >
          回到当前节点
        </button>
      </div>
    </div>
  )
}

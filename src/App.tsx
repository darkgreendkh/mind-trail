import { useMindTrailStore } from './store/useMindTrailStore'
import { ProjectHome } from './features/home/ProjectHome'
import { Workbench } from './features/workbench/Workbench'

export default function App() {
  const activeProjectId = useMindTrailStore((s) => s.activeProjectId)
  return activeProjectId ? <Workbench /> : <ProjectHome />
}

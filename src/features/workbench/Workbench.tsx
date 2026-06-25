import { ReactFlowProvider } from '@xyflow/react'
import { Toolbar } from './Toolbar'
import { Canvas } from './Canvas'
import { Inspector } from './Inspector'
import { useKeyboardShortcuts } from './useKeyboardShortcuts'

export function Workbench() {
  useKeyboardShortcuts()
  return (
    <ReactFlowProvider>
      <div className="flex h-screen flex-col">
        <Toolbar />
        <div className="flex min-h-0 flex-1">
          <div className="min-w-0 flex-1">
            <Canvas />
          </div>
          <Inspector />
        </div>
      </div>
    </ReactFlowProvider>
  )
}

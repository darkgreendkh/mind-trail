import { useEffect } from 'react'
import { useMindTrailStore, selectCurrentNode } from '../../store/useMindTrailStore'

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable
}

export function useKeyboardShortcuts() {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return
      const state = useMindTrailStore.getState()

      // Undo / redo operate on history, not the selected node, so handle them
      // first. While typing in a field the isTypingTarget guard above already
      // let the browser's native text undo win.
      if (e.ctrlKey || e.metaKey) {
        const key = e.key.toLowerCase()
        if (key === 'z' && !e.shiftKey) {
          e.preventDefault()
          state.undo()
        } else if ((key === 'z' && e.shiftKey) || key === 'y') {
          e.preventDefault()
          state.redo()
        }
        return
      }

      const current = selectCurrentNode(state)
      if (!current) return

      if (e.key === 'Enter') {
        e.preventDefault()
        state.continueMainLine()
      } else if (e.key === 'Tab') {
        e.preventDefault()
        state.createBranch()
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault()
        state.deleteNode(current.id)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
}

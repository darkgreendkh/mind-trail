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

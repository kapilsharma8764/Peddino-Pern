import { useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useEditorStore } from '@/store/editorStore'
import { useConfigStore } from '@/store/configStore'
import { regionBlocks, regionOfBlock } from '@/store/site-shape'
import { findBlock } from '@/lib/block-tree'

export function useKeyboardShortcuts() {
  const navigate = useNavigate()
  const location = useLocation()
  const { toggleJsonDrawer, toggleHistory, toggleShortcutsModal, togglePreview, selectBlock } = useEditorStore()
  const { undo, redo } = useConfigStore()

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Don't fire while someone is typing. Text edited directly on the page
      // is contentEditable rather than an input, and without this check every
      // letter that happens to be a shortcut is swallowed — typing "Sharma"
      // opened History on the h and Preview on nothing at all.
      const target = e.target as HTMLElement | null
      const tag = target?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if (target?.isContentEditable) return

      // Nav shortcuts: 1-5
      if (!e.metaKey && !e.ctrlKey && !e.altKey) {
        switch (e.key) {
          case '1': e.preventDefault(); navigate('/dashboard'); return
          case '2': e.preventDefault(); navigate('/editor'); return
          case '3': e.preventDefault(); navigate('/leads'); return
          case '4': e.preventDefault(); navigate('/components'); return
          case '5': e.preventDefault(); navigate('/settings'); return
          case '?': e.preventDefault(); toggleShortcutsModal(); return
        }
      }

      // Editor shortcuts (only on editor page)
      if (location.pathname === '/editor') {
        if (!e.metaKey && !e.ctrlKey) {
          switch (e.key) {
            case 'j': case 'J': e.preventDefault(); toggleJsonDrawer(); return
            case 'h': case 'H': e.preventDefault(); toggleHistory(); return
            case 'p': case 'P': e.preventDefault(); togglePreview(); return
            case 'Escape': e.preventDefault(); selectBlock(null); return
          }
        }

        // Undo/Redo
        if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
          e.preventDefault()
          if (e.shiftKey) redo()
          else undo()
          return
        }

        // Copy/paste the selected section. Reads current state directly
        // rather than through hooks so this handler doesn't need to be
        // recreated on every selection change.
        if ((e.metaKey || e.ctrlKey) && (e.key === 'c' || e.key === 'v')) {
          const editor = useEditorStore.getState()
          const selectedId = editor.selectedBlockId
          if (!selectedId) return
          const { config, activePageId } = useConfigStore.getState()
          if (e.key === 'c') {
            const region = regionOfBlock(config, selectedId, activePageId)
            const block = findBlock(regionBlocks(config, region, activePageId), selectedId)
            if (!block) return
            e.preventDefault()
            editor.setClipboardBlock(block)
          } else if (editor.clipboardBlock) {
            e.preventDefault()
            useConfigStore.getState().pasteBlockAfter(selectedId, editor.clipboardBlock)
          }
          return
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [navigate, location.pathname, toggleJsonDrawer, toggleHistory, toggleShortcutsModal, togglePreview, selectBlock, undo, redo])
}

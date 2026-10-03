import { Redo2, Undo2 } from 'lucide-react'
import { useConfigStore } from '@/store/configStore'

/** Undo and redo for the site, with the name of what would change as a tooltip. */
export function UndoRedoButtons() {
  const undo = useConfigStore((s) => s.undo)
  const redo = useConfigStore((s) => s.redo)
  const undoLabel = useConfigStore((s) => s.undoStack[s.undoStack.length - 1]?.label)
  const redoLabel = useConfigStore((s) => s.redoStack[s.redoStack.length - 1]?.label)

  const button =
    'p-1.5 rounded-md border border-border-default text-text-2 hover:text-text-0 hover:bg-bg-3 disabled:opacity-35 disabled:hover:bg-transparent disabled:hover:text-text-2 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand'

  return (
    <div className="flex gap-1" role="group" aria-label="History">
      <button type="button" onClick={undo} disabled={!undoLabel} className={button} title={undoLabel ? `Undo: ${undoLabel}` : 'Nothing to undo'} aria-label="Undo">
        <Undo2 size={12} />
      </button>
      <button type="button" onClick={redo} disabled={!redoLabel} className={button} title={redoLabel ? `Redo: ${redoLabel}` : 'Nothing to redo'} aria-label="Redo">
        <Redo2 size={12} />
      </button>
    </div>
  )
}

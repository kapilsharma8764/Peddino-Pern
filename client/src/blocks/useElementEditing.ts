import { useEffect, useRef, type MouseEvent, type KeyboardEvent as ReactKeyboardEvent, type SyntheticEvent } from 'react'
import { useEditorStore, type ElementTarget } from '@/store/editorStore'
import { useConfigStore } from '@/store/configStore'
import type { BlockConfig, SiteRegion } from './types'
import { readPath, writePath } from './inline-edit'
import { findBlock } from '@/lib/block-tree'
import { regionBlocks } from '@/store/site-shape'
import { elementToken } from './element-style'

/** Capture before website handlers; each nested wrapper owns only its content. */
export function useElementEditing(block: BlockConfig, region: SiteRegion) {
  const root = useRef<HTMLDivElement>(null)
  const selectedId = useEditorStore(s => s.selectedBlockId)
  const selected = useEditorStore(s => s.selectedElement)
  const preview = useEditorStore(s => s.previewMode)
  useEffect(() => {
    const nodes = root.current?.querySelectorAll<HTMLElement>('[data-element], [data-edit], [data-image]') ?? []
    nodes.forEach(node => {
      const path = node.dataset.element ?? node.dataset.edit ?? node.dataset.image
      const owned = node.closest('[data-block-owner]') === root.current
      if (owned && path) node.dataset.elementToken = elementToken(block, path)
      node.toggleAttribute('data-element-selected', owned && !preview && selectedId === block.id && path === selected?.path && (!node.parentElement?.closest('[data-element]') || !!node.dataset.element))
    })
  }, [selectedId, selected, block, preview])

  function content(event: SyntheticEvent<HTMLDivElement>) {
    const target = event.target instanceof Element ? event.target : null
    if (preview || !target || target.closest('[data-block-owner]') !== event.currentTarget || target.closest('[data-editor-tools]')) return null
    return target
  }
  function onClickCapture(event: MouseEvent<HTMLDivElement>) {
    const target = content(event)
    if (!target || target.closest('[contenteditable="plaintext-only"]')) return
    const action = target.closest<HTMLElement>('[data-element]')
    const field = action ?? target.closest<HTMLElement>('[data-edit], [data-image]')
    let element: ElementTarget | null = null
    if (field) {
      const path = field.dataset.element ?? field.dataset.edit ?? field.dataset.image!
      element = { path, kind: action ? 'button' : field.dataset.image ? 'image' : 'text',
        label: field.dataset.elementLabel ?? (field.dataset.image ? 'Image' : /^H[1-6]$/.test(field.tagName) ? 'Heading' : 'Text'), urlPath: field.dataset.elementUrl,
        altPath: field.dataset.elementAlt,
        defaultValue: field.dataset.elementValue ?? field.textContent ?? '', defaultUrl: field.dataset.elementDestination }
    }
    useEditorStore.getState().selectElement(block.id, element)
    useConfigStore.getState().setActiveRegion(region)
    event.stopPropagation()
    // Keep text selection on mousedown, but suppress all website click actions.
    event.preventDefault()
  }
  function onDoubleClickCapture(event: MouseEvent<HTMLDivElement>) {
    const target = content(event)?.closest<HTMLElement>('[data-edit]')
    if (!target) return
    event.preventDefault(); event.stopPropagation()
    const path = target.dataset.edit!
    const before = String(readPath(block.props, path) ?? target.textContent ?? '')
    target.contentEditable = 'plaintext-only'
    target.focus()
    const finish = () => {
      target.removeEventListener('blur', finish)
      target.removeEventListener('keydown', onKey)
      target.contentEditable = 'false'
      const after = target.textContent ?? ''
      if (after === before) return
      const store = useConfigStore.getState()
      const current = findBlock(regionBlocks(store.config, region, store.activePageId), block.id)
      if (current) store.updateBlockProps(block.id, writePath(current.props, path, after))
    }
    const onKey = (key: KeyboardEvent) => {
      key.stopPropagation()
      if (key.key === 'Escape') { key.preventDefault(); target.textContent = before; target.blur() }
      if (key.key === 'Enter' && !key.shiftKey && target.tagName !== 'P') { key.preventDefault(); target.blur() }
    }
    target.addEventListener('blur', finish)
    target.addEventListener('keydown', onKey)
  }
  function onKeyDownCapture(event: ReactKeyboardEvent<HTMLDivElement>) {
    const target = content(event)
    if (!target || target.closest('[contenteditable="plaintext-only"]')) return
    if ((event.key === 'Enter' || event.key === ' ') && target.closest('a,button,input,summary')) {
      event.preventDefault(); event.stopPropagation()
      if (target instanceof HTMLElement) target.click()
    }
  }
  return { setRoot: (node: HTMLDivElement | null) => { root.current = node }, onClickCapture, onDoubleClickCapture, onKeyDownCapture }
}

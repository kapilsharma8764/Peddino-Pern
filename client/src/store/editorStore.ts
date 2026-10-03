import { create } from 'zustand'
import type { BlockConfig } from '@/blocks/types'

export type Viewport = 'desktop' | 'tablet' | 'mobile'
export interface ElementTarget {
  path: string
  label: string
  kind: 'button' | 'text' | 'image'
  urlPath?: string
  altPath?: string
  defaultValue?: string
  defaultUrl?: string
}

/** Where the next widget added from the library lands, chosen by an "Add here" control on the canvas. */
export interface InsertTarget { region: 'header' | 'page' | 'footer'; parentId: string | null; index: number }
/** How a widget added from the library is placed relative to the selected section. */
export type InsertMode = 'before' | 'after' | 'inside' | 'end'
export type LeftTab = 'pages' | 'layouts' | 'layers' | 'components' | 'templates'
/** The four things the Layouts tab can show. */
export type LayoutView = 'sections' | 'pages' | 'header' | 'footer'
/** The spot an "Add section" button chose, while the layout picker is open. */
export interface SectionPicker { region: 'header' | 'page' | 'footer'; index: number }

interface EditorState {
  insertTarget: InsertTarget | null
  setInsertTarget: (target: InsertTarget | null) => void
  insertMode: InsertMode
  setInsertMode: (mode: InsertMode) => void
  leftTab: LeftTab
  setLeftTab: (tab: LeftTab) => void
  layoutView: LayoutView
  setLayoutView: (view: LayoutView) => void
  /** Open while the "+ Add section" layout picker is showing. */
  sectionPicker: SectionPicker | null
  setSectionPicker: (picker: SectionPicker | null) => void
  /** Which right-hand tab is open; the Pages list sets it to reach Theme colours. */
  rightTab: 'content' | 'style' | 'advanced' | 'layout' | 'design'
  setRightTab: (tab: 'content' | 'style' | 'advanced' | 'layout' | 'design') => void
  /** Open when a page's "Page colors" button was pressed. */
  pageColorsFor: string | null
  setPageColorsFor: (id: string | null) => void
  selectedBlockId: string | null
  selectedElement: ElementTarget | null
  selectElement: (id: string, target: ElementTarget | null) => void
  /** The one block a Copy last captured. Pasting inserts a fresh-id clone of it, so the same block can be pasted more than once. */
  clipboardBlock: BlockConfig | null
  setClipboardBlock: (block: BlockConfig | null) => void
  viewport: Viewport
  jsonDrawerOpen: boolean
  historyOpen: boolean
  shortcutsModalOpen: boolean
  previewMode: boolean
  activeProjectId: string | null
  // Generation state
  isGenerating: boolean
  generationPrompt: string | null
  generationError: string | null
  selectBlock: (id: string | null) => void
  setViewport: (vp: Viewport) => void
  toggleJsonDrawer: () => void
  toggleHistory: () => void
  toggleShortcutsModal: () => void
  togglePreview: () => void
  setActiveProject: (id: string | null) => void
  setGenerating: (prompt: string | null) => void
  setGenerationError: (err: string | null) => void
  clearGeneration: () => void
}

export const useEditorStore = create<EditorState>()((set) => ({
  insertTarget: null,
  setInsertTarget: (insertTarget) => set({ insertTarget }),
  insertMode: 'after',
  setInsertMode: (insertMode) => set({ insertMode }),
  leftTab: 'pages',
  setLeftTab: (leftTab) => set({ leftTab }),
  layoutView: 'sections',
  setLayoutView: (layoutView) => set({ layoutView }),
  sectionPicker: null,
  setSectionPicker: (sectionPicker) => set({ sectionPicker }),
  rightTab: 'content',
  setRightTab: (rightTab) => set({ rightTab }),
  pageColorsFor: null,
  setPageColorsFor: (pageColorsFor) => set({ pageColorsFor }),
  selectedBlockId: null,
  selectedElement: null,
  selectElement: (id, target) => set({ selectedBlockId: id, selectedElement: target }),
  clipboardBlock: null,
  setClipboardBlock: (clipboardBlock) => set({ clipboardBlock }),
  viewport: 'desktop',
  jsonDrawerOpen: false,
  historyOpen: false,
  shortcutsModalOpen: false,
  previewMode: false,
  activeProjectId: null,
  isGenerating: false,
  generationPrompt: null,
  generationError: null,
  selectBlock: (id) => set({ selectedBlockId: id, selectedElement: null }),
  setViewport: (vp) => set({ viewport: vp }),
  toggleJsonDrawer: () => set((s) => ({ jsonDrawerOpen: !s.jsonDrawerOpen })),
  toggleHistory: () => set((s) => ({ historyOpen: !s.historyOpen })),
  toggleShortcutsModal: () => set((s) => ({ shortcutsModalOpen: !s.shortcutsModalOpen })),
  togglePreview: () => set((s) => ({ previewMode: !s.previewMode, selectedElement: null, ...(!s.previewMode ? { selectedBlockId: null } : {}) })),
  setActiveProject: (id) => set({ activeProjectId: id }),
  setGenerating: (prompt) => set({ isGenerating: !!prompt, generationPrompt: prompt, generationError: null }),
  setGenerationError: (err) => set({ generationError: err }),
  clearGeneration: () => set({ isGenerating: false, generationPrompt: null }),
}))

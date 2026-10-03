import { normalizeOriginalLinks } from '@/lib/original-links'
import { migrateButtons } from '@/lib/auto-link-buttons'
import { migrateCustomSite } from '@/layouts/custom-site'
import { useEditorStore } from './editorStore'
import { findBlock } from '@/lib/block-tree'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { produce } from 'immer'
import type { BlockConfig, PageColors, OriginalTheme, SiteConfig, ThemeConfig, PageConfig, SiteRegion } from '@/blocks/types'
import { newId } from '@/lib/id'
import { resolveTheme } from '@/lib/theme-presets'
import {
  cloneBlock,
  duplicateBlock as duplicateInTree,
  insertBlock as insertInTree,
  locate,
  moveBlock as moveInTree,
  removeBlock as removeFromTree,
  replaceBlock,
} from '@/lib/block-tree'
import {
  ensurePages,
  mutateRegion,
  uniquePagePath,
  regionBlocks,
  regionOfBlock,
  splitHeaderFooter,
  syncMenu,
} from './site-shape'

interface UndoEntry {
  header?: BlockConfig[]
  footer?: BlockConfig[]
  pages?: PageConfig[]
  blocks: BlockConfig[]
  theme?: Partial<ThemeConfig>
  originalTheme?: OriginalTheme
  label: string
  timestamp: number
}

interface ConfigState {
  config: SiteConfig
  activePageId: string
  /** Header, footer, or the page currently open. */
  activeRegion: SiteRegion
  undoStack: UndoEntry[]
  redoStack: UndoEntry[]
  setConfig: (config: SiteConfig) => void
  setActivePage: (id: string) => void
  setActiveRegion: (region: SiteRegion) => void
  getActivePageBlocks: () => BlockConfig[]
  updateBlock: (id: string, updates: Partial<BlockConfig>) => void
  updateBlockProps: (id: string, props: Record<string, unknown>) => void
  updateOriginalDocuments: (documents: Record<string, string>) => void
  addBlock: (block: BlockConfig, index?: number, parentId?: string | null) => void
  removeBlock: (id: string) => void
  duplicateBlock: (id: string) => void
  /** Inserts a fresh-id clone of the given block right after `afterId`, in whichever region/container `afterId` sits in. */
  pasteBlockAfter: (afterId: string, block: BlockConfig) => void
  moveBlock: (fromIndex: number, toIndex: number) => void
  moveBlockTo: (id: string, parentId: string | null, index?: number) => void
  addPage: (name: string, showInMenu?: boolean, blocks?: BlockConfig[]) => string
  appendPages: (pages: PageConfig[]) => void
  removePage: (id: string) => void
  renamePage: (id: string, name: string) => void
  /** Swaps one page's body sections for a different pre-made layout. Header, footer, theme and every other page are untouched. */
  setPageBlocks: (id: string, blocks: BlockConfig[]) => void
  setPageInMenu: (id: string, showInMenu: boolean) => void
  /** Colours for one page only; pass undefined to follow the site theme again. */
  setPageColors: (id: string, colors: PageColors | undefined) => void
  setTheme: (theme: Partial<ThemeConfig>) => void
  updateTheme: (partial: Partial<ThemeConfig>) => void
  previewTheme: (partial: Partial<ThemeConfig>) => void
  /** Records the palette read from an imported design. Not an undo step: it is not a change the owner made. */
  setDetectedOriginalPalette: (detected: Record<string, string>) => void
  /** Replaces the owner's theme colour choices for an imported design, as one undo step. */
  setOriginalTheme: (theme: OriginalTheme, label?: string) => void
  /** Puts some or all theme colours back to the template's own palette. */
  resetTheme: (keys?: (keyof ThemeConfig)[]) => void
  undo: () => void
  redo: () => void
  canUndo: () => boolean
  canRedo: () => boolean
}

const defaultBlocks: BlockConfig[] = [
  {
    id: 'block-navbar',
    type: 'navbar',
    variant: 'default',
    props: {
      logo: 'Acme Inc',
      links: ['Features', 'Pricing', 'About', 'Contact'],
      ctaText: 'Get Started',
    },
  },
  {
    id: 'block-hero',
    type: 'hero',
    variant: 'centered',
    props: {
      badge: 'Now in Beta',
      headline: 'Build websites with JSON',
      subheadline: 'The visual editor that agents and humans both understand. Structured config, beautiful output.',
      primaryCta: 'Start Building',
      secondaryCta: 'View Demo',
    },
  },
  {
    id: 'block-features',
    type: 'features',
    variant: 'grid',
    props: {
      label: 'Features',
      title: 'Everything you need',
      subtitle: 'Powerful building blocks for your next website',
      items: [
        { icon: 'Blocks', title: 'Visual Editor', description: 'Drag and drop blocks to build your layout' },
        { icon: 'Code', title: 'JSON Config', description: 'Every change is a clean JSON mutation' },
        { icon: 'Bot', title: 'Agent Ready', description: 'AI agents can read and write your config' },
      ],
    },
  },
  {
    id: 'block-cta',
    type: 'cta',
    variant: 'simple',
    props: {
      headline: 'Ready to get started?',
      subheadline: 'Create your first site in minutes.',
      buttonText: 'Start Free',
    },
  },
  {
    id: 'block-footer',
    type: 'footer',
    variant: 'simple',
    props: {
      logo: 'SiteBuilder',
      copyright: '2026 SiteBuilder. All rights reserved.',
      links: ['Privacy', 'Terms', 'Contact'],
    },
  },
]

export const defaultConfig: SiteConfig = {
  name: 'My Website',
  pages: [{ id: 'page-home', name: 'Home', path: '/', blocks: defaultBlocks }],
  blocks: defaultBlocks,
}

type Snapshot = Omit<UndoEntry, 'label' | 'timestamp'>

function copy<T>(value: T | undefined): T | undefined {
  return value === undefined ? undefined : (JSON.parse(JSON.stringify(value)) as T)
}

function snapshot(state: ConfigState): Snapshot {
  return {
    header: copy(state.config.header),
    footer: copy(state.config.footer),
    pages: copy(state.config.pages),
    blocks: JSON.parse(JSON.stringify(state.config.blocks)),
    theme: copy(state.config.theme),
    originalTheme: copy(state.config.originalTheme),
  }
}

let groupingHistory = false
let groupRecorded = false
export function beginHistoryGroup() { groupingHistory = true; groupRecorded = false }
export function endHistoryGroup() { groupingHistory = false; groupRecorded = false }
const MAX_UNDO = 50

function pushUndo(state: ConfigState, label: string): Partial<ConfigState> {
  if (groupingHistory && groupRecorded) return { redoStack: [] }
  if (groupingHistory) groupRecorded = true
  const snap = snapshot(state)
  return {
    undoStack: [...state.undoStack, { ...snap, label, timestamp: Date.now() }].slice(-MAX_UNDO),
    redoStack: [],
  }
}

/**
 * Remembers the palette the site started with, the first time it is changed.
 *
 * Templates record theirs when they are built; a site saved before that
 * existed, or made by the generator, gets it here from whatever it looked like
 * just before the first edit — which is exactly what "reset" should return to.
 */
function withThemeDefaults(config: SiteConfig): SiteConfig {
  return config.themeDefaults ? config : { ...config, themeDefaults: { ...resolveTheme(config.theme) } }
}

function withPages(config: SiteConfig): SiteConfig {
  return { ...config, pages: ensurePages(config) }
}

export const useConfigStore = create<ConfigState>()(
  persist(
    (set, get) => ({
      config: splitHeaderFooter(defaultConfig),
      activePageId: 'page-home',
      activeRegion: 'page',
      undoStack: [],
      redoStack: [],

      setConfig: (config) => {
        endHistoryGroup()
        useEditorStore.getState().selectBlock(null)
        const shaped = migrateCustomSite(migrateButtons(normalizeOriginalLinks(syncMenu(splitHeaderFooter(config)))))
        const home = ensurePages(shaped)[0]
        set({
          // `config.blocks` is the canvas's one source of what to draw. A
          // saved site's top-level `blocks` is whatever page was open when it
          // was last saved — not necessarily the first page opening here
          // lands on — so it has to be swapped for the first page's own
          // blocks, or the canvas would show one page's content under
          // another page's name until something else forced a resync.
          config: home ? { ...shaped, blocks: home.blocks } : shaped,
          activePageId: home?.id ?? 'page-home',
          activeRegion: 'page',
          undoStack: [],
          redoStack: [],
        })
      },

      setActivePage: (id) => set((state) => {
        const page = ensurePages(state.config).find((candidate) => candidate.id === id)
        return page ? { activePageId: id, activeRegion: 'page', config: { ...state.config, blocks: page.blocks } } : state
      }),

      setActiveRegion: (region) => set({ activeRegion: region }),

      getActivePageBlocks: () => {
        const state = get()
        return regionBlocks(state.config, 'page', state.activePageId)
      },

      updateBlock: (id, updates) =>
        set((state) => ({
          ...pushUndo(state, 'Update block'),
          config: mutateRegion(
            withPages(state.config),
            regionOfBlock(state.config, id, state.activePageId),
            state.activePageId,
            (blocks) => replaceBlock(blocks, id, (b) => ({ ...b, ...updates })),
          ),
        })),

      updateBlockProps: (id, props) =>
        set((state) => ({
          ...pushUndo(state, 'Update properties'),
          config: mutateRegion(
            withPages(state.config),
            regionOfBlock(state.config, id, state.activePageId),
            state.activePageId,
            (blocks) =>
              replaceBlock(blocks, id, (b) => ({ ...b, props: { ...b.props, ...props } })),
          ),
        })),

      updateOriginalDocuments: (documents) => set(state => {
        const replace = (blocks: BlockConfig[]) => blocks.map(block => block.props.originalTemplate && documents[block.id] !== undefined
          ? { ...block, props: { ...block.props, html: documents[block.id] } } : block)
        return { ...pushUndo(state, 'Edit template content'), config: { ...state.config,
          blocks: replace(state.config.blocks), pages: state.config.pages?.map(page => ({ ...page, blocks: replace(page.blocks) })),
        } }
      }),

      addBlock: (block, index, parentId = null) =>
        set((state) => ({
          ...pushUndo(state, 'Add block'),
          config: mutateRegion(withPages(state.config), state.activeRegion, state.activePageId, (blocks) =>
            insertInTree(blocks, block, parentId, index),
          ),
        })),

      removeBlock: (id) =>
        set((state) => ({
          ...pushUndo(state, 'Remove block'),
          config: mutateRegion(
            withPages(state.config),
            regionOfBlock(state.config, id, state.activePageId),
            state.activePageId,
            (blocks) => removeFromTree(blocks, id),
          ),
        })),

      duplicateBlock: (id) =>
        set((state) => {
          const region = regionOfBlock(state.config, id, state.activePageId)
          return {
            ...pushUndo(state, 'Duplicate block'),
            config: mutateRegion(withPages(state.config), region, state.activePageId, (blocks) =>
              // Copies whatever is inside it too, with fresh ids throughout —
              // duplicating a two-column layout should give a second layout,
              // not a second reference to the first one's contents.
              duplicateInTree(blocks, id),
            ),
          }
        }),

      pasteBlockAfter: (afterId, block) =>
        set((state) => {
          const region = regionOfBlock(state.config, afterId, state.activePageId)
          const config = withPages(state.config)
          const siblings = regionBlocks(config, region, state.activePageId)
          const found = locate(siblings, afterId)
          if (!found) return state
          return {
            ...pushUndo(state, 'Paste block'),
            config: mutateRegion(config, region, state.activePageId, (blocks) =>
              insertInTree(blocks, cloneBlock(block), found.parent?.id ?? null, found.index + 1),
            ),
          }
        }),

      moveBlock: (fromIndex, toIndex) =>
        set((state) => ({
          ...pushUndo(state, 'Move block'),
          config: mutateRegion(withPages(state.config), state.activeRegion, state.activePageId, (blocks) => {
            const moved = blocks[fromIndex]
            if (!moved) return blocks
            return moveInTree(blocks, moved.id, null, toIndex)
          }),
        })),

      /**
       * Moves a block anywhere in the page, including into or out of a
       * container. The flat `moveBlock` above stays for the section list,
       * which only ever reorders top-level siblings.
       */
      moveBlockTo: (id, parentId, index) =>
        set((state) => ({
          ...pushUndo(state, 'Move block'),
          config: mutateRegion(
            withPages(state.config),
            regionOfBlock(state.config, id, state.activePageId),
            state.activePageId,
            (blocks) => moveInTree(blocks, id, parentId, index),
          ),
        })),

      appendPages: (pages) => set((state) => pages.length ? ({
        ...pushUndo(state, 'Add website pages'),
        config: syncMenu({ ...state.config, pages: [...ensurePages(state.config), ...pages] }),
      }) : state),

      addPage: (name, showInMenu = true, blocks = []) => {
        const id = newId('page')
        set((state) => ({
          ...pushUndo(state, 'Add page'),
          config: syncMenu(
            produce(withPages(state.config), (draft) => {
              // Two pages with the same name would be two identical menu items.
              const taken = new Set(draft.pages!.map((page) => page.name.trim().toLowerCase()))
              let unique = name
              for (let n = 2; taken.has(unique.trim().toLowerCase()); n += 1) unique = `${name} ${n}`
              draft.pages!.push({
                id,
                name: unique,
                path: uniquePagePath(unique, draft.pages!),
                // A page started from a layout arrives with its sections in
                // place; a blank one arrives empty.
                blocks,
                showInMenu,
              })
              draft.blocks = blocks
            }),
          ),
          activePageId: id,
          activeRegion: 'page',
        }))
        return id
      },

      removePage: (id) =>
        set((state) => {
          const pages = ensurePages(state.config)
          // A site always has at least one page; removing the last one would
          // leave the editor with nothing to draw.
          if (pages.length <= 1) return state
          const remaining = pages.filter((p) => p.id !== id)
          const activePageId = state.activePageId === id ? remaining[0].id : state.activePageId
          const active = remaining.find((p) => p.id === activePageId) ?? remaining[0]
          return {
            ...pushUndo(state, 'Remove page'),
            config: syncMenu({ ...state.config, pages: remaining, blocks: active.blocks }),
            activePageId,
          }
        }),

      renamePage: (id, name) =>
        set((state) => ({
          ...pushUndo(state, 'Rename page'),
          config: syncMenu(
            produce(withPages(state.config), (draft) => {
              const page = draft.pages!.find((p) => p.id === id)
              if (!page) return
              page.name = name
              page.path = draft.pages![0].id === id ? '/' : uniquePagePath(name, draft.pages!, id)
            }),
          ),
        })),

      setPageBlocks: (id, blocks) =>
        set((state) => {
          const config = syncMenu(
            produce(withPages(state.config), (draft) => {
              const page = draft.pages!.find((p) => p.id === id)
              if (page) page.blocks = blocks
            }),
          )
          return {
            ...pushUndo(state, 'Change page layout'),
            config: state.activePageId === id ? { ...config, blocks } : config,
          }
        }),

      setPageInMenu: (id, showInMenu) =>
        set((state) => ({
          config: syncMenu(
            produce(withPages(state.config), (draft) => {
              const page = draft.pages!.find((p) => p.id === id)
              if (page) page.showInMenu = showInMenu
            }),
          ),
        })),

      setPageColors: (id, colors) =>
        set((state) => ({
          ...pushUndo(state, 'Change page colours'),
          config: produce(withPages(state.config), (draft) => {
            const page = draft.pages!.find((p) => p.id === id)
            if (!page) return
            const kept = colors && Object.values(colors).some(Boolean) ? colors : undefined
            if (kept) page.colors = kept
            else delete page.colors
          }),
        })),

      setTheme: (theme) =>
        set((state) => ({
          ...pushUndo(state, 'Change theme'),
          config: { ...withThemeDefaults(state.config), theme },
        })),

      updateTheme: (partial) =>
        set((state) => ({
          ...pushUndo(state, 'Update theme'),
          config: {
            ...withThemeDefaults(state.config),
            theme: { ...state.config.theme, ...partial },
          },
        })),

      previewTheme: (partial) =>
        set((state) => ({
          config: {
            ...withThemeDefaults(state.config),
            theme: { ...state.config.theme, ...partial },
          },
        })),

      resetTheme: (keys) =>
        set((state) => {
          const config = withThemeDefaults(state.config)
          const defaults = config.themeDefaults ?? {}
          const next: Partial<ThemeConfig> = { ...config.theme }
          for (const key of keys ?? (Object.keys({ ...defaults, ...next }) as (keyof ThemeConfig)[])) {
            const original = defaults[key]
            if (original === undefined) delete next[key]
            else (next as Record<string, unknown>)[key] = original
          }
          return {
            ...pushUndo(state, keys ? 'Reset theme colour' : 'Reset theme colours'),
            config: { ...config, theme: next },
          }
        }),

      setDetectedOriginalPalette: (detected) =>
        set((state) => ({
          config: { ...state.config, originalTheme: { ...state.config.originalTheme, detected } },
        })),

      setOriginalTheme: (originalTheme, label = 'Update theme colours') =>
        set((state) => ({
          ...pushUndo(state, label),
          config: { ...state.config, originalTheme },
        })),

      undo: () =>
        set((state) => {
          if (state.undoStack.length === 0) return state
          const prev = state.undoStack[state.undoStack.length - 1]
          const snap = snapshot(state)
          const page = prev.pages?.find(page => page.id === state.activePageId) ?? prev.pages?.[0]
          return {
            activePageId: page?.id ?? state.activePageId,
            undoStack: state.undoStack.slice(0, -1),
            redoStack: [...state.redoStack, { ...snap, label: prev.label, timestamp: Date.now() }],
            config: {
              ...state.config,
              header: prev.header,
              footer: prev.footer,
              pages: prev.pages,
              blocks: page?.blocks ?? prev.blocks,
              theme: prev.theme,
              originalTheme: prev.originalTheme,
            },
          }
        }),

      redo: () =>
        set((state) => {
          if (state.redoStack.length === 0) return state
          const next = state.redoStack[state.redoStack.length - 1]
          const snap = snapshot(state)
          const page = next.pages?.find(page => page.id === state.activePageId) ?? next.pages?.[0]
          return {
            activePageId: page?.id ?? state.activePageId,
            redoStack: state.redoStack.slice(0, -1),
            undoStack: [...state.undoStack, { ...snap, label: next.label, timestamp: Date.now() }],
            config: {
              ...state.config,
              header: next.header,
              footer: next.footer,
              pages: next.pages,
              blocks: page?.blocks ?? next.blocks,
              theme: next.theme,
              originalTheme: next.originalTheme,
            },
          }
        }),

      canUndo: () => get().undoStack.length > 0,
      canRedo: () => get().redoStack.length > 0,
    }),
    {
      name: 'sitebuilder-config',
      merge: (persisted, current) => {
        const saved = persisted as Partial<ConfigState>
        if (!saved.config) return current
        const config = migrateCustomSite(migrateButtons(normalizeOriginalLinks(syncMenu(splitHeaderFooter(saved.config)))))
        const page = ensurePages(config).find(page => page.id === saved.activePageId) ?? ensurePages(config)[0]
        return { ...current, ...saved, config: { ...config, blocks: page.blocks }, activePageId: page.id }
      },
      version: 3,
      partialize: (state) => ({
        config: state.config,
        activePageId: state.activePageId,
        activeRegion: state.activeRegion,
      }),
      migrate: (persisted, version) => {
        const data = persisted as Record<string, unknown>
        const config = data.config as SiteConfig | undefined

        if (config && !config.pages) {
          // v0/v1 -> v2: wrap blocks[] into pages[]
          config.pages = [{ id: 'page-home', name: 'Home', path: '/', blocks: config.blocks || [] }]
          data.activePageId = 'page-home'
        }

        if (config && version !== 3) {
          // v2 -> v3: lift the navbar and footer out of the page so one header
          // serves every page.
          data.config = syncMenu(splitHeaderFooter(config))
        }

        data.activeRegion = 'page'
        return data
      },
    }
  )
)

// Selection belongs to the visible document. Clear it when its owner disappears.
useConfigStore.subscribe((state, previous) => {
  if (state.config === previous.config && state.activePageId === previous.activePageId) return
  const editor = useEditorStore.getState()
  if (!editor.selectedBlockId) return
  const visible = [...(state.config.header ?? []), ...regionBlocks(state.config, 'page', state.activePageId), ...(state.config.footer ?? [])]
  if (!findBlock(visible, editor.selectedBlockId)) editor.selectBlock(null)
})

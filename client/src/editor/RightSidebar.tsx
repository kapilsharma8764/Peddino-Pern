import { ElementPanel } from '@/builder/ElementPanel'
import { useState } from 'react'
import { useEditorStore } from '@/store/editorStore'
import { useConfigStore, beginHistoryGroup, endHistoryGroup } from '@/store/configStore'
import { AdvancedContentFields, PropertiesPanel } from '@/builder/PropertiesPanel'
import { StylePanel } from '@/builder/StylePanel'
import { regionBlocks, regionOfBlock } from '@/store/site-shape'
import { findBlock } from '@/lib/block-tree'
import { DesignPanel } from './DesignPanel'
import { PageTemplatePanel } from './PageTemplatePanel'

type Tab = 'content' | 'style' | 'advanced' | 'design' | 'layout'

export function RightSidebar() {
  const selectedElement = useEditorStore(s => s.selectedElement)
  const selectedBlockId = useEditorStore((s) => s.selectedBlockId)
  // The selected block may be in the header or footer rather than the page.
  const selectedBlock = useConfigStore((s) => {
    if (!selectedBlockId) return undefined
    const region = regionOfBlock(s.config, selectedBlockId, s.activePageId)
    // Searched through the whole tree, not just the top level: a widget
    // inside a container is selected the same way a section is, and the panel
    // has to reach it or clicking it appears to do nothing.
    return findBlock(regionBlocks(s.config, region, s.activePageId), selectedBlockId) ?? undefined
  })
  const tab = useEditorStore((s) => s.rightTab)
  const setTab = useEditorStore((s) => s.setRightTab)
  const custom = useConfigStore((s) => s.config.buildMode === 'custom')

  // Selecting a block should bring its Properties forward, even if the user
  // was last looking at Design. Adjusting state during render (rather than in
  // an effect) applies the switch in the same pass, so the panel never paints
  // the wrong tab for a frame.
  const selectionKey = `${selectedBlockId}:${selectedElement?.path ?? ''}`
  const [lastSelectedId, setLastSelectedId] = useState(selectionKey)
  if (selectionKey !== lastSelectedId) {
    setLastSelectedId(selectionKey)
    // Keep Style selected if that is where the user was working; jumping back
    // to Content on every click would fight anyone restyling several sections.
    if (selectedBlockId) setTab('content')
  }

  // Ready-made page layouts are templates, which a custom build never shows.
  const activeTab: Tab = custom && tab === 'layout' ? 'content' : tab

  return (
    <div onFocusCapture={beginHistoryGroup} onBlurCapture={endHistoryGroup} className="flex w-[300px] max-w-[42vw] bg-bg-1 border-l border-border-default flex-col shrink-0">
      {/* Tabs */}
      <div className="flex border-b border-border-default shrink-0">
        {(
          [
            ['content', 'Content'],
            ['style', 'Style'],
            ['advanced', 'Advanced'],
            ...(custom ? [] : [['layout', 'Layout'] as const]),
            ['design', 'Site'],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setTab(value)}
            className={`flex-1 py-2 text-[11px] font-medium transition-colors ${
              activeTab === value
                ? 'text-text-0 border-b border-brand'
                : 'text-text-3 hover:text-text-1'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {activeTab === 'design' ? (
          <div className="flex-1 overflow-y-auto">
            <DesignPanel />
          </div>
        ) : activeTab === 'layout' ? (
          <div className="flex-1 overflow-y-auto">
            <PageTemplatePanel />
          </div>
        ) : activeTab === 'advanced' ? (
          <div className="flex-1 overflow-y-auto">
            {selectedBlock && <AdvancedContentFields block={selectedBlock} />}
            <StylePanel block={selectedBlock} mode="advanced" />
          </div>
        ) : selectedBlock && selectedElement && (selectedElement.kind !== 'text' || selectedElement.path.includes('.')) ? (
          <ElementPanel key={`${selectionKey}:${activeTab}`} block={selectedBlock} target={selectedElement} styleOnly={activeTab === 'style'} />
        ) : activeTab === 'style' ? (
          <StylePanel block={selectedBlock} />
        ) : (
          <PropertiesPanel block={selectedBlock} />
        )}
      </div>
    </div>
  )
}

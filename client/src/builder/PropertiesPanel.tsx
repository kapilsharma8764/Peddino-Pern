import { useState } from 'react'
import { ChevronDown, ChevronRight, MousePointer2 } from 'lucide-react'
import type { BlockConfig } from '@/blocks/types'
import { useConfigStore } from '@/store/configStore'
import { blockMetadata } from '@/lib/block-metadata'
import { widgetSchemas } from '@/widgets/schemas'
import { ensurePages, regionBlocks, regionOfBlock } from '@/store/site-shape'
import { locate } from '@/lib/block-tree'
import { blockName } from '@/lib/block-names'
import { resolveLink } from '@/lib/site-links'
import { linkPages } from './core'
import { FieldRenderer } from './fields/FieldRenderer'

/**
 * The settings form for whichever widget is selected.
 *
 * It is built entirely from the widget's schema, so this file never mentions a
 * specific widget. Adding a widget means writing its schema — the panel picks
 * it up without being touched, which is the difference between a builder that
 * grows and one where every new widget costs another hand-written form.
 */

function Group({
  title,
  defaultOpen,
  children,
}: {
  title: string
  defaultOpen: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="border-b border-border-subtle last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="w-full flex items-center gap-1 px-3 py-2 text-left text-text-1 hover:text-text-0 transition-colors"
      >
        {open ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
        <span className="text-[11px] font-semibold tracking-wide uppercase">{title}</span>
      </button>
      {open && <div className="px-3 pb-3">{children}</div>}
    </div>
  )
}

export function PropertiesPanel({ block }: { block: BlockConfig | undefined }) {
  const updateBlock = useConfigStore((s) => s.updateBlock)
  const updateBlockProps = useConfigStore((s) => s.updateBlockProps)
  const pages = useConfigStore((s) => ensurePages(s.config))
  const nested = useConfigStore((s) => {
    if (!block) return false
    const region = regionOfBlock(s.config, block.id, s.activePageId)
    return Boolean(locate(regionBlocks(s.config, region, s.activePageId), block.id)?.parent)
  })

  if (!block) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <MousePointer2 size={18} className="text-text-3 mb-2" />
        <p className="text-[11.5px] text-text-2">Nothing selected</p>
        <p className="text-[10.5px] text-text-3 mt-1 leading-relaxed">
          Click text, an image or a button on the page to edit it. Use Preview to test website links.
        </p>
      </div>
    )
  }

  const schema = widgetSchemas[block.type]
  const meta = blockMetadata.find((m) => m.type === block.type)

  if (!schema) {
    return (
      <div className="px-3 py-4">
        <p className="text-[11.5px] text-text-2">
          {meta?.label ?? block.type} has no settings yet.
        </p>
      </div>
    )
  }

  // Only action URL fields belong here. A video source or a map URL is media,
  // not a link to another page of the site.
  const pageLinkFields = block.type === 'video' || block.type === 'map'
    ? []
    : schema.groups.flatMap((group) => Object.entries(group.fields)
      .filter(([key]) => /(?:url|href)$/i.test(key) && key !== 'mapUrl')
      .map(([key, field]) => ({ key, label: field.label })))

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="px-3 py-2.5 border-b border-border-default">
        <p className="text-[11.5px] font-semibold text-text-0">{blockName(block, nested)}</p>
        {meta?.description && (
          <p className="text-[10.5px] text-text-3 mt-0.5 leading-snug">{meta.description}</p>
        )}
      </div>

      {pageLinkFields.length > 0 && pages.length > 1 && (
        <div className="px-3 pb-3 border-b border-border-subtle space-y-2">
          <p className="text-[11px] font-semibold text-text-0">Link to a page</p>
          {pageLinkFields.map(({ key, label }) => (
            <label key={key} className="block text-[10.5px] text-text-2">
              <span className="block mb-1">{label}</span>
              <select
                aria-label={`${label}: choose a page`}
                value={resolveLink(String(block.props[key] ?? ''), pages).pageId ?? ''}
                onChange={(event) => { if (event.target.value) linkPages(block.id, event.target.value, key) }}
                className="w-full px-2 py-1.5 rounded border border-border-default bg-bg-3 text-text-0 text-[11px]"
              >
                <option value="">Choose a page...</option>
                {pages.map((page) => <option key={page.id} value={page.id}>{page.name}</option>)}
              </select>
            </label>
          ))}
          <p className="text-[10px] text-text-3">The button will open the selected page in your website.</p>
        </div>
      )}
      {schema.groups.map((group, index) => (
        <Group key={group.title} title={group.title} defaultOpen={index === 0}>
          {Object.entries(group.fields).map(([key, field]) => (
            <FieldRenderer
              key={key}
              field={field}
              // `variant` is stored on the block itself; everything else lives
              // in props. Keeping that detail here means schemas can describe
              // both in one list.
              value={key === 'variant' ? block.variant : block.type === 'navbar' && key === 'autoPageLinks' ? block.props[key] !== false : block.props[key]}
              onChange={(value) => {
                if (key === 'variant') {
                  updateBlock(block.id, { variant: value as string })
                } else if (block.type === 'navbar' && key === 'links' && Array.isArray(value) && Array.isArray(block.props.links) && value.length !== block.props.links.length && block.props.autoPageLinks !== false) {
                  // Adding or removing a menu item by hand is a decision to own the menu: left on
                  // automatic, the next page added would put the removed item straight back.
                  updateBlockProps(block.id, { links: value, autoPageLinks: false })
                } else {
                  updateBlockProps(block.id, { [key]: value })
                }
              }}
            />
          ))}
        </Group>
      ))}
    </div>
  )
}

/**
 * The content-related half of the Advanced tab: a name other links can point to,
 * and class names for the owner's own stylesheet.
 */
export function AdvancedContentFields({ block }: { block: BlockConfig }) {
  const updateBlockProps = useConfigStore((s) => s.updateBlockProps)
  return (
    <div>
        <div className="px-3 pt-3">
          <FieldRenderer field={{kind:'text',label:'Section anchor',help:'A unique name for links to this section, such as contact.'}} value={block.props.anchorId} onChange={value=>updateBlockProps(block.id,{anchorId:String(value).replace(/[^a-zA-Z0-9_-]/g,'')})}/>
        </div>
  
      <div className="px-3 pt-3 pb-3 border-b border-border-subtle">
        <FieldRenderer field={{ kind: 'text', label: 'CSS classes', help: 'Space-separated class names for your stylesheet.' }} value={block.props.cssClasses} onChange={(value) => updateBlockProps(block.id, { cssClasses: String(value).replace(/[^a-zA-Z0-9_ -]/g, '') })} />
      </div>
    </div>
  )
}

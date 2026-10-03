import { useContext, type CSSProperties, type ReactNode } from 'react'
import { EditableContext } from './editable-context'
import { readPath } from './inline-edit'
import { resolveLink } from '@/lib/site-links'
import { elementCss, elementToken } from './element-style'

/** A saved action shared by section renderers and the standalone Button. */
export function EditableAction({ path, urlPath, label, className, style, children, fallback = '', fallbackUrl = '', current = false }: {
  path: string; urlPath: string; label?: string; className?: string;
  style?: CSSProperties; children?: ReactNode; fallback?: string; fallbackUrl?: string; current?: boolean;
}) {
  const context = useContext(EditableContext)
  if (!context) return <span className={className} style={style}>{children ?? fallback}</span>
  const { block, pages, base, asFiles, onPage, viewport } = context
  const text = String(readPath(block.props, path) ?? fallback)
  const raw = String(readPath(block.props, urlPath) ?? (urlPath.startsWith('linkUrls.') || urlPath.startsWith('columnUrls.') ? readPath(block.props, path) : undefined) ?? fallbackUrl)
  const target = resolveLink(raw, pages, base, asFiles)
  const newTab = readPath(block.props, `${urlPath}NewTab`) ?? target.external
  // An exported page names itself; resolved here, against the pages the export is drawing, because
  // the editor's own store is not what a static render reads.
  const isCurrent = context.activePageId !== undefined ? target.pageId === context.activePageId : current
  return <a data-element={path} data-element-kind="button" data-element-label={label ?? 'Button'}
    data-element-url={urlPath} data-element-value={text} data-element-destination={raw} data-element-token={elementToken(block, path)}
    href={target.href} target={newTab ? '_blank' : undefined} rel={newTab ? 'noopener noreferrer' : undefined}
    aria-current={isCurrent ? 'page' : undefined} className={`${className ?? ''}${isCurrent ? ' is-active' : ''}`} style={{ ...style, ...elementCss(block, path, viewport) }}
    onClick={event => {
      if (target.href === '#') event.preventDefault()
      else if (target.pageId && onPage && !newTab && !event.ctrlKey && !event.metaKey) {
        event.preventDefault(); onPage(target.pageId)
        const hash = target.href.indexOf('#')
        if (hash >= 0) requestAnimationFrame(() => document.getElementById(decodeURIComponent(target.href.slice(hash + 1)))?.scrollIntoView())
      }
    }}><span data-edit={path}>{text}</span>{children}</a>
}

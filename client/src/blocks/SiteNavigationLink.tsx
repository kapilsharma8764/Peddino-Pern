import { useContext } from 'react'
import { useConfigStore } from '@/store/configStore'
import { ensurePages } from '@/store/site-shape'
import { resolveLink, type NavigationLink } from '@/lib/site-links'
import { EditableAction } from './EditableAction'
import { EditableContext } from './editable-context'

export function SiteNavigationLink({ link, className, index, path, urlPath }: { link: string | NavigationLink; className?: string; index?:number; path?:string; urlPath?:string }) {
  const context = useContext(EditableContext)
  const config = useConfigStore(state => state.config)
  const onPage = useConfigStore(state => state.setActivePage)
  const editorPageId = useConfigStore(state => state.activePageId)
  // An exported page says which page it is; the editor's own open page is only for the canvas.
  const activePageId = context?.activePageId ?? editorPageId
  const label = typeof link === 'string' ? link : link.label
  const raw = typeof link === 'string' ? link : link.url
  const target = resolveLink(raw, ensurePages(config))
  if(context && index !== undefined) {
    const count = Array.isArray(context.block.props.links) ? context.block.props.links.length : 0
    path = index < count ? `links.${index}` : `extraLinks.${index-count}.label`
    urlPath = index < count ? `linkUrls.${index}` : `extraLinks.${index-count}.url`
  }
  if(context && path && urlPath) {
    // Existing string menus keep their original destination until explicitly edited.
    return <EditableAction path={path} urlPath={urlPath} label="Navigation Link" fallback={label} fallbackUrl={raw} className={className} current={target.pageId === activePageId}/>
  }
  return <a href={target.href} aria-current={target.pageId === activePageId ? 'page' : undefined} className={`${className ?? ''}${target.pageId === activePageId ? ' is-active' : ''}`} onClick={event=>{
    if(target.pageId) {event.preventDefault();onPage(target.pageId)}
    else if(target.href==='#') event.preventDefault()
  }}>{label}</a>
}

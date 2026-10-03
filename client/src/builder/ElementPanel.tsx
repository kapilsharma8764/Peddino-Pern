import { useState } from 'react'
import type { BlockConfig } from '@/blocks/types'
import { useEditorStore, type ElementTarget } from '@/store/editorStore'
import { useConfigStore } from '@/store/configStore'
import { ensurePages } from '@/store/site-shape'
import { readPath, writePath } from '@/blocks/inline-edit'
import { elementCss, elementStyles, type ElementStyle } from '@/blocks/element-style'
import { resolveLink } from '@/lib/site-links'
import { FieldRenderer } from './fields/FieldRenderer'
import type { Field } from '@/widgets/field-types'

const styles: Record<string, Field> = {
  color: { kind: 'color', label: 'Text colour' },
  backgroundColor: { kind: 'color', label: 'Button colour' },
  fontSize: { kind: 'number', label: 'Font size', min: 8, max: 160, unit: 'px' },
  fontWeight: { kind: 'select', label: 'Font weight', options: [{ value:'400',label:'Regular' },{ value:'600',label:'Semibold' },{ value:'700',label:'Bold' }] },
  textAlign: { kind: 'select', label: 'Text alignment', options: ['left','center','right'].map(value => ({value,label:value})) },
  borderColor: { kind: 'color', label: 'Border colour' },
  borderWidth: { kind: 'number', label: 'Border width', min:0, max:20, unit:'px' },
  borderRadius: { kind: 'number', label: 'Corner radius', min:0, max:100, unit:'px' },
  paddingTop: { kind:'number',label:'Top padding',min:0,max:100,unit:'px' },
  paddingBottom: { kind:'number',label:'Bottom padding',min:0,max:100,unit:'px' },
  paddingLeft: { kind:'number',label:'Left padding',min:0,max:100,unit:'px' },
  paddingRight: { kind:'number',label:'Right padding',min:0,max:100,unit:'px' },
  marginTop: { kind:'number',label:'Top margin',min:0,max:100,unit:'px' },
  marginBottom: { kind:'number',label:'Bottom margin',min:0,max:100,unit:'px' },
  fontFamily: { kind: 'text', label: 'Font family', placeholder: 'e.g. Georgia, serif' },
  lineHeight: { kind: 'number', label: 'Line height (x10)', min: 8, max: 30 },
  letterSpacing: { kind: 'number', label: 'Letter spacing', min: -5, max: 30, unit: 'px' },
  width: { kind: 'text', label: 'Width', placeholder: '100%, 320px or auto' },
  maxWidth: { kind: 'text', label: 'Maximum width', placeholder: '100% or 640px' },
  height: { kind: 'text', label: 'Height', placeholder: 'auto or 240px' },
  objectFit: { kind: 'select', label: 'Image fit', options: ['cover','contain','fill'].map(value => ({value,label:value})) },
  opacity: { kind: 'number', label: 'Opacity (%)', min: 0, max: 100 },
}
// Only the controls that make sense for the element type are offered.
const styleKeys: Record<ElementTarget['kind'], string[]> = {
  text: ['color','fontFamily','fontSize','fontWeight','lineHeight','letterSpacing','textAlign','paddingTop','paddingBottom','paddingLeft','paddingRight','marginTop','marginBottom'],
  image: ['width','maxWidth','height','objectFit','borderRadius','borderColor','borderWidth','opacity','marginTop','marginBottom'],
  button: ['color','backgroundColor','fontSize','fontWeight','textAlign','borderColor','borderWidth','borderRadius','paddingTop','paddingBottom','paddingLeft','paddingRight','marginTop','marginBottom'],
}
const styleLabels: Partial<Record<ElementTarget['kind'], Record<string,string>>> = { text: { backgroundColor: 'Background colour' }, image: {} }
const input = 'w-full rounded border border-border-default bg-bg-2 px-3 py-2 text-sm text-text-0'

export function ElementPanel({ block, target, styleOnly = false }: { block:BlockConfig; target:ElementTarget; styleOnly?:boolean }) {
  const config = useConfigStore(s => s.config)
  const update = useConfigStore(s => s.updateBlockProps)
  const addPage = useConfigStore(s => s.addPage)
  const selectBlock = useEditorStore(s => s.selectBlock)
  const device = useEditorStore(s => s.viewport)
  const pages = ensurePages(config)
  const [creatingPage, setCreatingPage] = useState(false)
  const [newPageName, setNewPageName] = useState('')
  const raw = String(target.urlPath ? readPath(block.props, target.urlPath) ?? (target.urlPath.startsWith('linkUrls.') || target.urlPath.startsWith('columnUrls.') ? readPath(block.props,target.path) : target.defaultUrl) ?? '' : '')
  const inferred = !raw ? 'none' : /^mailto:/i.test(raw) ? 'email' : /^tel:/i.test(raw) ? 'phone' : raw.startsWith('#') ? 'anchor' : resolveLink(raw, pages).pageId ? 'page' : 'external'
  const [linkType, setLinkType] = useState(inferred)
  function set(path:string, value:unknown) {
    let props = block.props
    if(path===target.path && target.urlPath && readPath(props,target.urlPath)===undefined && raw) props=writePath(props,target.urlPath,raw)
    if(path===target.path && /^(links\.|columns\.)/.test(path) && (block.type==='navbar' || block.type==='footer')) props={...props,autoPageLinks:false}
    update(block.id, writePath(props,path,value))
  }
  function setStyle(key:string,value:unknown) {
    const all = elementStyles(block)
    const current = all[target.path] ?? {}
    const entry = { [key]: value === '' ? undefined : value, ...(key === 'borderWidth' ? { borderStyle: 'solid' } : {}) }
    const next:ElementStyle = device === 'desktop' ? {...current,...entry} : {...current,[device]:{...current[device],...entry}}
    update(block.id, {elementStyles:{...all,[target.path]:next}})
  }
  const shown = elementCss(block,target.path,device)
  return <div className="flex-1 overflow-y-auto p-4" data-testid="element-inspector">
    <button className="text-xs text-brand underline mb-3" onClick={() => selectBlock(block.id)}>Select {block.type} section</button>
    <h2 className="text-base font-semibold mb-1">{target.label}</h2>
    <p className="text-xs text-text-2 mb-4">{styleOnly ? `Style for ${device}. Changes apply only to this element.` : 'Edit this element. Changes appear on the page.'}</p>
    {styleOnly ? <>
      {(styleKeys[target.kind] ?? Object.keys(styles)).map(key => {
        const field = styles[key]
        const raw = shown[key as keyof typeof shown]
        // Line height is stored unitless (1.6) but edited in tenths; opacity is stored 0–1.
        const value = key === 'lineHeight' && typeof raw === 'number' ? Math.round(raw * 10) : key === 'opacity' && typeof raw === 'number' ? Math.round(raw * 100) : raw
        const store = (v: unknown) => setStyle(key, v === '' || v === undefined ? '' : key === 'lineHeight' ? Number(v) / 10 : key === 'opacity' ? Number(v) / 100 : v)
        return <FieldRenderer key={key} field={{ ...field, label: styleLabels[target.kind]?.[key] ?? field.label }} value={value} onChange={store}/>
      })}
      <button className={input} onClick={() => {
        const all=elementStyles(block), current={...all[target.path]}
        if(device==='desktop') { const {tablet,mobile}=current; update(block.id,{elementStyles:{...all,[target.path]:{tablet,mobile}}}) }
        else { delete current[device]; update(block.id,{elementStyles:{...all,[target.path]:current}}) }
      }}>Reset {device} style</button>
    </> : <>
      <FieldRenderer field={{kind:target.kind==='image'?'image':target.kind==='text'?'textarea':'text',label:target.kind==='image'?'Replace image':target.kind==='text'?target.label:'Button text'}} value={readPath(block.props,target.path) ?? target.defaultValue} onChange={value=>set(target.path,value)}/>
      {target.kind === 'image' && target.altPath && <FieldRenderer field={{kind:'text',label:'Image description',help:'Describe the image for accessibility and search engines.'}} value={readPath(block.props,target.altPath) ?? ''} onChange={value=>set(target.altPath!,value)}/>} 
      {target.urlPath && <>
        <label className="block text-sm mb-4">Link type<select aria-label="Link type" className={input} value={linkType} onChange={event=>{
          const kind=event.target.value; setLinkType(kind)
          if(kind==='none') set(target.urlPath!,'')
        }}>
          <option value="none">No link</option><option value="page">Page on this website</option><option value="external">External website</option><option value="anchor">Section anchor</option><option value="email">Email</option><option value="phone">Phone</option>
        </select></label>
        {linkType==='page' ? <label className="block text-sm mb-4">Destination page<select className={input} aria-label="Destination page" value={creatingPage ? '__new__' : resolveLink(raw,pages).pageId ?? ''} onChange={event=>{
            if(event.target.value==='__new__') { setCreatingPage(true); return }
            setCreatingPage(false)
            set(target.urlPath!,event.target.value ? `page:${event.target.value}` : '')
          }}>
          <option value="">Choose a page</option>{pages.map(page=><option key={page.id} value={page.id}>{page.name}</option>)}
          <option value="__new__">+ Create new page…</option>
        </select>
        {creatingPage && <div className="mt-2 flex gap-2">
          <input
            autoFocus
            className={input}
            placeholder="Page name, e.g. Admission"
            value={newPageName}
            onChange={event=>setNewPageName(event.target.value)}
            onKeyDown={event=>{
              if(event.key!=='Enter' || !newPageName.trim()) return
              const id=addPage(newPageName.trim())
              set(target.urlPath!,`page:${id}`)
              setCreatingPage(false); setNewPageName('')
            }}
          />
          <button
            type="button"
            className="shrink-0 rounded bg-brand px-3 py-2 text-sm text-bg-0 disabled:opacity-40"
            disabled={!newPageName.trim()}
            onClick={()=>{
              const id=addPage(newPageName.trim())
              set(target.urlPath!,`page:${id}`)
              setCreatingPage(false); setNewPageName('')
            }}
          >Create</button>
        </div>}
        </label> : linkType!=='none' && <FieldRenderer field={{kind:'text',label:'Link destination',placeholder:linkType==='email'?'hello@example.com':linkType==='phone'?'+1234567890':linkType==='anchor'?'#contact':'https://example.com'}} value={raw.replace(linkType==='email'?/^mailto:/i:linkType==='phone'?/^tel:/i:/^$/, '')} onChange={value=>{
          const text=String(value); const prefix=linkType==='email'?'mailto:':linkType==='phone'?'tel:':linkType==='anchor'?'#':''
          set(target.urlPath!,text ? prefix && !text.startsWith(prefix) ? prefix+text : text : '')
        }}/>} 
        <p className="text-xs text-text-2 mb-4" role="status">{!raw || resolveLink(raw,pages).href==='#' ? 'No link set — choose a valid destination.' : `Destination: ${resolveLink(raw,pages).pageId ? `${pages.find(p=>p.id===resolveLink(raw,pages).pageId)?.name} page` : raw}`}</p>
        <FieldRenderer field={{kind:'switch',label:'Open in new tab'}} value={readPath(block.props,`${target.urlPath}NewTab`) ?? resolveLink(raw,pages).external} onChange={value=>set(`${target.urlPath}NewTab`,value)}/>
      </>}
    </>}
  </div>
}

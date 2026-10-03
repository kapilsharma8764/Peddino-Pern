import { EditableAction } from './EditableAction'
import { EditableContext } from './editable-context'
import { createElement, useState, type CSSProperties } from 'react'
import type { BlockConfig, PageConfig } from './types'
import { getIcon } from './icons'
import { renderMarkdown } from '@/lib/markdown'
import { useConfigStore } from '@/store/configStore'
import { ensurePages } from '@/store/site-shape'
import { OriginalDocument } from './OriginalDocument'

const panel: CSSProperties = { padding: '24px', overflowWrap: 'anywhere' }
const card: CSSProperties = { border: '1px solid var(--color-border-default)', borderRadius: 12, padding: 24 }
const accent = 'var(--color-brand, #6366f1)'
const string = (value: unknown, fallback = '') => typeof value === 'string' ? value : fallback
const numeric = (value: unknown, fallback: number, min: number, max: number) => Math.max(min, Math.min(max, Number.isFinite(Number(value)) ? Number(value) : fallback))
const records = (value: unknown): Record<string, unknown>[] => Array.isArray(value) ? value.filter(item => item && typeof item === 'object' && !Array.isArray(item)) : []
const strings = (value: unknown): string[] => Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
const alignment = (value: unknown): CSSProperties['textAlign'] => value === 'center' || value === 'right' ? value : 'left'
// eslint-disable-next-line react-refresh/only-export-components
export function safeMediaUrl(value: unknown): string {
  const url = string(value).trim()
  return /^(https?:\/\/|\/(?!\/)|data:image\/(?:png|jpeg|gif|webp);base64,)/i.test(url) ? url : ''
}

/** The same component produces editor previews and exported HTML. */
function AdditionalWidgetContent({ block }: {
  block: BlockConfig; pages?: PageConfig[]; base?: string; asFiles?: boolean; onPage?: (id: string) => void
}) {
  const [selected, setSelected] = useState(0)
  const p = block.props
  const list = records(p.items)
  const tab = Math.min(selected, Math.max(0, list.length - 1))
  const id = `widget-${encodeURIComponent(block.id).replace(/%/g, '-')}`
  const icon = (size = 36) => createElement(getIcon(string(p.icon, 'Heart')), { size, 'aria-hidden': true })
  switch (block.type) {
    case 'heading': {
      const level = /^h[1-6]$/.test(string(p.level)) ? string(p.level) : 'h2'
      return <div style={{ ...panel, textAlign: alignment(p.align) }}>{createElement(level, { 'data-edit': 'text', style: { fontSize: level === 'h1' ? '2.5em' : level === 'h2' ? '2em' : '1.4em', fontWeight: 700, margin: 0 } }, string(p.text))}</div>
    }
    case 'button': return <div style={{ ...panel, textAlign: alignment(p.align) }}>{<EditableAction path="label" urlPath="url" label="Button" style={{ display:'inline-block',padding:'12px 24px',borderRadius:8,border:`1px solid ${accent}`,background:block.variant === 'outline' ? 'transparent' : accent,color:block.variant === 'outline' ? accent : '#fff',textDecoration:'none',fontWeight:600 }} />}</div>
    case 'rich-text': return <div style={panel}>{renderMarkdown(string(p.body))}</div>
    case 'icon': return <div style={panel}><span role="img" aria-label={string(p.label, 'Icon')} style={{display:'inline-flex',color:string(p.color, '#6366f1'),padding:block.variant==='circle'?16:0,borderRadius:'50%',border:block.variant==='circle'?'1px solid currentColor':undefined}}>{icon(numeric(p.size,40,16,128))}</span></div>
    case 'icon-box': case 'image-box': return <div style={panel}><article style={card}>
      {block.type === 'icon-box' ? icon() : safeMediaUrl(p.image) && <div className="el-fit-cover el-fit-cover--4x3 rounded-lg"><img data-image="image" src={safeMediaUrl(p.image)} alt={string(p.alt)} loading="lazy" /></div>}
      <h3 data-edit="title" style={{fontSize:24,fontWeight:600,margin:'16px 0 8px'}}>{string(p.title)}</h3><p data-edit="body" style={{whiteSpace:'pre-wrap',marginBottom:16}}>{string(p.body)}</p>{p.label ? <EditableAction path="label" urlPath="url" label="Card Button" style={{color:accent}} /> : null}
    </article></div>
    case 'social-icons': return <div style={{...panel,display:'flex',flexWrap:'wrap',gap:12}}>{list.map((_,index)=><span key={index}>{<EditableAction path={`items.${index}.title`} urlPath={`items.${index}.url`} label="Social Link" style={{display:'inline-block',padding:'10px 16px',borderRadius:24,border:block.variant==='plain'?undefined:'1px solid var(--color-border-default)',color:accent}}/>}</span>)}</div>
    case 'list': return <div style={panel}><h3 style={{fontSize:22,fontWeight:600,marginBottom:12}}>{string(p.title)}</h3>{createElement(block.variant==='numbered'?'ol':'ul',{style:{listStyleType:block.variant==='numbered'?'decimal':'disc',paddingLeft:24}},strings(p.items).map((item,index)=><li key={index} style={{padding:'4px 0'}}>{item}</li>))}</div>
    case 'progress': { const value=numeric(p.value,0,0,100);return <div style={panel}><div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}><span>{string(p.title)}</span><span>{value}%</span></div><div role="progressbar" aria-label={string(p.title)} aria-valuenow={value} aria-valuemin={0} aria-valuemax={100} style={{background:'var(--color-bg-3, #ddd)',borderRadius:20,overflow:'hidden'}}><div style={{width:`${value}%`,height:14,background:string(p.color,'#6366f1')}} /></div></div> }
    case 'tabs': return <div data-widget-tabs="" style={panel}>
      <div role="tablist" aria-label="Content tabs" style={{display:'flex',gap:8,flexWrap:'wrap',borderBottom:'1px solid var(--color-border-default)',paddingBottom:12}}>
        {list.map((item,index)=><button key={index} id={`${id}-tab-${index}`} role="tab" aria-selected={tab===index} aria-controls={`${id}-panel-${index}`} tabIndex={tab===index?0:-1}
          onClick={event=>{event.stopPropagation();setSelected(index)}} onKeyDown={event=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();event.stopPropagation();const next=event.key==='Home'?0:event.key==='End'?list.length-1:(index+(event.key==='ArrowRight'?1:-1)+list.length)%list.length;setSelected(next);event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role=tab]')[next]?.focus()}}
          style={{padding:'10px 18px',borderRadius:8,border:'1px solid var(--color-border-default)',cursor:'pointer'}}>{string(item.title)}</button>)}
      </div>{list.map((item,index)=><div key={index} id={`${id}-panel-${index}`} role="tabpanel" aria-labelledby={`${id}-tab-${index}`} hidden={tab!==index} style={{padding:'20px 0',whiteSpace:'pre-wrap'}}>{string(item.body)}</div>)}
    </div>
    case 'accordion': return <div style={panel}>{list.map((item,index)=><details key={index} style={{...card,marginBottom:8}}><summary onClick={event=>event.stopPropagation()} style={{cursor:'pointer',fontWeight:600}}>{string(item.title)}</summary><p style={{marginTop:14,whiteSpace:'pre-wrap'}}>{string(item.body)}</p></details>)}</div>
    case 'html-embed': return p.originalTemplate ? <OriginalDocument block={block} /> : <div style={panel}><iframe title={string(p.title,'Custom content')} sandbox="" srcDoc={string(p.html)} style={{width:'100%',height:numeric(p.height,240,80,1600),border:0}} /></div>
    case 'spacer': return <div aria-hidden="true" style={{height:numeric(p.height,48,0,800)}} />
    case 'quote': return <blockquote style={{...panel,borderLeft:`4px solid ${accent}`,margin:24}}><p style={{fontSize:24,fontStyle:'italic'}}>{string(p.quote)}</p><footer style={{marginTop:12}}>{string(p.author)}</footer></blockquote>
    case 'badge': return <div style={panel}><span style={{display:'inline-block',padding:'6px 14px',borderRadius:24,background:string(p.color,'#6366f1'),color:'#fff',fontSize:13}}>{string(p.text)}</span></div>
    case 'code-block': return <div style={panel}><div style={{fontSize:12,marginBottom:8}}>{string(p.language)}</div><pre style={{...card,overflowX:'auto',background:'var(--color-bg-2)'}}><code>{string(p.code)}</code></pre></div>
    case 'table': {const columns=strings(p.columns);return <div style={{...panel,overflowX:'auto'}}><table style={{borderCollapse:'collapse',width:'100%'}}><caption style={{fontSize:20,fontWeight:600,padding:12,textAlign:'left'}}>{string(p.caption)}</caption><thead><tr>{columns.map((name,index)=><th key={index} scope="col" style={{border:'1px solid var(--color-border-default)',padding:12,textAlign:'left'}}>{name}</th>)}</tr></thead><tbody>{records(p.rows).map((row,index)=>{const cells=[string(row.title),...string(row.cells).split('|').map(cell=>cell.trim())];return <tr key={index}>{columns.map((_,index)=><td key={index} style={{border:'1px solid var(--color-border-default)',padding:12}}>{cells[index]??''}</td>)}</tr>})}</tbody></table></div>}
    case 'steps': return <ol style={{...panel,listStyle:'none'}}>{list.map((item,index)=><li key={index} style={{display:'flex',gap:16,marginBottom:24}}><span style={{background:accent,color:'#fff',borderRadius:'50%',width:32,height:32,display:'grid',placeItems:'center',flexShrink:0}}>{index+1}</span><div><h3 style={{fontWeight:600}}>{string(item.title)}</h3><p style={{marginTop:6,whiteSpace:'pre-wrap'}}>{string(item.body)}</p></div></li>)}</ol>
    case 'audio': return <div style={panel}><p style={{marginBottom:12}}>{string(p.title)}</p><audio controls preload="none" src={safeMediaUrl(p.src)||undefined} style={{width:'100%'}} aria-label={string(p.title)} /></div>
    case 'back-to-top': return <div style={{...panel,textAlign:'right'}}><a href="#" onClick={event=>event.stopPropagation()}>{string(p.label,'Back to top')} ↑</a></div>
    default: return null
  }
}

export function AdditionalWidget(props: Parameters<typeof AdditionalWidgetContent>[0]) {
  return <EditableContext.Provider value={{ block: props.block, pages: props.pages ?? [], base: props.base, asFiles: props.asFiles, onPage: props.onPage }}><AdditionalWidgetContent {...props}/></EditableContext.Provider>
}

export function AdditionalBlock({block}:{block:BlockConfig}) {
  const config=useConfigStore(state=>state.config)
  const setActivePage=useConfigStore(state=>state.setActivePage)
  return <AdditionalWidgetContent block={block} pages={ensurePages(config)} onPage={setActivePage}/>
}

/** Tab behaviour on exported pages; scoped per widget and independent of React. */
export const additionalWidgetScript = `document.querySelectorAll('[data-widget-tabs]').forEach(function(root){
 const tabs=Array.from(root.querySelectorAll('[role="tab"]')),panels=Array.from(root.querySelectorAll('[role="tabpanel"]'));
 function select(i){tabs.forEach(function(tab,n){tab.setAttribute('aria-selected',String(n===i));tab.tabIndex=n===i?0:-1;panels[n].hidden=n!==i;});}
 tabs.forEach(function(tab,i){tab.addEventListener('click',function(){select(i);});tab.addEventListener('keydown',function(e){if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const next=e.key==='Home'?0:e.key==='End'?tabs.length-1:(i+(e.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;select(next);tabs[next].focus();});});
});`

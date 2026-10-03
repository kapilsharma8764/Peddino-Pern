// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { DndContext } from '@dnd-kit/core'
import { BlockWrapper } from './BlockWrapper'
import { RenderBlock } from './registry'
import { CanvasContext } from './canvas-context'
import { useEditorStore } from '@/store/editorStore'
import { useConfigStore, beginHistoryGroup, endHistoryGroup } from '@/store/configStore'
import { exportSitePages } from '@/lib/export-html'
import { elementToken } from './element-style'
import { resolveLink } from '@/lib/site-links'
import type { BlockConfig, SiteConfig } from './types'

const button:BlockConfig={id:'child',type:'button',variant:'solid',props:{label:'Child action',url:'/about'}}
const container:BlockConfig={id:'parent',type:'container',variant:'default',props:{},children:[button]}
const hero:BlockConfig={id:'hero',type:'hero',variant:'centered',props:{headline:'Hello',subheadline:'World',primaryCta:'Go',primaryCtaUrl:'/about#team',secondaryCta:'Email',secondaryCtaUrl:'mailto:hello@example.com'}}
function site():SiteConfig {return {name:'Test',header:[],footer:[],blocks:[container,hero],pages:[{id:'home',name:'Home',path:'/',blocks:[container,hero]},{id:'about',name:'About',path:'/about',blocks:[]}]}}
beforeEach(()=>{
  cleanup(); endHistoryGroup()
  useConfigStore.getState().setConfig(structuredClone(site()))
  useEditorStore.setState({selectedBlockId:null,selectedElement:null,previewMode:false,viewport:'desktop'})
  HTMLElement.prototype.scrollIntoView=()=>{}
})

describe('editing document elements',()=>{
  it('captures a nested action without navigating or selecting its parent',()=>{
    render(<DndContext><CanvasContext.Provider value={{region:'page',dragging:false}}><BlockWrapper block={container} region="page" index={0} isSelected={false} onSelect={()=>useEditorStore.getState().selectBlock('parent')}><RenderBlock block={container}/></BlockWrapper></CanvasContext.Provider></DndContext>)
    fireEvent.click(screen.getByText('Child action'))
    expect(useEditorStore.getState().selectedBlockId).toBe('child')
    expect(useEditorStore.getState().selectedElement?.path).toBe('label')
    expect(useConfigStore.getState().activePageId).toBe('home')
    const label=screen.getByText('Child action')
    fireEvent.doubleClick(label)
    label.textContent='Changed child'
    fireEvent.blur(label)
    const saved=useConfigStore.getState().config.pages![0].blocks[0]
    expect(saved.props.label).toBeUndefined()
    expect(saved.children![0].props.label).toBe('Changed child')
    useConfigStore.getState().undo()
    expect(useConfigStore.getState().config.pages![0].blocks[0].children![0].props.label).toBe('Child action')
  })

  it('groups an inspector typing session into one undo and clears deleted selection',()=>{
    const store=useConfigStore.getState()
    beginHistoryGroup()
    store.updateBlockProps('hero',{primaryCta:'A'})
    store.updateBlockProps('hero',{primaryCta:'AB'})
    store.updateBlockProps('hero',{primaryCta:'ABC'})
    endHistoryGroup()
    expect(useConfigStore.getState().undoStack).toHaveLength(1)
    store.undo()
    expect(useConfigStore.getState().config.pages![0].blocks[1].props.primaryCta).toBe('Go')
    store.redo()
    expect(useConfigStore.getState().config.pages![0].blocks[1].props.primaryCta).toBe('ABC')
    useEditorStore.getState().selectElement('child',{path:'label',label:'Button',kind:'button',urlPath:'url'})
    store.removeBlock('child')
    expect(useEditorStore.getState().selectedBlockId).toBeNull()
  })

  it('exports saved action destinations and isolated responsive button styles',()=>{
    const config=site()
    const styled={...hero,props:{...hero.props,elementStyles:{primaryCta:{backgroundColor:'#123456',mobile:{fontSize:19}}}}}
    config.pages![0].blocks=[styled,{id:'cta',type:'cta',variant:'simple',props:{headline:'Join',buttonText:'Visit',buttonUrl:'https://example.com',buttonUrlNewTab:true}}]
    config.blocks=config.pages![0].blocks
    const pages=exportSitePages(config,{fileLinks:true})
    const doc=new DOMParser().parseFromString(pages[0].html,'text/html')
    expect(doc.querySelector('[data-element="primaryCta"]')?.getAttribute('href')).toBe('about.html#team')
    expect(doc.querySelector('[data-element="secondaryCta"]')?.getAttribute('href')).toBe('mailto:hello@example.com')
    expect(doc.querySelector('[data-element="buttonText"]')?.getAttribute('target')).toBe('_blank')
    expect(pages[0].html).toContain(elementToken(styled,'primaryCta'))
    expect(pages[0].html).toContain('font-size:19px !important')
    expect(doc.querySelector('[data-element="secondaryCta"]')?.getAttribute('style') ?? '').not.toContain('#123456')
    expect(doc.querySelector('[data-element-selected]')).toBeNull()
  })

  it('resolves anchors under the published base and blocks unsafe destinations',()=>{
    const pages=site().pages!
    expect(resolveLink('/about#team',pages,'/site/demo').href).toBe('/site/demo/about#team')
    for(const raw of ['javascript:alert(1)','data:text/html,hi','vbscript:test']) expect(resolveLink(raw,pages).href).toBe('#')
    expect(resolveLink('tel:+123456',pages).href).toBe('tel:+123456')
  })
})

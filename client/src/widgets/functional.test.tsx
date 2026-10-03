// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { blockMetadata } from '@/lib/block-metadata'
import { widgetSchemas } from './schemas'
import { FunctionalWidget } from './FunctionalWidget'
import { functionalWidgets } from './catalogue'
import { mountWidgets } from './runtime'
import { exportSiteToHTML } from '@/lib/export-html'
import { useConfigStore } from '@/store/configStore'
import { findBlock, newContainer } from '@/lib/block-tree'
import type { BlockConfig } from '@/blocks/types'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { layoutTypes } from './expanded'

const make = (type: string): BlockConfig => {
  const meta = blockMetadata.find(row => row.type === type)!
  return { id: `test-${type}`, type: meta.type, variant: meta.variants[0], props: structuredClone(meta.defaultProps) }
}
let cleanup = () => {}
afterEach(() => { cleanup(); document.body.innerHTML = ''; vi.useRealTimers() })

describe('functional widget integration', () => {
  it('registers unique definitions with editable defaults and export markup', () => {
    expect(new Set(blockMetadata.map(widget => widget.type)).size).toBe(blockMetadata.length)
    for (const definition of functionalWidgets) {
      const block = make(definition.type)
      expect(widgetSchemas[block.type]).toBeDefined()
      expect(definition.category).toBeTruthy()
      for (const key of Object.keys(definition.fields)) expect(block.props[key], `${block.type}.${key}`).not.toBeUndefined()
      expect(renderToStaticMarkup(createElement(FunctionalWidget, { block }))).toContain('data-fw=')
      expect(exportSiteToHTML({ name: 'Test', blocks: [block] })).toContain(`data-type="${block.type}"`)
    }
  })
  it.each(blockMetadata.map(widget=>widget.type))('preserves %s across nested editing, history, duplication and JSON reload', type => {
    const block = make(type)
    const container = newContainer([])
    const store = useConfigStore
    store.getState().setConfig({ name: 'Lifecycle', blocks: [container] })
    store.getState().addBlock(block, 0, container.id)
    expect(findBlock(store.getState().config.blocks, block.id)).toBeTruthy()
    store.getState().updateBlockProps(block.id, { anchorId: 'edited-widget' })
    store.getState().updateBlock(block.id, { style: { paddingTop: 24, mobile: { paddingTop: 8 } } })
    store.getState().duplicateBlock(block.id)
    store.getState().undo(); store.getState().redo()
    const saved = JSON.parse(JSON.stringify(store.getState().config))
    store.getState().setConfig(saved)
    expect(findBlock(store.getState().config.blocks, block.id)?.style?.mobile?.paddingTop).toBe(8)
    expect(exportSiteToHTML(saved)).toContain('edited-widget')
    store.getState().removeBlock(block.id)
    expect(findBlock(store.getState().config.blocks, block.id)).toBeNull()
    store.getState().undo()
    expect(findBlock(store.getState().config.blocks, block.id)).toBeTruthy()
  })
  it('moves carousel slides using click and keyboard in exported markup', () => {
    document.body.innerHTML = renderToStaticMarkup(createElement(FunctionalWidget, { block: make('carousel') }))
    cleanup = mountWidgets(document)
    const slides = document.querySelectorAll<HTMLElement>('[data-slide]')
    document.querySelector<HTMLButtonElement>('[data-next]')!.click()
    expect(slides[0].hidden).toBe(true); expect(slides[1].hidden).toBe(false)
    document.querySelector('[data-fw]')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }))
    expect(slides[0].hidden).toBe(false)
  })
  it('updates countdown and stops timers on unmount', () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date('2026-12-31T23:59:58Z'))
    document.body.innerHTML = renderToStaticMarkup(createElement(FunctionalWidget, { block: make('countdown') }))
    cleanup = mountWidgets(document)
    expect(document.querySelector('output')?.textContent).toContain('2s')
    vi.advanceTimersByTime(3000)
    expect(document.querySelector('output')?.textContent).toBe('We are live!')
    cleanup(); expect(vi.getTimerCount()).toBe(0)
  })
  it('has 200 functional definitions and creates a complete standalone browser fixture', () => {
    expect(blockMetadata.length).toBeGreaterThanOrEqual(200)
    const image='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aHn8AAAAASUVORK5CYII='
    const blocks=functionalWidgets.map(definition=>{
      const block=make(definition.type)
      if(layoutTypes.has(block.type))block.children=[{id:`child-${block.id}`,type:'heading' as const,variant:'default',props:{text:'Nested child'}}]
      if(block.props.items&&Array.isArray(block.props.items))block.props.items=block.props.items.map(item=>typeof item==='object'&&item?{...item,...('image' in item?{image}: {})}:item)
      if(block.type==='form-container')block.children=['input-email','submit-button'].map(type=>({...make(type),id:`${block.id}-${type}`}))
      return block
    })
    const report=resolve('../reports');mkdirSync(report,{recursive:true})
    const categories=Object.fromEntries([...new Set(blockMetadata.map(w=>w.category))].map(category=>[category,blockMetadata.filter(w=>w.category===category).length]))
    writeFileSync(resolve(report,'widget-inventory.json'),JSON.stringify({count:blockMetadata.length,categories,widgets:blockMetadata.map(w=>({type:w.type,name:w.label,category:w.category,description:w.description,fields:widgetSchemas[w.type].groups.flatMap(group=>Object.keys(group.fields))}))},null,2))
    writeFileSync(resolve(report,'widget-browser-fixture.html'),exportSiteToHTML({name:'Widget validation',blocks}))
  })
})

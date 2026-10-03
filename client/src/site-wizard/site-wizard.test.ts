import { describe, expect, it } from 'vitest'
import { layouts, layoutMap } from './registry/layouts'
import { siteTypes, headerChoices, footerChoices } from './registry/site-types'
import { compile, isKnownWidget, pageBlocks } from './compile'
import { fillEmpty, quickPage, quickSite } from './spec'
import { specFromJson, specToJson } from './template-io'
import { exportSitePages } from '@/lib/export-html'

describe('registry', () => {
  it('only names widgets that exist in the library', () => {
    const missing: string[] = []
    for (const layout of layouts) for (const row of layout.rows) for (const slot of row.slots) {
      if (!isKnownWidget(slot.default)) missing.push(`${layout.id}.${row.id}.${slot.name} default ${slot.default}`)
      for (const type of slot.accepts) if (!isKnownWidget(type)) missing.push(`${layout.id}.${row.id}.${slot.name} accepts ${type}`)
    }
    for (const type of siteTypes) {
      for (const ref of Object.values(type.fit)) if (!isKnownWidget(ref)) missing.push(`${type.id} fit ${ref}`)
      if (!isKnownWidget(type.footer)) missing.push(`${type.id} footer ${type.footer}`)
      for (const id of type.pages) if (!layoutMap.has(id)) missing.push(`${type.id} page ${id}`)
    }
    for (const choice of [...headerChoices, ...footerChoices]) if (!isKnownWidget(choice.ref)) missing.push(choice.ref)
    expect(missing).toEqual([])
  })

  it('has the twelve website types', () => expect(siteTypes).toHaveLength(12))
})

describe('compile', () => {
  it('builds a site with one header, one footer and a menu for every page', () => {
    for (const type of siteTypes) {
      const config = compile(quickSite(type.id, 'Test'))
      expect(config.pages).toHaveLength(type.pages.length)
      expect(config.header).toHaveLength(1)
      expect(config.footer).toHaveLength(1)
      expect(config.pages?.[0].path).toBe('/')
      for (const page of config.pages ?? []) expect(page.blocks.length).toBeGreaterThan(0)
    }
  })

  it('swaps a split row and changes grid columns and the sidebar', () => {
    const about = quickPage('business', 'about')
    const normal = pageBlocks(about)[0].children!.map((child) => child.type)
    const reversed = pageBlocks({ ...about, options: { ...about.options, reverse: true } })[0].children!.map((child) => child.type)
    expect(reversed).toEqual([...normal].reverse())

    const services = quickPage('business', 'services')
    const grid = (columns: 2 | 3 | 4) => pageBlocks({ ...services, options: { ...services.options, columns } })[1].children!.length
    expect([grid(2), grid(3), grid(4)]).toEqual([2, 3, 4])

    const blog = quickPage('blog', 'blog-list')
    const side = (sidebar: 'left' | 'right' | 'none') => pageBlocks({ ...blog, options: { ...blog.options, sidebar } })
    expect(side('none')).toHaveLength(1)
    expect(side('none')[0].type).not.toBe('container')
    expect(side('left')[0].children![1].type).toBe('blog-grid')
    expect(side('right')[0].children![0].type).toBe('blog-grid')
  })

  it('changes the section order', () => {
    const home = quickPage('business', 'home')
    const reordered = pageBlocks({ ...home, options: { ...home.options, order: ['cta', ...home.options.order.filter((id) => id !== 'cta')] } })
    expect(reordered[0].type).toBe('cta')
  })

  it('fills text only into props the widget already has, and leaves widget defaults alone', () => {
    const home = quickPage('business', 'home')
    const filled = pageBlocks({ ...home, content: { 'hero.widget': { headline: 'Hello', notAProp: 'x' } } })[0]
    expect(filled.props.headline).toBe('Hello')
    expect('notAProp' in filled.props).toBe(false)
  })

  it('only fills empty slots when asked to', () => {
    const spec = quickSite('business')
    spec.pages[0].slots['hero.widget'] = ''
    spec.pages[0].slots['cta.widget'] = 'banner'
    const next = fillEmpty(spec)
    expect(next.pages[0].slots['hero.widget']).toBeTruthy()
    expect(next.pages[0].slots['cta.widget']).toBe('banner')
  })
})

describe('export and templates', () => {
  it('exports every page as HTML with the shared header and footer', () => {
    const config = compile(quickSite('business', 'Acme'))
    const files = exportSitePages(config, { fileLinks: true })
    expect(files.map((file) => file.file)).toContain('index.html')
    for (const file of files) expect(file.html).toContain('<html')
    expect(files[0].html).toContain('sb-stack')
  })

  it('round-trips a template through JSON and rejects bad files', () => {
    const spec = quickSite('portfolio', 'Me')
    expect(specFromJson(specToJson(spec))).toEqual(spec)
    expect(() => specFromJson('nope')).toThrow()
    expect(() => specFromJson(JSON.stringify({ format: 'peddino-site-template', site: { ...spec, header: 'nonsense' } }))).toThrow()
  })
})

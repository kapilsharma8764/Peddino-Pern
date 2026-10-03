// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import type { BlockConfig, SiteConfig } from '@/blocks/types'
import { migrateButtons } from './auto-link-buttons'
import { regionColorVars } from './region-colors'
import { sectionColorCss } from './section-colors'
import { applyOriginalColors } from './original-colors'
import { normalizeOriginalLinks } from './original-links'
import { exportSitePages } from './export-html'
import { useConfigStore } from '@/store/configStore'
import { syncMenu } from '@/store/site-shape'

const button = (label: string, extra = {}): BlockConfig => ({ id: label, type: 'button', variant: 'default', props: { label, ...extra } })
const site = (blocks: BlockConfig[]): SiteConfig => ({ name: 'School', blocks, header: [], footer: [], pages: [
  { id: 'home', name: 'Home', path: '/', blocks },
  { id: 'about', name: 'About', path: '/about', blocks: [] },
  { id: 'contact', name: 'Contact', path: '/contact', blocks: [] },
] })

describe('safe load migration', () => {
  it('links clear wording, preserves all existing actions and does not guess unknown text', () => {
    const next = migrateButtons(site([button('Contact'), button('Learn more'), button('Download'), button('About', { url: '#' }), button('Contact us', { action: 'modal' }), button('Read more', { url: 'page:deleted' })]))
    expect(next.blocks.map(b => b.props.url)).toEqual(['page:contact', 'page:about', undefined, '#', undefined, 'page:deleted'])
    expect(next.migrationVersion).toBe(1)
    expect(migrateButtons(next)).toBe(next)
    next.blocks[0].props.url = ''
    expect(migrateButtons(next).blocks[0].props.url).toBe('')
  })
  it('runs on setConfig and browser hydration, without losing active page', () => {
    useConfigStore.getState().setConfig(site([button('Contact')]))
    expect(useConfigStore.getState().config.blocks[0].props.url).toBe('page:contact')
    const merged = useConfigStore.persist.getOptions().merge!({ config: site([button('Contact')]), activePageId: 'about' }, useConfigStore.getState())
    expect(merged.activePageId).toBe('about')
    expect(merged.config.blocks).toEqual([])
    expect(merged.config.pages![0].blocks[0].props.url).toBe('page:contact')
  })
})

describe('region defaults', () => {
  it('uses tokens without mutating old overrides, and exports the same defaults', () => {
    const config = site([])
    config.theme = { headerBackground: '#123456', headerText: '#ffffff', footerBackground: '#654321' }
    config.header = [{ id: 'nav', type: 'navbar', variant: 'default', props: { logo: 'School', links: [] }, colors: { overrides: { background: '#abcdef' } } }]
    const before = JSON.stringify(config.header)
    expect(regionColorVars(config.theme, 'header')['--color-bg-1']).toBe('#123456')
    expect(sectionColorCss(config.theme, config.header[0].colors)?.style['--color-bg-1']).toBe('#abcdef')
    const html = exportSitePages(config)[0].html
    expect(html).toContain('data-theme-region="header"')
    expect(html).toContain('#123456')
    expect(JSON.stringify(config.header)).toBe(before)
  })
})

describe('original colours and navigation', () => {
  const html = '<header><a href="about.html">About</a></header><main><h1>Welcome</h1><p>Text</p></main><footer>Footer</footer>'
  it('excludes shared chrome from page scopes without altering layout', () => {
    const doc = new DOMParser().parseFromString(html, 'text/html')
    applyOriginalColors(doc, { background: '#123456', heading: '#abcdef' }, { headerText: '#ffffff' })
    expect(doc.querySelector('header a')?.getAttribute('data-pt-scope')).toBe('header')
    expect(doc.querySelector('h1')?.getAttribute('data-pt-scope')).toBe('page')
    expect(doc.querySelector('footer')?.getAttribute('data-pt-scope')).toBe('footer')
    expect(doc.querySelector('main')?.hasAttribute('data-pt-page-root')).toBe(true)
    expect(doc.body.children).toHaveLength(3)
    expect(doc.querySelector('#pt-page-colors')?.textContent).toContain('#abcdef')
  })
  it('stores internal page ids and exports renamed paths and page colours', () => {
    const config = site([])
    for (const page of config.pages!) page.blocks = [{ id: page.id, type: 'html-embed', variant: 'original', props: { originalTemplate: true, sourceUrl: `https://uploaded.invalid/${page.id === 'home' ? 'index' : page.id}.html`, html } }]
    config.blocks = config.pages![0].blocks
    const next = normalizeOriginalLinks(config)
    expect(next.blocks[0].props.html).toContain('href="page:about"')
    next.pages![1].name = 'Our story'; next.pages![1].path = '/our-story'
    next.pages![0].colors = { text: '#123456' }
    const exported = exportSitePages(next, { fileLinks: true })
    expect(exported[0].html).toContain('href="our-story.html"')
    expect(exported[0].html).toContain('#123456')
    expect(exported[1].html).not.toContain('#123456')
  })
  it('auto menus store immutable destinations beside editable labels', () => {
    const config = site([])
    config.header = [{ id: 'nav', type: 'navbar', variant: 'default', props: {} }]
    expect(syncMenu(config).header![0].props.linkUrls).toEqual(['page:home', 'page:about', 'page:contact'])
  })
})

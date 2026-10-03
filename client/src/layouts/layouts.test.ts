import { beforeEach, describe, expect, it } from 'vitest'
import type { BlockConfig } from '@/blocks/types'
import { blockMetadata } from '@/lib/block-metadata'
import { exportSitePages } from '@/lib/export-html'
import { useConfigStore } from '@/store/configStore'
import { useEditorStore } from '@/store/editorStore'
import { ensurePages } from '@/store/site-shape'
import { initBuilder } from '@/builder/core'
import { customSite } from './custom-site'
import { footerPresets, headerPresets, activePreset, presetPatch } from './header-footer'
import { insertLayout } from './insert'
import { layoutCategories, layoutMap, layouts, matchesLayoutSearch } from './layouts'
import { buildStructure, structures } from './structures'

/** A custom site opens with no header or footer; tests that need them build them the way a client does. */
function addChrome() {
  const store = useConfigStore.getState()
  store.setActiveRegion('header')
  store.addBlock({ id: 'test-header', type: 'navbar', variant: 'default', props: { logo: 'Acme', links: ['Home'], ctaText: 'Button', autoPageLinks: true } }, 0, null)
  store.setActiveRegion('footer')
  store.addBlock({ id: 'test-footer', type: 'footer', variant: 'columns', props: { logo: 'Acme', copyright: '© Acme', links: [], columnCount: 3, autoPageLinks: true } }, 0, null)
  store.setActiveRegion('page')
}

const walk = (blocks: BlockConfig[], visit: (block: BlockConfig) => void) => blocks.forEach((block) => { visit(block); walk(block.children ?? [], visit) })

describe('layout library', () => {
  it('has every category the picker offers, with unique ids and a picture for each layout', () => {
    expect(new Set(layouts.map((l) => l.id)).size).toBe(layouts.length)
    expect(layouts.length).toBeGreaterThanOrEqual(70)
    for (const category of layoutCategories) expect(layouts.some((l) => l.category === category)).toBe(true)
    for (const layout of layouts) expect(layout.wire.length).toBeGreaterThan(0)
  })

  it('builds only empty containers: no words, no pictures, no widgets', () => {
    for (const layout of layouts) {
      const block = layout.build()
      walk([block], (node) => {
        expect(node.type).toBe('container')
        expect(JSON.stringify(node.props)).not.toMatch(/headline|body|subtitle|image/i)
      })
      // Every leaf is an empty drop zone.
      const leaves: BlockConfig[] = []
      walk([block], (node) => { if (!node.children || node.children.length === 0) leaves.push(node) })
      expect(leaves.length).toBeGreaterThan(0)
    }
  })

  it('gives each build fresh ids, so the same layout can be added twice', () => {
    const ids = new Set<string>()
    for (const layout of [layoutMap.get('two-equal')!, layoutMap.get('two-equal')!]) walk([layout.build()], (node) => ids.add(node.id))
    expect(ids.size).toBe(6)
  })

  it('makes column layouts the width they say', () => {
    const block = layoutMap.get('c-30-70')!.build()
    expect(block.props.template).toBe('minmax(0, 3fr) minmax(0, 7fr)')
    expect(block.children).toHaveLength(2)
    expect(layoutMap.get('g-3x2')!.build().children).toHaveLength(6)
    expect(layoutMap.get('g-4x3')!.build().children).toHaveLength(12)
  })

  it('stacks to one column on phones and two on tablets where the layout has 3+ columns', () => {
    const three = layoutMap.get('three-equal')!.build()
    expect(three.props.stackOnMobile).toBe(true)
    expect(three.props.tabletColumns).toBe(2)
    expect(layoutMap.get('two-equal')!.build().props.tabletColumns).toBeUndefined()
  })

  it('nests: a nested layout has a container inside a container cell', () => {
    const block = layoutMap.get('a-nested-two')!.build()
    expect(block.children?.[1].children).toHaveLength(2)
    expect(block.children?.[1].type).toBe('container')
  })

  it('searches by name and category', () => {
    expect(layouts.filter((l) => matchesLayoutSearch(l, 'sidebar')).length).toBeGreaterThanOrEqual(3)
    expect(layouts.filter((l) => matchesLayoutSearch(l, 'hero')).length).toBeGreaterThanOrEqual(10)
    expect(layouts.filter((l) => matchesLayoutSearch(l, 'zzzz'))).toHaveLength(0)
  })
})

describe('page structures', () => {
  it('offers the six structures from the brief plus landing and blank', () => {
    expect(structures.map((s) => s.id)).toEqual(['simple', 'business', 'education', 'portfolio', 'ecommerce', 'service', 'landing', 'blank'])
  })

  it('builds labelled empty sections only, from real layouts', () => {
    for (const structure of structures) {
      for (const section of structure.sections) expect(layoutMap.has(section.layout)).toBe(true)
      const blocks = buildStructure(structure.id)
      expect(blocks).toHaveLength(structure.sections.length)
      blocks.forEach((block, i) => expect(block.props.sectionLabel).toBe(structure.sections[i].label))
    }
    expect(buildStructure('blank')).toEqual([])
  })
})

describe('header and footer presets', () => {
  it('only use styles the blocks can draw', () => {
    const navbar = blockMetadata.find((b) => b.type === 'navbar')!
    const footer = blockMetadata.find((b) => b.type === 'footer')!
    for (const preset of headerPresets) expect(navbar.variants).toContain(preset.variant)
    for (const preset of footerPresets) expect(footer.variants).toContain(preset.variant)
    expect(headerPresets.length).toBeGreaterThanOrEqual(5)
    expect(footerPresets.length).toBeGreaterThanOrEqual(3)
  })

  it('keep the owner words and add only what a style needs', () => {
    const block: BlockConfig = { id: 'n', type: 'navbar', variant: 'default', props: { logo: 'Acme', links: ['Home'], phone: '' } }
    const patch = presetPatch(headerPresets.find((p) => p.variant === 'contact')!, block)
    expect(patch.variant).toBe('contact')
    expect(patch.props.logo).toBe('Acme')
    expect(patch.props.phone).toBeTruthy()
    const own = presetPatch(headerPresets.find((p) => p.variant === 'contact')!, { ...block, props: { ...block.props, phone: '123' } })
    expect(own.props.phone).toBe('123')
  })

  it('tell the footer column presets apart', () => {
    const columns = (count: number): BlockConfig => ({ id: 'f', type: 'footer', variant: 'columns', props: { columnCount: count } })
    expect(activePreset(footerPresets, columns(1))).toBe('f3')
    expect(activePreset(footerPresets, columns(4))).toBe('f6')
  })
})

describe('build it yourself', () => {
  beforeEach(() => {
    useEditorStore.setState({ insertTarget: null, selectedBlockId: null })
    initBuilder(customSite())
  })

  it('starts with nothing built: no header, no footer, one empty page, and a neutral light palette', () => {
    const { config } = useConfigStore.getState()
    expect(config.buildMode).toBe('custom')
    expect(config.header).toHaveLength(0)
    expect(config.footer).toHaveLength(0)
    expect(config.theme?.bg0).toBe('#ffffff')
    expect(config.theme?.accent).not.toBe('#22c55e')
    expect(ensurePages(config)).toHaveLength(1)
    expect(ensurePages(config)[0].blocks).toEqual([])
  })

  it('adds a layout to the end of the open page, and onto the page only', () => {
    insertLayout('two-equal')
    insertLayout('three-equal')
    const pages = ensurePages(useConfigStore.getState().config)
    expect(pages[0].blocks.map((b) => b.children?.length)).toEqual([2, 3])
    expect(useConfigStore.getState().config.header).toHaveLength(0)
  })

  it('adds a layout inside an empty area when that spot was chosen', () => {
    const outer = insertLayout('two-equal')
    const cell = useConfigStore.getState().config.pages![0].blocks[0].children![0]
    insertLayout('two-equal', { kind: 'gap', region: 'page', parentId: cell.id, index: 0 })
    const page = ensurePages(useConfigStore.getState().config)[0]
    expect(page.blocks[0].id).toBe(outer.id)
    expect(page.blocks[0].children![0].children).toHaveLength(1)
    expect(page.blocks[0].children![0].children![0].children).toHaveLength(2)
  })

  it('refuses to put a layout inside a widget that is not a container', () => {
    insertLayout('one-column')
    expect(() => insertLayout('one-column', { kind: 'gap', region: 'page', parentId: 'missing', index: 0 })).toThrow()
  })

  it('lets a new page start empty, then takes a whole-page structure without touching other pages', () => {
    const store = useConfigStore.getState()
    const servicesId = store.addPage('Services', true, [])
    insertLayout('two-equal')
    store.setPageBlocks(servicesId, buildStructure('business'))
    const pages = ensurePages(useConfigStore.getState().config)
    expect(pages[1].blocks.length).toBe(structures.find((s) => s.id === 'business')!.sections.length)
    expect(pages[0].blocks).toHaveLength(0)
  })

  it('exports a layout page with its columns, stacking rules and the shared header', () => {
    addChrome()
    insertLayout('three-equal')
    const html = exportSitePages(useConfigStore.getState().config, { fileLinks: true })[0].html
    expect(html).toContain('grid-template-columns:minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr)')
    expect(html).toContain('sb-stack')
    expect(html).toContain('sb-tablet-2')
    expect(html).toContain('@media (max-width: 640px)')
    expect(html).toContain('<nav')
  })

  it('page colours change only that page', () => {
    const store = useConfigStore.getState()
    const secondId = store.addPage('About', true, [])
    store.setPageColors(secondId, { background: '#112233' })
    const pages = ensurePages(useConfigStore.getState().config)
    expect(pages[0].colors).toBeUndefined()
    expect(pages[1].colors?.background).toBe('#112233')
  })
})

describe('theme colours for the header and footer', () => {
  it('offers link and button colours as well as background and text, and draws them', async () => {
    const { REGION_TOKENS, regionColorVars } = await import('@/lib/region-colors')
    expect(REGION_TOKENS.map(([key]) => key)).toEqual(expect.arrayContaining(['headerLink', 'headerButton', 'footerLink']))
    const plain = regionColorVars({ headerBackground: '#111111' }, 'header') as Record<string, string>
    const linked = regionColorVars({ headerBackground: '#111111', headerLink: '#ff0000', headerButton: '#00ff00' }, 'header') as Record<string, string>
    expect(JSON.stringify(linked)).toContain('#ff0000')
    expect(JSON.stringify(linked)).toContain('#00ff00')
    expect(JSON.stringify(plain)).not.toContain('#ff0000')
    expect(JSON.stringify(regionColorVars({ footerLink: '#abcdef' }, 'footer'))).toContain('#abcdef')
  })
})

describe('pages and menus', () => {
  beforeEach(() => { initBuilder(customSite()) })
  it('never creates two pages with the same name', () => {
    const store = useConfigStore.getState()
    store.addPage('Services', true, [])
    store.addPage('services', true, [])
    const names = ensurePages(useConfigStore.getState().config).map((p) => p.name)
    expect(new Set(names.map((n) => n.toLowerCase())).size).toBe(names.length)
    expect(names).toContain('services 2')
  })
})

describe('advanced settings and header on small screens', () => {
  beforeEach(() => { useEditorStore.setState({ insertTarget: null, selectedBlockId: null }); initBuilder(customSite()) })

  it('turns an entrance animation into CSS and into the exported page', async () => {
    const { styleToCss } = await import('@/blocks/block-style')
    expect(styleToCss({ animation: 'slide-up' }).animation).toBe('sb-slide-up .7s ease both')
    expect(styleToCss({})).not.toHaveProperty('animation')
    const block = insertLayout('one-column')
    useConfigStore.getState().updateBlock(block.id, { style: { ...block.style, animation: 'zoom' } })
    const html = exportSitePages(useConfigStore.getState().config, { fileLinks: true })[0].html
    expect(html).toContain('sb-zoom')
    expect(html).toContain('@keyframes sb-zoom')
    expect(html).toContain('prefers-reduced-motion')
  })

  it('lets the header keep its links showing on phones', () => {
    addChrome()
    const base = useConfigStore.getState().config
    expect(exportSitePages(base, { fileLinks: true })[0].html).not.toContain('<div data-nav-mobile="links">')
    const header = base.header![0]
    useConfigStore.getState().updateBlockProps(header.id, { mobileMenu: 'links' })
    const html = exportSitePages(useConfigStore.getState().config, { fileLinks: true })[0].html
    expect(html).toContain('<div data-nav-mobile="links">')
    expect(html).toContain('[data-nav-mobile="links"] nav details { display: none; }')
  })
})

describe('the exported site matches the header and footer styles in the editor', () => {
  beforeEach(() => { useEditorStore.setState({ insertTarget: null, selectedBlockId: null }); initBuilder(customSite()); addChrome() })
  const exported = () => exportSitePages(useConfigStore.getState().config, { fileLinks: true })

  it('draws every header style, with no editor-only classes left behind', () => {
    const store = useConfigStore.getState()
    const header = () => useConfigStore.getState().config.header![0]
    for (const preset of headerPresets) {
      const patch = presetPatch(preset, header())
      store.updateBlock(header().id, { variant: patch.variant, props: patch.props })
      const html = exported()[0].html
      expect(html, preset.label).toContain('<nav')
      expect(html, preset.label).not.toMatch(/@(md|lg|2xl|4xl|6xl):/)
      if (preset.variant === 'topbar') expect(html).toContain('Welcome to our website')
      if (preset.variant === 'contact') expect(html).toContain('+00 000 000 000')
      if (preset.variant === 'stacked') expect(html).toContain('flex-col items-center')
    }
  })

  it('draws every footer style instead of falling back to the simple one', () => {
    const store = useConfigStore.getState()
    const footer = () => useConfigStore.getState().config.footer![0]
    const seen = new Set<string>()
    for (const preset of footerPresets) {
      const patch = presetPatch(preset, footer())
      store.updateBlock(footer().id, { variant: patch.variant, props: patch.props })
      const html = exported()[0].html
      expect(html, preset.label).toContain('<footer')
      expect(html, preset.label).not.toContain('function render')
      expect(html, preset.label).not.toMatch(/@(md|lg|2xl|4xl|6xl):/)
      if (preset.variant === 'newsletter') expect(html).toContain('Get our latest news')
      if (preset.variant === 'inline') expect(html).toContain('Instagram')
      seen.add(html.slice(html.indexOf('<footer'), html.indexOf('</footer>')))
    }
    expect(seen.size).toBeGreaterThanOrEqual(6)
  })

  it('marks the open page in the exported menu of each page', () => {
    const store = useConfigStore.getState()
    store.addPage('About', true, [])
    const pages = exported()
    const current = (html: string) => [...html.matchAll(/<a [^>]*aria-current="page"[^>]*><span[^>]*>([^<]*)</g)].map((m) => m[1])
    expect(current(pages[0].html)).toContain('Home')
    expect(current(pages[0].html)).not.toContain('About')
    expect(current(pages[1].html)).toContain('About')
    expect(current(pages[1].html)).not.toContain('Home')
  })
})

describe('sites saved by an earlier version', () => {
  const legacy = () => ({
    ...customSite(),
    theme: undefined,
    header: [{ id: 'h', type: 'navbar' as const, variant: 'default', props: { logo: 'Malhotra Properties', links: ['Home'], ctaText: 'Get started', autoPageLinks: true } }],
    footer: [{ id: 'f', type: 'footer' as const, variant: 'columns', props: { logo: 'Malhotra Properties', copyright: '© 2026 Malhotra Properties. All rights reserved.', links: [], columnCount: 3, autoPageLinks: true } }],
  })

  it('loses the auto-made header and footer and the dark-and-green palette', async () => {
    const { migrateCustomSite } = await import('./custom-site')
    const site = migrateCustomSite(legacy())
    expect(site.header).toHaveLength(0)
    expect(site.footer).toHaveLength(0)
    expect(site.theme?.bg0).toBe('#ffffff')
  })

  it('keeps a header the client changed, and never touches a template site', async () => {
    const { migrateCustomSite } = await import('./custom-site')
    const edited = legacy()
    edited.header[0].props.ctaText = 'Book now'
    expect(migrateCustomSite(edited).header).toHaveLength(1)
    const template = { ...legacy(), buildMode: undefined }
    expect(migrateCustomSite(template)).toBe(template)
  })
})

// @vitest-environment jsdom
import { expect, it } from 'vitest'
import { originalModel, patchOriginal, safeVisualUrl, sharedOriginalEdits } from './original-model'
import type { BlockConfig, SiteConfig } from '@/blocks/types'

const html = '<html><head><link rel="stylesheet" href="theme.css"></head><body><div class="navbar"><a href="index.html"><img src="logo.png" alt="Logo"></a><ul><li><a href="about.html"><span>About us</span><i class="icon"></i></a></li></ul></div><header id="head"><h1>Welcome</h1></header><section><h2>Our school</h2><p>A great <strong>education</strong></p></section><footer><p>Copyright 2026</p><a href="contact.html">Contact</a></footer><script>window.templateWorks=true</script></body></html>'

it('finds the actual navigation header, main menu, hero and footer in legacy templates', () => {
  const model = originalModel(html)
  expect(model.sections.map(section => section.label)).toEqual(['Header', 'Main menu', 'Welcome', 'Our school', 'Footer'])
  const menu = model.nodes.get(model.sections[1].id)!
  expect(menu.children.map(id => model.nodes.get(id)!.text)).toEqual(['About us'])
})

it('edits a nested menu label and destination without destroying icons or template assets', () => {
  const node = [...originalModel(html).nodes.values()].find(node => node.kind === 'link' && node.text === 'About us')!
  const result = patchOriginal(html, node.id, { text: 'Our story', href: 'story.html', color: '#663399' })
  const doc = new DOMParser().parseFromString(result, 'text/html')
  expect(doc.querySelector('a[href="story.html"]')?.textContent).toBe('Our story')
  expect(doc.querySelector('a[href="story.html"] i.icon')).not.toBeNull()
  expect(doc.querySelector('a[href="story.html"]')?.getAttribute('style')).toContain('!important')
  expect(result).toContain('theme.css')
  expect(result).toContain('window.templateWorks=true')
  expect(result).not.toContain('data-builder-node')
  expect(originalModel(result).nodes.get(node.id)?.text).toBe('Our story')
})

it('edits footer copy and images without requiring HTML editing', () => {
  const model = originalModel(html)
  const footer = [...model.nodes.values()].find(node => node.text === 'Copyright 2026')!
  const result = patchOriginal(html, footer.id, { text: '© My school', background: '#fff', padding: '20' })
  expect(result).toContain('© My school')
  expect(result).toContain('padding: 20px !important')
  const image = [...model.nodes.values()].find(node => node.kind === 'image')!
  expect(patchOriginal(html, image.id, { src: 'new-logo.png', alt: 'Our school logo' })).toContain('src="new-logo.png" alt="Our school logo"')
})

it.each([
  ['landscape', { width: 480, height: 270 }],
  ['portrait', { width: 270, height: 480 }],
  ['square', { width: 360, height: 360 }],
])('fits a %s uploaded image inside its selected template frame', (_, imageFrame) => {
  const image = [...originalModel(html).nodes.values()].find(node => node.kind === 'image')!
  const updated = patchOriginal(html, image.id, { src: 'data:image/png;base64,AAAA', imageFrame })
  const doc = new DOMParser().parseFromString(updated, 'text/html')
  const img = doc.querySelector('img')!
  expect(img.style.getPropertyValue('width')).toBe('100%')
  expect(img.style.getPropertyValue('height')).toBe('100%')
  expect(img.style.getPropertyValue('object-fit')).toBe('cover')
  expect(img.style.getPropertyValue('object-position')).toBe('center')
  expect(img.parentElement?.style.getPropertyValue('aspect-ratio')).toBe(`${imageFrame.width} / ${imageFrame.height}`)
  expect(img.parentElement?.style.getPropertyValue('overflow')).toBe('hidden')
})

it('rejects executable URLs while allowing normal menu links and uploaded images', () => {
  expect(safeVisualUrl('java\nscript:alert(1)')).toBe(false)
  expect(safeVisualUrl('data:text/html,hello')).toBe(false)
  expect(safeVisualUrl('https://example.com')).toBe(true)
  expect(safeVisualUrl('#courses')).toBe(true)
  expect(safeVisualUrl('data:image/png;base64,AAAA', true)).toBe(true)
})

it('updates shared menu items on other pages despite different element indexes', () => {
  const home: BlockConfig = { id: 'home', type: 'html-embed', variant: 'original', props: { originalTemplate: true, html } }
  const about: BlockConfig = { ...home, id: 'about', props: { ...home.props, html: html.replace('<body>', '<body><div>Announcement</div>') } }
  const config: SiteConfig = { name: 'School', blocks: [home], pages: [{ id: 'p1', name: 'Home', path: '/', blocks: [home] }, { id: 'p2', name: 'About', path: '/about', blocks: [about] }] }
  const node = [...originalModel(html).nodes.values()].find(node => node.kind === 'link' && node.text === 'About us')!
  const updates = sharedOriginalEdits(config, node.id, { text: 'Our story' })
  expect(Object.keys(updates)).toEqual(['home', 'about'])
  expect(updates.about).toContain('Our story')
  expect(updates.about).toContain('Announcement')
})

it('edits copyright text while retaining its attribution link', () => {
  const source = '<footer><p>Copyright 2014. Template by <a href="https://example.com">Designer</a></p></footer>'
  const node = [...originalModel(source).nodes.values()].find(node => node.kind === 'text')!
  const updated = patchOriginal(source, node.id, { text: 'Copyright 2026. Template by ' })
  expect(updated).toContain('Copyright 2026. Template by <a href="https://example.com">Designer</a>')
})

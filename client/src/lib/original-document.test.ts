// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { exportOriginalDocument, inlineOriginalDocument } from './original-document'
import type { SiteConfig, BlockConfig } from '@/blocks/types'

const source = 'http://localhost/original-templates/demo/index.html'
afterEach(() => vi.unstubAllGlobals())

it('preserves original markup and maps page links when exporting', () => {
  const home: BlockConfig = { id: 'home', type: 'html-embed', variant: 'original', props: { originalTemplate: true, sourceUrl: source, html: '<html><head><base href="https://old.example/"></head><body><a href="about.html#team">Team</a><img src="images/hero.jpg"></body></html>' } }
  const about: BlockConfig = { id: 'about', type: 'html-embed', variant: 'original', props: { originalTemplate: true, sourceUrl: source.replace('index.html', 'about.html'), html: '<html></html>' } }
  const config: SiteConfig = { name: 'Original', blocks: [home], pages: [
    { id: 'p1', name: 'Home', path: '/', blocks: [home] },
    { id: 'p2', name: 'About', path: '/about', blocks: [about] },
  ] }
  const result = exportOriginalDocument(config, '', true)!
  expect(result).not.toContain('<base')
  expect(result).toContain('href="about.html#team"')
  expect(result).toContain('src="http://localhost/original-templates/demo/images/hero.jpg"')
})

it('packages local styles, scripts and images for use away from the builder', async () => {
  const files: Record<string, string> = {
    'css/main.css': '.hero{background:url(../images/hero.jpg)}',
    'js/main.js': 'window.originalLoaded=true;',
    'images/hero.jpg': 'image bytes',
  }
  const fetchAsset = vi.fn(async (url: string) => {
    const key = url.replace('http://localhost/original-templates/demo/', '')
    if (!(key in files)) throw new Error(`Unexpected asset ${url}`)
    return { ok: true, text: async () => files[key], blob: async () => new Blob([files[key]], { type: 'image/jpeg' }) }
  })
  vi.stubGlobal('fetch', fetchAsset)
  const result = await inlineOriginalDocument('<html><head><link rel="stylesheet" href="css/main.css"></head><body><img src="images/hero.jpg"><script src="js/main.js"></script></body></html>', source, new Map())
  expect(result).toContain('<style>.hero{background:url("data:image/jpeg;base64,')
  expect(result).toContain('<img src="data:image/jpeg;base64,')
  expect(result).toContain('<script>window.originalLoaded=true;</script>')
  expect(fetchAsset.mock.calls.filter(([url]) => url.endsWith('hero.jpg'))).toHaveLength(1)
})

it('preserves uploaded background images after HTML attribute serialization', () => {
  const config: SiteConfig = { name: 'Background', blocks: [{ id: 'hero', type: 'html-embed', variant: 'original', props: {
    originalTemplate: true, sourceUrl: source, html: '<html><body><header style="background-image: url(&quot;data:image/png;base64,AAAA&quot;)">Hello</header></body></html>',
  } }] }
  const html = exportOriginalDocument(config)!
  const doc = new DOMParser().parseFromString(html, 'text/html')
  expect(doc.querySelector('header')?.style.backgroundImage).toContain('data:image/png;base64,AAAA')
  expect(html).not.toContain('http://localhost/original-templates/demo/&quot;')
})



it('points a published template at the server that holds its files, but leaves page links alone', () => {
  const home: BlockConfig = { id: 'home', type: 'html-embed', variant: 'original', props: { originalTemplate: true, sourceUrl: source, html: '<html><head><link rel="stylesheet" href="css/main.css"><style>.a{background:url(images/bg.png)}</style></head><body><a href="about.html">About</a><img src="images/hero.jpg"></body></html>' } }
  const about: BlockConfig = { id: 'about', type: 'html-embed', variant: 'original', props: { originalTemplate: true, sourceUrl: source.replace('index.html', 'about.html'), html: '<html></html>' } }
  const config: SiteConfig = { name: 'Original', blocks: [home], pages: [
    { id: 'p1', name: 'Home', path: '/', blocks: [home] },
    { id: 'p2', name: 'About', path: '/about', blocks: [about] },
  ] }
  const html = exportOriginalDocument(config, '/site/demo', false, 'https://api.example.com')!
  expect(html).toContain('href="https://api.example.com/original-templates/demo/css/main.css"')
  expect(html).toContain('src="https://api.example.com/original-templates/demo/images/hero.jpg"')
  expect(html).toContain('url("https://api.example.com/original-templates/demo/images/bg.png")')
  expect(html).toContain('href="/site/demo/about"')
})

import JSZip from 'jszip'
import { newId } from './id'
import { detectUnrenderedTemplate } from './import-site'
import { inlineOriginalDocument, type AssetSource } from './original-document'
import { splitAnchorPages } from './split-anchor-pages'
import type { BlockConfig, PageConfig, SiteConfig } from '@/blocks/types'
import { normalizeOriginalLinks } from './original-links'

/**
 * Reads whatever somebody uploaded and hands back a site the editor can open.
 *
 * Three shapes arrive in practice. A single `.html` file, which is what people
 * export from most page builders; a `.zip` of a whole site folder, which is
 * what a bought template comes as; and a folder picked straight off disk,
 * for somebody who never zipped their site and should not have to learn how.
 *
 * The upload keeps the original markup and CSS exactly as they were — the
 * same "original template" the 146 built-in designs use — rather than trying
 * to guess which of this builder's own widgets each section resembles.
 * Guessing throws away whatever made the uploaded site look like theirs:
 * fonts, spacing, a hand-tuned layout. This way none of it is lost, and every
 * page still opens in the visual editor with click-anything editing.
 *
 * Every stylesheet, script and picture the pages reference is read out of the
 * upload once and carried inside the HTML as data, so the imported site does
 * not depend on the archive that produced it — it survives being saved,
 * reloaded, published or exported on its own.
 */

/** Files a browser will display, and their types. */
const IMAGE_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.svg': 'image/svg+xml',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.eot': 'application/vnd.ms-fontobject',
}

/** Local files a page can reference that are text, not a picture. */
const TEXT_EXTENSIONS = new Set(['.css', '.js', '.mjs'])

/** Anything larger than this is left out rather than inlined. */
const MAX_IMAGE_BYTES = 8_000_000

/** A made-up origin used only so relative paths inside the archive resolve like real URLs. */
const UPLOAD_ORIGIN = 'https://uploaded.invalid'

function extensionOf(path: string): string {
  const dot = path.lastIndexOf('.')
  return dot === -1 ? '' : path.slice(dot).toLowerCase()
}

/**
 * The HTML pages in an archive, home page first.
 *
 * Everything else — one page per file — becomes its own page in the site, the
 * same way the built-in templates keep a page per HTML file. Feeds, comments
 * exports and macOS's own zip clutter are not pages a visitor would ever see.
 */
function pickPages(names: string[]): string[] {
  const pages = names.filter(
    (name) =>
      /\.html?$/i.test(name) &&
      !/(^|\/)(__MACOSX|node_modules)\//i.test(name) &&
      !/\/(feed|comments|wp-json)\//i.test(name),
  )
  return pages.sort((a, b) => {
    const aHome = /(^|\/)index\.html?$/i.test(a)
    const bHome = /(^|\/)index\.html?$/i.test(b)
    if (aHome !== bHome) return aHome ? -1 : 1
    return a.split('/').length - b.split('/').length || a.length - b.length
  })
}

/**
 * A readable page name from its file path — "about-us.html" becomes "About
 * Us". A bare "index.html" says nothing on its own, so a page found at
 * "about/index.html" is named after the folder it sits in instead; the site's
 * own home page is named directly by `buildOriginalSite` and never reaches
 * this rule.
 */
function nameOfPage(path: string): string {
  const segments = path.split('/').filter(Boolean)
  const base = segments[segments.length - 1].replace(/\.html?$/i, '')
  const raw = /^index$/i.test(base) && segments.length > 1 ? segments[segments.length - 2] : base
  const words = raw.replace(/[-_]+/g, ' ').trim()
  return words.replace(/\b\w/g, (letter) => letter.toUpperCase()) || 'Page'
}

/** The page's own `<title>`, the way a browser tab would show it — truest name for the site. */
function titleOf(html: string): string {
  const document = new DOMParser().parseFromString(html, 'text/html')
  return (document.querySelector('title')?.textContent ?? '').split(/[|–—]/)[0].trim()
}

/** An asset source backed by files already read into memory, for `inlineOriginalDocument`. */
function memoryAssetSource(images: Map<string, string>, texts: Map<string, string>, root = ''): AssetSource {
  const pathOf = (url: string) => {
    const path = decodeURIComponent(new URL(url).pathname.replace(/^\//, ''))
    return images.has(path) || texts.has(path) ? path : root + path
  }
  return {
    has: (url) => {
      try {
        if (new URL(url).origin !== UPLOAD_ORIGIN) return false
      } catch {
        return false
      }
      const path = pathOf(url)
      return images.has(path) || texts.has(path)
    },
    text: async (url) => {
      const path = pathOf(url)
      const value = texts.get(path)
      if (value === undefined) throw new Error(`Missing file: ${path}`)
      return value
    },
    dataUrl: async (url) => {
      const path = pathOf(url)
      const value = images.get(path)
      if (value === undefined) throw new Error(`Missing file: ${path}`)
      return value
    },
  }
}

/** Pictures a page references that were not found among the files that were uploaded. */
function findMissingImages(html: string, sourceUrl: string, images: Map<string, string>): string[] {
  const document = new DOMParser().parseFromString(html, 'text/html')
  const missing: string[] = []
  for (const element of document.querySelectorAll('img,source')) {
    const src = element.getAttribute('src')
    if (!src || /^(https?:|data:|blob:)/i.test(src)) continue
    try {
      const resolved = new URL(src, sourceUrl)
      const path = decodeURIComponent(resolved.pathname.replace(/^\//, ''))
      if (!images.has(path)) missing.push(src)
    } catch {
      missing.push(src)
    }
  }
  return missing
}

export interface UploadResult {
  config: SiteConfig
  report: {
    sections: number
    recognised: Record<string, number>
    missingImages: string[]
  }
  /** The file inside the upload the site was read from. */
  sourceFile: string
}

/** Builds the site out of pages already read from an archive, plus its local assets. */
async function buildOriginalSite(
  pages: { path: string; html: string }[],
  images: Map<string, string>,
  texts: Map<string, string>,
  fallbackName: string,
): Promise<{ config: SiteConfig; report: UploadResult['report'] }> {
  if (pages.length === 0) throw new Error('That upload has no HTML page in it.')

  const root = pages[0].path.slice(0, pages[0].path.lastIndexOf('/') + 1)
  const source = memoryAssetSource(images, texts, root)
  const cache = new Map<string, Promise<string>>()
  const missingImages = new Set<string>()

  const built: PageConfig[] = await Promise.all(
    pages.map(async (page, index) => {
      const engine = detectUnrenderedTemplate(page.html)
      if (engine) {
        throw new Error(
          `${page.path} still has unrendered ${engine} template code in it, not the final page — a server normally fills those parts in before anyone sees the site. Export or "build" the site first so it is plain HTML, then upload that.`,
        )
      }

      const sourceUrl = new URL(page.path, UPLOAD_ORIGIN + '/').href
      for (const src of findMissingImages(page.html, sourceUrl, images)) missingImages.add(src)

      const html = await inlineOriginalDocument(page.html, sourceUrl, cache, source)
      const name = index === 0 ? 'Home' : nameOfPage(page.path)
      const block: BlockConfig = {
        id: newId('original'),
        type: 'html-embed',
        variant: 'original',
        props: { title: name, html, sourceUrl, originalTemplate: true, height: 1000 },
      }
      return {
        id: newId('page'),
        name,
        path: index === 0 ? '/' : `/${index}-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
        showInMenu: true,
        blocks: [block],
      }
    }),
  )

  // A single uploaded page whose nav scrolls to `#about`/`#services`/etc. is
  // really a one-page template — split those sections into real pages so
  // clicking "Services" in the menu opens a Services page, not a scroll.
  const expanded = built.length === 1
    ? (splitAnchorPages(built[0], String(built[0].blocks[0].props.sourceUrl)) ?? built)
    : built

  const config: SiteConfig = {
    name: titleOf(pages[0].html) || fallbackName || 'My website',
    header: [],
    footer: [],
    pages: expanded,
    blocks: expanded[0].blocks,
  }

  return {
    config: normalizeOriginalLinks(config),
    report: { sections: expanded.length, recognised: { page: expanded.length }, missingImages: [...missingImages] },
  }
}

export async function importUploadedSite(file: File): Promise<UploadResult> {
  const name = file.name.toLowerCase()

  if (name.endsWith('.html') || name.endsWith('.htm')) {
    const html = await file.text()
    const fallbackName = file.name.replace(/\.html?$/i, '')
    const { config, report } = await buildOriginalSite([{ path: file.name, html }], new Map(), new Map(), fallbackName)
    return { config, report, sourceFile: file.name }
  }

  if (!name.endsWith('.zip')) {
    throw new Error('Upload a .html file, a .zip of your website folder, or the folder itself.')
  }

  const zip = await JSZip.loadAsync(file)
  const names = Object.keys(zip.files).filter((entry) => !zip.files[entry].dir)

  const pagePaths = pickPages(names)
  if (pagePaths.length === 0) throw new Error('That zip has no HTML page in it.')

  const images = new Map<string, string>()
  const texts = new Map<string, string>()
  await Promise.all(
    names.map(async (entry) => {
      const ext = extensionOf(entry)
      const zipped = zip.files[entry]
      if (IMAGE_TYPES[ext]) {
        // `_data.uncompressedSize` is JSZip's own record of the unpacked size, and
        // checking it first avoids unpacking a 40MB photograph to discard it.
        const size = (zipped as unknown as { _data?: { uncompressedSize?: number } })._data?.uncompressedSize
        if (typeof size === 'number' && size > MAX_IMAGE_BYTES) return
        images.set(entry, `data:${IMAGE_TYPES[ext]};base64,${await zipped.async('base64')}`)
      } else if (TEXT_EXTENSIONS.has(ext)) {
        texts.set(entry, await zipped.async('string'))
      }
    }),
  )

  const pages = await Promise.all(
    pagePaths.map(async (path) => ({ path, html: await zip.files[path].async('string') })),
  )
  const { config, report } = await buildOriginalSite(pages, images, texts, file.name.replace(/\.zip$/i, ''))
  return { config, report, sourceFile: pagePaths[0] }
}

/** A file paired with the path it sat at inside the folder the visitor picked. */
export interface PathedFile {
  path: string
  file: File
}

/**
 * The same import as a zip, but for a folder chosen straight off disk — a
 * `webkitdirectory` file input, or a folder dropped onto the page, hands back
 * every file inside it, each one carrying the path it sat at relative to the
 * folder the visitor picked.
 */
export async function importUploadedFolder(named: PathedFile[]): Promise<UploadResult> {
  const pagePaths = pickPages(named.map((entry) => entry.path))
  if (pagePaths.length === 0) throw new Error('That folder has no HTML page in it.')

  const images = new Map<string, string>()
  const texts = new Map<string, string>()
  await Promise.all(
    named.map(async ({ file, path }) => {
      const ext = extensionOf(path)
      if (IMAGE_TYPES[ext]) {
        if (file.size > MAX_IMAGE_BYTES) return
        images.set(path, await readAsDataUrl(file))
      } else if (TEXT_EXTENSIONS.has(ext)) {
        texts.set(path, await file.text())
      }
    }),
  )

  const byPath = new Map(named.map((entry) => [entry.path, entry.file]))
  const pages = await Promise.all(
    pagePaths.map(async (path) => ({ path, html: await byPath.get(path)!.text() })),
  )

  const rootFolder = pagePaths[0].includes('/') ? pagePaths[0].split('/')[0] : ''
  const fallbackName = (rootFolder || byPath.get(pagePaths[0])!.name).replace(/\.html?$/i, '')
  const { config, report } = await buildOriginalSite(pages, images, texts, fallbackName)
  return { config, report, sourceFile: pagePaths[0] }
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error ?? new Error('Could not read the file.'))
    reader.readAsDataURL(file)
  })
}

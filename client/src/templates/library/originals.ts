import { personalizeOriginal } from '@/onboarding/personalize-original'
import type { BusinessProfile } from '@/onboarding/profile'
import catalog from './original-catalog.json'
import type { SiteConfig, BlockConfig } from '@/blocks/types'
import { newId } from '@/lib/id'
import { splitAnchorPages } from '@/lib/split-anchor-pages'
import { lightTheme } from './types'

export interface OriginalTemplate {
  id: string
  name: string
  description: string
  category: string
  collections: string[]
  sources: string[]
  url: string
  thumbnail: string
  height: number
  fingerprint: string
  pages: { name: string; url: string }[]
}

export const originalTemplates: OriginalTemplate[] = catalog

function stripPreloaders(rawHtml: string): string {
  try {
    const doc = new DOMParser().parseFromString(rawHtml, 'text/html')
    const preloaderSelectors = '#preloader,#preloader-wrapper,#preload,#loading,#loader,#ftco-loader,#world-load,.preloader,.preloader-wrapper,.preloader-body,.pre-loader,.preload,.preload-content,.page-loader,.page-loader-wrapper,.animationload,.cssload-container,.spinner-wrapper,.loading-overlay,.se-pre-con,.pageloader,.pace,.pace-running,.fullscreen-loader,.load-screen,.loader,.loader-bg,.loader-inner,.gtco-loader,.colorlib-loader,.fh5co-loader,section.preloader,.line-scale-pulse-out,.ball-pulse,.ball-clip-rotate-pulse'
    doc.querySelectorAll(preloaderSelectors).forEach(el => el.remove())
    if (doc.body) {
      doc.body.classList.remove('loading', 'is-loading', 'preloader-active', 'pace-running', 'ss-preload')
      doc.body.style.opacity = ''
      doc.body.style.visibility = ''
      doc.body.style.display = ''
    }
    if (doc.documentElement) {
      doc.documentElement.classList.remove('loading', 'is-loading', 'preloader-active', 'pace-running', 'ss-preload', 'no-js')
      doc.documentElement.classList.add('js', 'ss-loaded')
    }
    return '<!DOCTYPE html>\n' + doc.documentElement.outerHTML
  } catch {
    return rawHtml
  }
}

/** Keep original markup and styles together; never translate them into generic widgets. */
export async function loadOriginalTemplate(template: OriginalTemplate, profile?: BusinessProfile): Promise<SiteConfig> {
  const pages = await Promise.all(template.pages.map(async (page, index) => {
    const response = await fetch(page.url)
    if (!response.ok) throw new Error(`Could not load ${page.name}. Please try again.`)
    const rawHtml = await response.text()
    const cleanedHtml = stripPreloaders(rawHtml)
    const html = profile ? personalizeOriginal(cleanedHtml, profile) : cleanedHtml
    if (!/<(?:html|body|head)[\s>]/i.test(html)) throw new Error(`${page.name} is not a valid template page.`)
    const blocks: BlockConfig[] = [{
      id: newId('original'), type: 'html-embed', variant: 'original',
      props: { title: page.name, html, sourceUrl: new URL(page.url, window.location.origin).href,
        originalTemplate: true, height: index === 0 ? template.height : 1000 },
    }]
    return { id: newId('page'), name: page.name, path: index === 0 ? '/' : `/${index}-${page.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`, showInMenu: true, blocks }
  }))
  // Many one-page templates only ever had this single Home file — their nav
  // just scrolls to sections on it. Split those into real pages so "Service"
  // in the menu opens an actual Service page instead of scrolling Home.
  const expanded = pages.length === 1 ? (splitAnchorPages(pages[0], pages[0].blocks[0].props.sourceUrl as string) ?? pages) : pages
  return { name: profile?.name.trim() || template.name, theme: lightTheme({}), header: [], footer: [], pages: expanded, blocks: expanded[0].blocks }
}

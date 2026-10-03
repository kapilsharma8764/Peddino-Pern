import JSZip from 'jszip'
import type { SiteConfig } from '@/blocks/types'
import type { ExportSiteOptions, ExportedPage } from './export-html'
import { exportSite } from '@/builder/core'

/**
 * A second export shape, alongside the existing one-self-contained-HTML-file
 * export (`exportSite` + `downloadHTML`, still used exactly as before).
 *
 * Each page `exportSite` produces is a complete document with its CSS and JS
 * inlined and its local images already turned into data URIs — correct, but
 * not the `assets/css/style.css` + `assets/js/main.js` + `images/` layout a
 * static site is normally handed as. This module takes that same page list
 * and repackages it into that layout, purely by post-processing the finished
 * HTML strings: it never touches the renderer, so the existing single-file
 * export cannot be affected by anything here.
 */

function extractTagBodies(html: string, tag: 'style' | 'script'): { bodies: string[]; stripped: string } {
  const bodies: string[] = []
  const pattern = tag === 'style' ? /<style\b[^>]*>([\s\S]*?)<\/style>/gi : /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi
  const stripped = html.replace(pattern, (_match, body: string) => {
    if (body.trim()) bodies.push(body)
    return ''
  })
  return { bodies, stripped }
}

function extFromMime(mime: string): string {
  const known: Record<string, string> = {
    'image/png': 'png', 'image/jpeg': 'jpg', 'image/gif': 'gif',
    'image/webp': 'webp', 'image/svg+xml': 'svg', 'image/avif': 'avif',
  }
  return known[mime] ?? 'bin'
}

/** A short, stable, filename-safe id for a data URI, so the same image reused across pages becomes one file. */
async function hashDataUri(dataUri: string): Promise<string> {
  const bytes = new TextEncoder().encode(dataUri)
  const digest = await crypto.subtle.digest('SHA-1', bytes)
  return [...new Uint8Array(digest)].slice(0, 8).map((b) => b.toString(16).padStart(2, '0')).join('')
}

async function externalizeImages(pages: ExportedPage[], zip: JSZip): Promise<ExportedPage[]> {
  const dataUriPattern = /data:(image\/[a-z0-9.+-]+);base64,([a-zA-Z0-9+/=]+)/gi
  const pathByDataUri = new Map<string, string>()

  for (const page of pages) {
    for (const match of page.html.matchAll(dataUriPattern)) {
      const [dataUri, mime] = match
      if (pathByDataUri.has(dataUri)) continue
      const hash = await hashDataUri(dataUri)
      const path = `assets/images/${hash}.${extFromMime(mime)}`
      pathByDataUri.set(dataUri, path)
    }
  }

  for (const [dataUri, path] of pathByDataUri) {
    const base64 = dataUri.slice(dataUri.indexOf(',') + 1)
    zip.file(path, base64, { base64: true })
  }

  if (pathByDataUri.size === 0) return pages
  return pages.map((page) => ({
    ...page,
    html: [...pathByDataUri.entries()].reduce((html, [dataUri, path]) => html.split(dataUri).join(path), page.html),
  }))
}

/**
 * Builds the zip and returns it as a blob, ready to hand to a download link.
 * Distinct `<style>`/`<script>` bodies are de-duplicated across pages (the
 * same shared-header script or theme CSS shows up on every page) and written
 * once; each page keeps only what actually differs, which in practice is
 * nothing — every current page template shares one CSS/JS payload, so this
 * yields exactly the single `assets/css/style.css` + `assets/js/main.js` the
 * spec asks for, not one per page.
 */
export async function buildSiteAssetsZip(config: SiteConfig, options?: ExportSiteOptions): Promise<Blob> {
  const rawPages = await exportSite(config, options)
  const zip = new JSZip()

  const cssBodies = new Set<string>()
  const jsBodies = new Set<string>()
  const stripped = rawPages.map((page) => {
    const styles = extractTagBodies(page.html, 'style')
    styles.bodies.forEach((b) => cssBodies.add(b))
    const scripts = extractTagBodies(styles.stripped, 'script')
    scripts.bodies.forEach((b) => jsBodies.add(b))
    return { ...page, html: scripts.stripped }
  })

  const hasCss = cssBodies.size > 0
  const hasJs = jsBodies.size > 0
  if (hasCss) zip.file('assets/css/style.css', [...cssBodies].join('\n\n'))
  if (hasJs) {
    // Each inline <script> was written to stand alone at its own spot in the
    // page, not to share a top-level scope with the others — concatenating
    // their bodies directly risks one page's trailing expression running into
    // the next one's leading statement (automatic-semicolon-insertion
    // hazards) or two scripts' top-level `var`/`function` names colliding.
    // Wrapping each in its own IIFE keeps every script exactly as isolated
    // as it was inline.
    const isolated = [...jsBodies].map((body) => `(function () {\n${body}\n})();`)
    zip.file('assets/js/main.js', isolated.join('\n\n'))
  }

  const withAssetTags = stripped.map((page) => {
    let html = page.html
    if (hasCss) html = html.replace('</head>', '  <link rel="stylesheet" href="assets/css/style.css" />\n</head>')
    if (hasJs) html = html.replace('</body>', '  <script src="assets/js/main.js" defer></script>\n</body>')
    return { ...page, html }
  })

  const finalPages = await externalizeImages(withAssetTags, zip)
  for (const page of finalPages) zip.file(page.file, page.html)

  return zip.generateAsync({ type: 'blob' })
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

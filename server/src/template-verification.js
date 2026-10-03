import { createHash } from 'node:crypto'
import { parse } from 'parse5'
import parseSrcset from 'parse-srcset'

export const digest = (body) => createHash('sha256').update(body).digest('hex')

export function validateBaseline(value) {
  if (!Array.isArray(value) || value.some((entry) =>
    typeof entry?.path !== 'string' || !entry.path.startsWith('/original-templates/') ||
    /[?#*]/.test(entry.path) || typeof entry.reason !== 'string' || !entry.reason.trim())) {
    throw new Error('Baseline must contain exact template paths and nonempty reasons')
  }
  if (new Set(value.map((entry) => entry.path)).size !== value.length) throw new Error('Duplicate baseline path')
  return new Set(value.map((entry) => entry.path))
}

export async function fetchAsset(origin, job, fetcher = fetch) {
  try {
    const target = new URL(job.url, origin)
    if (target.origin !== new URL(origin).origin) return { ok: false, status: 'OFF_ORIGIN', body: '' }
    const response = await fetcher(target, { signal: AbortSignal.timeout(30_000), redirect: 'error', cache: 'no-store' })
    const type = (response.headers.get('content-type') ?? '').toLowerCase()
    const bytes = Buffer.from(await response.arrayBuffer())
    const typeOk = !job.type || type.startsWith(job.type)
    const identityOk = !job.hash || digest(bytes) === job.hash
    const fallback = job.kind === 'dependency' && (type.includes('text/html') || /^\s*(?:<!doctype html|<html)/i.test(bytes.toString('utf8')))
    return { ok: response.ok && typeOk && identityOk && !fallback,
      status: !response.ok ? response.status : !typeOk ? 'WRONG_MIME' : !identityOk ? 'WRONG_CONTENT' : fallback ? 'HTML_FALLBACK' : response.status,
      body: bytes.toString('utf8') }
  } catch {
    return { ok: false, status: 'NETWORK_OR_REDIRECT_ERROR', body: '' }
  }
}

// HTML-linked resources only, including inline CSS and srcset. Do not follow
// external origins or navigation links. External CSS/JS internals are not crawled.
export function resourcePaths(html, page, origin) {
  const refs = new Set()
  const css = (value) => {
    for (const match of value.matchAll(/url\(\s*["']?([^"')\s]+)["']?\s*\)/gi)) refs.add(match[1])
  }
  const visit = (node) => {
    const attrs = Object.fromEntries((node.attrs ?? []).map(({ name, value }) => [name, value]))
    if (['script', 'img', 'source', 'video', 'audio', 'input', 'embed'].includes(node.tagName) && attrs.src) refs.add(attrs.src)
    if (node.tagName === 'video' && attrs.poster) refs.add(attrs.poster)
    if (node.tagName === 'link' && /(?:stylesheet|icon|preload|modulepreload)/i.test(attrs.rel ?? '') && attrs.href) refs.add(attrs.href)
    if (attrs.srcset) for (const item of parseSrcset(attrs.srcset)) refs.add(item.url)
    if (attrs.style) css(attrs.style)
    if (node.tagName === 'style') css((node.childNodes ?? []).map((child) => child.value ?? '').join(''))
    for (const child of node.childNodes ?? []) visit(child)
  }
  visit(parse(html))
  const paths = new Set()
  for (const ref of refs) {
    if (!ref || ref.startsWith('#')) continue
    try {
      const url = new URL(ref, new URL(page, origin))
      if (url.origin === new URL(origin).origin) paths.add(url.pathname + url.search)
    } catch { /* malformed reference is not a fetchable URL */ }
  }
  return [...paths]
}

export function dependencyType(url) {
  const ext = new URL(url, 'https://verification.invalid').pathname.split('.').pop().toLowerCase()
  if (ext === 'css') return 'text/css'
  if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'ico', 'avif'].includes(ext)) return 'image/'
  return undefined
}

export async function scanPage(origin, job, result, baseline, fetcher = fetch) {
  const report = { scanned: 0, skipped: 0, checked: 0, baselineMissing: 0, failures: [] }
  if (!result.ok) {
    report.skipped = 1
    report.failures.push({ url: job.url, status: 'SOURCE_PAGE_FAILED' })
    return report
  }
  report.scanned = 1
  for (const url of resourcePaths(result.body, job.url, origin)) {
    const asset = await fetchAsset(origin, { url, kind: 'dependency', type: dependencyType(url) }, fetcher)
    report.checked++
    if (!asset.ok) {
      // Known absence excuses only a 404, never a timeout/500/wrong MIME.
      if (asset.status === 404 && baseline.has(url)) report.baselineMissing++
      else report.failures.push({ url, status: asset.status })
    }
  }
  return report
}

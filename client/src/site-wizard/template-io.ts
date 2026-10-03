import { layoutMap } from './registry/layouts'
import { siteTypeMap } from './registry/site-types'
import { isKnownWidget } from './compile'
import type { SiteSpec } from './types'

const FORMAT = 'peddino-site-template'

/** The spec as a JSON template file. */
export function specToJson(spec: SiteSpec): string {
  return JSON.stringify({ format: FORMAT, version: 1, site: spec }, null, 2)
}

/** Reads a template file back, rejecting anything that is not a valid spec. */
export function specFromJson(text: string): SiteSpec {
  let data: unknown
  try { data = JSON.parse(text) } catch { throw new Error('That file is not valid JSON.') }
  const site = (data as { format?: string; site?: SiteSpec } | null)?.site
  if ((data as { format?: string } | null)?.format !== FORMAT || !site) throw new Error('That is not a site template file.')
  if (!siteTypeMap.has(site.type)) throw new Error('The template has an unknown website type.')
  if (!isKnownWidget(site.header) || !isKnownWidget(site.footer)) throw new Error('The template uses a header or footer widget that does not exist.')
  if (!Array.isArray(site.pages) || site.pages.length === 0) throw new Error('The template has no pages.')
  for (const page of site.pages) {
    if (!layoutMap.has(page.layout)) throw new Error(`The template uses an unknown layout: ${String(page.layout)}`)
    if (!page.slots || typeof page.slots !== 'object') throw new Error(`Page "${String(page.name)}" has no slots.`)
    for (const ref of Object.values(page.slots)) if (ref && !isKnownWidget(ref)) throw new Error(`The template uses an unknown widget: ${ref}`)
  }
  return site
}

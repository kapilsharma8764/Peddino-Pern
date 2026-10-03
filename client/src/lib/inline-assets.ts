import type { SiteConfig } from '@/blocks/types'
import { inlineOriginalDocument } from './original-document'

/**
 * Turns the builder's own picture files into pictures the published site owns.
 *
 * A design imported from a downloaded template refers to its photographs by a
 * path this app serves — `/templates/bedoctor/a62e8d04.jpg`. That works
 * everywhere inside the builder, and nowhere outside it: an exported site is a
 * folder of HTML files served from somebody else's host, and a published one is
 * served by the API, and neither has a `/templates` folder. The pictures came
 * out as broken boxes.
 *
 * So before a site leaves the builder, every such picture is read once and
 * carried along inside the page as a data URI. The result is a page that needs
 * nothing from this app to display correctly, which is the whole promise of
 * exporting.
 *
 * Only our own paths are touched. A photograph already hosted elsewhere is
 * left alone — inlining it would make the page heavier for no gain, and would
 * quietly copy somebody else's file.
 */

/** Paths this app serves that would not survive leaving it. */
const LOCAL = /^\/(templates|assets)\//

async function toDataUri(path: string): Promise<string> {
  const response = await fetch(path)
  if (!response.ok) throw new Error(`${response.status} for ${path}`)
  const blob = await response.blob()

  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

/**
 * A copy of the site with its local pictures carried inside it.
 *
 * A picture that cannot be read is left as it was rather than throwing: a
 * single missing file should cost one image, not the whole export.
 */
export async function inlineLocalAssets(config: SiteConfig): Promise<SiteConfig> {
  const originals = [...config.blocks, ...(config.pages ?? []).flatMap(page => page.blocks)]
    .filter(block => block.props.originalTemplate && typeof block.props.html === 'string')
  if (originals.length) {
    const copy = structuredClone(config)
    const cache = new Map<string, Promise<string>>()
    const documents = new Map<string, string>()
    for (const block of originals) {
      if (!documents.has(block.id)) documents.set(block.id, await inlineOriginalDocument(String(block.props.html), String(block.props.sourceUrl), cache))
    }
    for (const block of [...copy.blocks, ...(copy.pages ?? []).flatMap(page => page.blocks)]) {
      if (documents.has(block.id)) block.props.html = documents.get(block.id)
    }
    return copy
  }
  const text = JSON.stringify(config)
  const paths = [...new Set(text.match(/"\/(?:templates|assets)\/[^"]+"/g) ?? [])].map((match) =>
    match.slice(1, -1),
  )

  if (paths.length === 0) return config

  const replacements = new Map<string, string>()
  await Promise.all(
    paths.map(async (path) => {
      if (!LOCAL.test(path)) return
      try {
        replacements.set(path, await toDataUri(path))
      } catch {
        // Left pointing at the original path; one broken picture is better
        // than no export at all.
      }
    }),
  )

  if (replacements.size === 0) return config

  let next = text
  for (const [path, dataUri] of replacements) {
    // JSON.stringify escapes nothing in either value, so a plain split/join is
    // both correct and faster than building one enormous expression.
    next = next.split(`"${path}"`).join(JSON.stringify(dataUri))
  }

  return JSON.parse(next) as SiteConfig
}

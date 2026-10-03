#!/usr/bin/env node
/**
 * Convert a manually-exported Nicepage template (HTML placed by a human under
 * downloads/nicepage-exports/<template-id>/, per templates/nicepage's
 * export-notes.md) into the staged templates/nicepage/<category>/<slug>/ format.
 *
 *     npm run import:nicepage-export -- --source=downloads/nicepage-exports/59016 --template-id=59016
 */

import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const argv = process.argv.slice(2)
const source = argv.find((a) => a.startsWith('--source='))?.slice('--source='.length)
const templateId = argv.find((a) => a.startsWith('--template-id='))?.slice('--template-id='.length)

if (!source || !templateId) {
  console.error('Usage: import:nicepage-export -- --source=<dir> --template-id=<id>')
  process.exit(1)
}

const sourceDir = resolve(root, source)
if (!existsSync(sourceDir)) {
  console.error(`No such directory: ${sourceDir}`)
  process.exit(1)
}

// Find the matching staged template.json (written by import-nicepage.mjs) so
// the category/slug/name/sourceUrl already recorded gets reused rather than guessed.
function findStagedTemplate(id) {
  const nicepageDir = join(root, 'templates', 'nicepage')
  if (!existsSync(nicepageDir)) return null
  for (const category of readdirSync(nicepageDir)) {
    const categoryDir = join(nicepageDir, category)
    if (!statSync(categoryDir).isDirectory()) continue
    for (const slug of readdirSync(categoryDir)) {
      const templateJsonPath = join(categoryDir, slug, 'template.json')
      if (!existsSync(templateJsonPath)) continue
      const t = JSON.parse(readFileSync(templateJsonPath, 'utf8'))
      if (String(t.providerTemplateId) === String(id)) return { dir: join(categoryDir, slug), template: t }
    }
  }
  return null
}

const staged = findStagedTemplate(templateId)
if (!staged) {
  console.error(
    `No staged template.json found with providerTemplateId ${templateId}. Run "npm run import:nicepage" first so the category/slug/metadata exist.`,
  )
  process.exit(1)
}

const { dir: templateDir, template } = staged
const htmlDestDir = join(templateDir, 'source', 'original-html')
mkdirSync(htmlDestDir, { recursive: true })

function copyRecursive(from, to) {
  mkdirSync(to, { recursive: true })
  for (const entry of readdirSync(from)) {
    const fromPath = join(from, entry)
    const toPath = join(to, entry)
    if (statSync(fromPath).isDirectory()) copyRecursive(fromPath, toPath)
    else copyFileSync(fromPath, toPath)
  }
}
copyRecursive(sourceDir, htmlDestDir)

const pages = readdirSync(htmlDestDir)
  .filter((f) => f.endsWith('.html'))
  .map((f) => f.replace(/\.html$/, ''))

template.pages = pages
template.importStatus = 'imported'
template.updatedAt = new Date().toISOString()
writeFileSync(join(templateDir, 'template.json'), JSON.stringify(template, null, 2))

console.log(`Imported Nicepage export for "${template.name}" (${pages.length} page(s)): ${pages.join(', ')}`)
console.log(`Updated: ${join(templateDir, 'template.json')}`)

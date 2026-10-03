import { test, expect, openCustomEditor, watchForErrors, expectNoPageErrors, reloadEditor } from './fixtures'
import type { Download, Locator, Page } from '@playwright/test'
import { mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { PRIMARY, PRIMARY_RGB, canvas, serveFolder, setHex } from './theme-helpers'

/**
 * The "build it yourself" workflow from builder-layout-requirements.md, driven
 * the way a client would: no templates, a page layout, widgets dropped into
 * columns, page colours, theme colours, a header and footer style, a second
 * page reached from the menu, three screen sizes, a reload, and an export.
 */

async function dragOnto(page: Page, source: Locator, target: Locator) {
  await target.evaluate((node) => node.scrollIntoView({ block: 'center' }))
  await source.scrollIntoViewIfNeeded()
  const from = await source.boundingBox()
  if (!from) throw new Error('nothing to drag')
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2)
  await page.mouse.down()
  await page.mouse.move(from.x + from.width / 2 + 12, from.y + from.height / 2 + 12, { steps: 4 })
  const to = await target.boundingBox()
  if (!to) { await page.mouse.up(); throw new Error('no destination') }
  const x = to.x + to.width / 2
  const y = to.y + to.height / 2
  await page.mouse.move(x, y, { steps: 20 })
  await page.mouse.move(x, y + 1, { steps: 2 })
  await page.mouse.up()
}

const tab = (page: Page, name: string) => page.getByRole('button', { name, exact: true }).first().click()

/** Builds the shared header and footer the way a client does: from the "Build" places on the canvas. */
async function buildChrome(page: Page) {
  await page.locator('[data-build-region="header"]').click()
  await page.locator('[data-preset-card="h1"]').click()
  await page.locator('[data-build-region="footer"]').click()
  await page.locator('[data-preset-card="f6"]').click()
  await expect(page.locator('[data-build-region]')).toHaveCount(0)
}

async function readConfig(page: Page) {
  await page.getByRole('button', { name: 'Toggle JSON drawer' }).click()
  const text = await page.locator('pre').first().innerText()
  await page.getByRole('button', { name: 'Toggle JSON drawer' }).click()
  return JSON.parse(text)
}

test('custom build: structure, widgets, colours, header/footer, pages, devices, reload and export', async ({ page }) => {
  test.setTimeout(240_000)
  await page.setViewportSize({ width: 1800, height: 1000 })
  const errors = watchForErrors(page)
  await openCustomEditor(page, 'Acme Studio')

  // ── Custom build shows layouts, never templates ───────────────────────
  await expect(page.getByTestId('empty-page')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Start Building Your Page' })).toBeVisible()
  await expect(page.getByRole('button', { name: /Start Blank/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /Choose Layout/ })).toBeVisible()
  await expect(page.getByRole('button', { name: 'View All Layouts' })).toBeVisible()
  // Nothing is made for the client: no header or footer, no dark-and-green site, only places to build them.
  await expect(page.locator('[data-build-region="header"]')).toContainText('Build Header')
  await expect(page.locator('[data-build-region="footer"]')).toContainText('Build Footer')
  await expect(canvas(page).locator('nav, footer')).toHaveCount(0)
  await expect(canvas(page)).toHaveCSS('background-color', 'rgb(255, 255, 255)')
  await buildChrome(page)
  await expect(page.getByRole('button', { name: /Use template/ })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Templates', exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Layout', exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Layouts', exact: true })).toBeVisible()

  // ── 2-5: add a page called Services and open it ──────────────────────
  await tab(page, 'Pages')
  await page.getByRole('button', { name: 'Add page' }).first().click()
  await page.getByLabel('Page name').fill('Services')
  await page.getByLabel('Page name').press('Enter')
  await page.getByRole('button', { name: 'Services', exact: true }).first().click()
  await expect(page.getByTestId('empty-page')).toBeVisible()

  // ── 5-7: Change layout → structure fills the canvas with labelled, empty sections ─
  await page.getByRole('button', { name: 'Change layout' }).click()
  await page.locator('[data-structure-card="business"]').click()
  await expect(canvas(page).getByText('Services', { exact: true }).first()).toBeVisible()
  await expect(canvas(page).getByText('Hero', { exact: true }).first()).toBeVisible()
  expect(await canvas(page).getByText('Add widget').count()).toBeGreaterThan(5)

  // Replacing a page that already has sections asks first, and can be refused.
  await page.locator('[data-structure-card="simple"]').click()
  await expect(page.getByRole('alertdialog')).toBeVisible()
  await page.getByRole('button', { name: 'Keep my sections' }).click()
  await expect(page.getByRole('alertdialog')).toHaveCount(0)

  // Use a plain two-column section for the widget steps: clear the page first.
  await page.locator('[data-structure-card="blank"]').click()
  await page.getByRole('button', { name: 'Replace' }).click()
  await expect(page.getByTestId('empty-page')).toBeVisible()
  await page.getByRole('button', { name: 'Sections', exact: true }).click()
  await page.getByLabel('Search layouts').fill('2 equal')
  await page.locator('[data-layout-card="two-equal"]').click()
  await expect(canvas(page).getByText('Drop widgets here')).toHaveCount(2)

  // ── 8-13: heading, text and button into the left column; image into the right ─
  await tab(page, 'Widgets')
  const search = page.getByPlaceholder('Search 200+ widgets...')
  await search.fill('Heading')
  const heading = page.getByRole('button', { name: /^Heading$/ }).first()
  await dragOnto(page, heading, canvas(page).getByText('Drop widgets here').first())
  await expect(canvas(page).getByText('Drop widgets here')).toHaveCount(1)

  await search.fill('Paragraph')
  await page.getByRole('button', { name: /^Paragraph$/ }).first().click()
  await search.fill('Button')
  await page.getByRole('button', { name: /^Button$/ }).first().click()

  await canvas(page).getByRole('button', { name: 'Add a widget to this empty area' }).click()
  await search.fill('Image')
  await page.getByRole('button', { name: /^Image$/ }).first().click()
  await expect(canvas(page).getByText('Drop widgets here')).toHaveCount(0)

  // Left column holds heading, paragraph and button in order; the right holds the image.
  let config = await readConfig(page)
  const services = config.pages.find((p: { name: string }) => p.name === 'Services')
  const [left, right] = services.blocks[0].children
  expect(left.children.map((c: { type: string }) => c.type)).toEqual(['heading', 'paragraph', 'button'])
  expect(right.children.map((c: { type: string }) => c.type)).toEqual(['image'])

  // ── 14-16: click the button; its controls open; change its words ─────
  await canvas(page).getByText('Get in touch', { exact: true }).first().click()
  const labelField = page.getByLabel('Button text')
  await expect(labelField).toBeVisible()
  await expect(page.getByLabel('Link type')).toBeVisible()
  await labelField.fill('Book a visit')
  await expect(canvas(page).getByText('Book a visit')).toBeVisible()

  // ── 17-19: Page colours change Services only ─────────────────────────
  await tab(page, 'Pages')
  await page.getByRole('button', { name: 'Page colors' }).first().click()
  await page.getByLabel('Page background HEX value').fill('#123456')
  await page.getByLabel('Page background HEX value').press('Enter')
  const pageWrapper = canvas(page).locator('[data-page-colors]')
  await expect(pageWrapper).toHaveCSS('background-color', 'rgb(18, 52, 86)')
  await page.getByRole('button', { name: 'Home', exact: true }).first().click()
  await expect(canvas(page).locator('[data-page-colors]')).not.toHaveCSS('background-color', 'rgb(18, 52, 86)')
  await page.getByRole('button', { name: 'Services', exact: true }).first().click()

  // ── 20-21: global Theme colour reaches the header and the page ───────
  await tab(page, 'Site')
  await expect(page.getByRole('heading', { name: 'Theme Colors' })).toBeVisible()
  await setHex(page, 'Primary', PRIMARY)
  await expect(canvas(page).locator('[aria-label^="navbar block"] .bg-brand').first()).toHaveCSS('background-color', PRIMARY_RGB)

  // ── 22-23: header style changes everywhere ──────────────────────────
  await tab(page, 'Layouts')
  await page.getByRole('button', { name: 'Header', exact: true }).click()
  await page.locator('[data-preset-card="h3"]').click()
  expect((await readConfig(page)).header[0].variant).toBe('stacked')
  await expect(canvas(page).locator('[aria-label^="navbar block"] nav.flex-col')).toBeVisible()

  // ── 24-26: a second page appears in the header menu and opens ───────
  await tab(page, 'Pages')
  await page.getByRole('button', { name: 'Add page' }).first().click()
  await page.getByLabel('Page name').fill('About')
  await page.getByLabel('Page name').press('Enter')
  config = await readConfig(page)
  expect(config.header[0].props.links).toContain('About')
  // In Preview the menu links are real: Services opens the page with the button, About the empty one.
  await page.getByRole('button', { name: 'Toggle preview mode' }).click()
  const menu = canvas(page).locator('nav').first()
  await menu.getByText('Services', { exact: true }).filter({ visible: true }).first().click()
  await expect(canvas(page).getByText('Book a visit')).toBeVisible()
  await menu.getByText('About', { exact: true }).filter({ visible: true }).first().click()
  await expect(canvas(page).getByText('Book a visit')).toHaveCount(0)
  await page.getByRole('button', { name: 'Toggle preview mode' }).click()
  await expect(page.getByTestId('empty-page')).toBeVisible()

  // ── 27-28: footer style changes everywhere ──────────────────────────
  await tab(page, 'Layouts')
  await page.getByRole('button', { name: 'Footer', exact: true }).click()
  await page.locator('[data-preset-card="f2"]').click()
  expect((await readConfig(page)).footer[0].variant).toBe('inline')

  // ── 29-30: Services stays usable on tablet and phone ────────────────
  await tab(page, 'Pages')
  await page.getByRole('button', { name: 'Services', exact: true }).first().click()
  const headingEl = canvas(page).getByRole('heading', { level: 2 }).first()
  const photo = canvas(page).locator('img').first()
  await expect(photo).toBeVisible()
  // Desktop and tablet: the two columns sit side by side.
  let h = await headingEl.boundingBox()
  let p = await photo.boundingBox()
  expect(p!.x).toBeGreaterThan(h!.x + h!.width - 20)
  // Phone: one column, the picture below the heading and in line with it.
  await page.getByRole('button', { name: 'Mobile', exact: true }).click()
  await expect(canvas(page)).toHaveCSS('max-width', '375px')
  h = await headingEl.boundingBox()
  p = await photo.boundingBox()
  expect(p!.y).toBeGreaterThan(h!.y)
  expect(Math.abs(p!.x - h!.x)).toBeLessThan(60)
  await page.getByRole('button', { name: 'Desktop', exact: true }).click()

  // ── 31-33: save, reload, nothing changes ────────────────────────────
  await page.waitForTimeout(1500)
  const before = await readConfig(page)
  await reloadEditor(page)
  await expect(canvas(page)).toBeVisible({ timeout: 20_000 })
  const after = await readConfig(page)
  expect(after.pages.map((p: { name: string }) => p.name)).toEqual(before.pages.map((p: { name: string }) => p.name))
  expect(after.pages[1].blocks[0].children.length).toBe(2)
  expect(after.pages[1].colors.background).toBe('#123456')
  expect(after.header[0].variant).toBe('stacked')
  expect(after.footer[0].variant).toBe('inline')
  expect(after.buildMode).toBe('custom')

  // ── 34-35: export matches, and the menu works in the exported site ──
  const folder = await mkdtemp(join(tmpdir(), 'sitebuilder-layout-export-'))
  const downloads: Download[] = []
  page.on('download', (d) => downloads.push(d))
  await page.getByRole('button', { name: /^Export$/ }).click()
  await expect.poll(() => downloads.length, { timeout: 30_000 }).toBeGreaterThanOrEqual(3)
  await page.waitForTimeout(1500)
  for (const d of downloads) await writeFile(join(folder, d.suggestedFilename()), await readFile(await d.path()))
  const server = await serveFolder(folder)
  try {
    await page.goto(`${server.url}/services.html`)
    await expect(page.getByText('Book a visit')).toBeVisible()
    await expect(page.locator('[data-page-colors]')).toHaveCSS('background-color', 'rgb(18, 52, 86)')
    await page.getByRole('link', { name: 'About' }).first().click()
    await expect(page).toHaveURL(/about\.html/)
    await page.getByRole('link', { name: 'Home' }).first().click()
    await expect(page).toHaveURL(/index\.html|\/$/)
  } finally { await server.close() }

  expectNoPageErrors(errors)
})

test('custom build details: names, menu, duplicate pages, column drag, header colours', async ({ page }) => {
  test.setTimeout(240_000)
  await page.setViewportSize({ width: 1700, height: 1000 })
  const errors = watchForErrors(page)
  await openCustomEditor(page, 'Acme Studio')
  await buildChrome(page)

  // Two pages with one name get different names, so the menu never lists the same word twice.
  await tab(page, 'Pages')
  for (const name of ['Services', 'Services']) {
    await page.getByRole('button', { name: 'Add page' }).first().click()
    await page.getByLabel('Page name').fill(name)
    await page.getByLabel('Page name').press('Enter')
  }
  let config = await readConfig(page)
  expect(config.header[0].props.links).toEqual(['Home', 'Services', 'Services 2'])

  // A menu item removed by hand stays removed when another page is added.
  await page.getByRole('button', { name: /^Header/ }).first().click()
  await page.getByRole('button', { name: /remove/i }).nth(1).click()
  config = await readConfig(page)
  expect(config.header[0].props.links).toEqual(['Home', 'Services 2'])
  await tab(page, 'Pages')
  await page.getByRole('button', { name: 'Add page' }).first().click()
  await page.getByLabel('Page name').fill('Team')
  await page.getByLabel('Page name').press('Enter')
  config = await readConfig(page)
  expect(config.header[0].props.links).toEqual(['Home', 'Services 2'])
  expect(config.header[0].props.autoPageLinks).toBe(false)

  // Selection labels use plain words: Header, Section, Column, and the widget's own name.
  await page.getByRole('button', { name: /^Header/ }).first().click()
  await expect(page.getByText('Header', { exact: true }).first()).toBeVisible()
  await tab(page, 'Layouts')
  await page.getByRole('button', { name: 'Sections', exact: true }).click()
  await page.getByLabel('Search layouts').fill('2 equal')
  await page.locator('[data-layout-card="two-equal"]').click()
  await expect(canvas(page).getByText('Section', { exact: true }).first()).toBeVisible()
  await tab(page, 'Layers')
  await expect(page.getByText('Section', { exact: true }).first()).toBeVisible()
  await expect(page.getByText('Container', { exact: true })).toHaveCount(0)

  // The columns of a two-column layout can be dragged.
  const handle = canvas(page).getByRole('separator', { name: 'Drag to resize the columns' })
  await expect(handle).toBeVisible()
  const box = (await handle.boundingBox())!
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.mouse.move(box.x - 250, box.y + box.height / 2, { steps: 10 })
  await page.mouse.up()
  config = await readConfig(page)
  const section = config.pages.find((p: { blocks: unknown[] }) => p.blocks.length).blocks[0]
  const [a, b] = String(section.props.template).match(/[\d.]+fr/g)!.map((v) => parseFloat(v))
  expect(a).toBeLessThan(b)
  expect(a + b).toBeCloseTo(10, 0)

  // Three columns get two handles; dragging one leaves the third column alone.
  await tab(page, 'Layouts')
  await page.getByLabel('Search layouts').fill('3 equal')
  await page.locator('[data-layout-card="three-equal"]').click()
  const handles = canvas(page).getByRole('separator')
  await expect(handles).toHaveCount(2)
  const h1 = (await handles.first().boundingBox())!
  await page.mouse.move(h1.x + h1.width / 2, h1.y + h1.height / 2)
  await page.mouse.down()
  await page.mouse.move(h1.x + 140, h1.y + h1.height / 2, { steps: 10 })
  await page.mouse.up()
  config = await readConfig(page)
  const three = config.pages.find((p: { blocks: unknown[] }) => p.blocks.length).blocks[1]
  const [c1, c2, c3] = String(three.props.template).match(/[\d.]+fr/g)!.map((v) => parseFloat(v))
  expect(c1).toBeGreaterThan(c2)
  expect(c3).toBeCloseTo(3.3, 0)

  // Advanced is its own tab: spacing, size, position, animation, anchor.
  await page.getByRole('button', { name: 'Advanced', exact: true }).last().click()
  await expect(page.getByLabel('Section anchor')).toBeVisible()
  await page.getByLabel('Entrance animation').selectOption('fade')
  config = await readConfig(page)
  expect(config.pages.find((p: { blocks: unknown[] }) => p.blocks.length).blocks[1].style.animation).toBe('fade')
  await page.getByRole('button', { name: 'Content', exact: true }).last().click()
  await expect(page.getByLabel('Section anchor')).toHaveCount(0)

  // The header can keep its links showing on a phone instead of folding them behind a button.
  await page.getByRole('button', { name: 'Pages', exact: true }).first().click()
  await page.getByRole('button', { name: /^Header/ }).first().click()
  await page.getByLabel('On phones and tablets').selectOption('links')
  await page.getByRole('button', { name: 'Mobile', exact: true }).first().click()
  const links = canvas(page).locator('[data-nav-mobile="links"] nav a').filter({ hasText: 'Home' }).first()
  await expect(links).toBeVisible()
  await page.getByRole('button', { name: 'Desktop', exact: true }).first().click()

  // Header link and button colours exist and reach the header only.
  await tab(page, 'Site')
  await setHex(page, 'Header link', '#ff00aa')
  await expect(canvas(page).locator('[data-theme-region="header"]')).toHaveAttribute('style', /ff00aa/i)
  await expect(canvas(page).locator('[data-theme-region="footer"]')).not.toHaveAttribute('style', /ff00aa/i)
  await setHex(page, 'Footer link', '#00aaff')
  await expect(canvas(page).locator('[data-theme-region="footer"]')).toHaveAttribute('style', /00aaff/i)

  expectNoPageErrors(errors)
})

test('blank start: Choose Layout opens the picker on All, slots stay empty, header and footer come from their pickers', async ({ page }) => {
  test.setTimeout(180_000)
  await page.setViewportSize({ width: 1700, height: 1000 })
  const errors = watchForErrors(page)
  await openCustomEditor(page, 'Acme Studio')

  // Choose Layout: the picker opens on "All", with wireframe cards and no ready-made content.
  await page.getByRole('button', { name: /Choose Layout/ }).click()
  const dialog = page.getByRole('dialog', { name: /Choose a layout/ })
  await expect(dialog.getByRole('button', { name: 'All', exact: true })).toHaveAttribute('aria-pressed', 'true')
  for (const name of ['Basic', 'Columns', 'Grid', 'Hero', 'Content', 'Sidebar', 'Cards', 'Advanced']) await expect(dialog.getByRole('button', { name, exact: true })).toBeVisible()
  await expect(dialog.getByRole('button', { name: 'Header', exact: true })).toBeVisible()
  await expect(dialog.getByRole('button', { name: 'Footer', exact: true })).toBeVisible()
  await dialog.locator('[data-layout-card="two-equal"]').click()
  await expect(canvas(page).getByText('Add widget')).toHaveCount(2)
  await expect(canvas(page).getByText(/Lorem|Grow your business|Get Started/i)).toHaveCount(0)

  // Add Section → 3 Columns: three empty areas below.
  await canvas(page).getByTestId('add-section-end').click()
  await page.getByRole('dialog').locator('[data-layout-card="three-equal"]').click()
  await expect(canvas(page).getByText('Add widget')).toHaveCount(5)

  // The header comes from the picker on the canvas, never made for the client.
  await expect(canvas(page).locator('nav')).toHaveCount(0)
  await page.locator('[data-build-region="header"]').click()
  await page.locator('[data-preset-card="h1"]').click()
  await expect(canvas(page).locator('nav')).toHaveCount(1)
  await page.locator('[data-build-region="footer"]').click()
  await page.locator('[data-preset-card="f6"]').click()
  expect((await readConfig(page)).footer[0].props.columnCount).toBe(4)

  // Website colours are separate from the editor's: a palette changes the page, not the panels.
  await tab(page, 'Site')
  await page.getByRole('button', { name: 'Blue', exact: true }).click()
  await expect(canvas(page)).toHaveCSS('background-color', 'rgb(255, 255, 255)')
  const accent = await canvas(page).evaluate((el) => getComputedStyle(el).getPropertyValue('--brand-primary').trim())
  expect(accent).toBe('#2563eb')
  expectNoPageErrors(errors)
})

test('a refresh on the editor opens the SiteBuilder home, and the project is still there', async ({ page }) => {
  test.setTimeout(120_000)
  await openCustomEditor(page, 'Acme Studio')
  await page.getByRole('button', { name: /Start Blank/ }).click()
  await expect(page).toHaveURL(/\/editor/)
  await page.reload()
  await expect(page).toHaveURL(/localhost:\d+\/$|127\.0\.0\.1:\d+\/$/)
  await expect(page.getByRole('region', { name: /Site preview/ })).toHaveCount(0)
  // In-app navigation still opens it, and nothing was lost.
  await page.getByRole('link', { name: 'My workspace' }).click()
  await page.getByRole('link', { name: 'Editor', exact: true }).first().click()
  await expect(page).toHaveURL(/\/editor/)
  await expect(page.getByRole('region', { name: /Site preview/ })).toBeVisible()
  expect((await readConfig(page)).pages[0].blocks).toHaveLength(1)
  await expect(page.locator('[data-build-region="header"]')).toBeVisible()
})

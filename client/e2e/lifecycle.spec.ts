import { test, expect, openBlankEditor, watchForErrors, expectNoPageErrors, reloadEditor } from './fixtures'
import type { Page } from '@playwright/test'

/**
 * The life of a project: pages, shared parts, history, and whether any of it
 * is still there tomorrow.
 *
 * These are the failures that cost someone their work rather than their
 * patience, so they are asserted against the saved document â€” reloaded from
 * the API â€” rather than against what happens to be on screen.
 */

function canvasOf(page: Page) {
  return page.getByRole('region', { name: /Site preview/ })
}

async function readConfig(page: Page) {
  await page.getByRole('button', { name: 'Toggle JSON drawer' }).click()
  const text = await page.locator('pre').first().innerText()
  await page.getByRole('button', { name: 'Toggle JSON drawer' }).click()
  return JSON.parse(text)
}

/**
 * Runs an edit and waits for the save it causes to reach the API.
 *
 * Watching the "Saved" indicator is not enough: it is still showing from the
 * previous save while the new edit is waiting out the autosave delay, so a
 * test can read it, move on, and reload before the work was ever written. The
 * request itself is the only unambiguous signal, and waiting for it is exact
 * rather than a guess at how long the delay is.
 */
async function savedAfter(page: Page, edit: () => Promise<void>) {
  const written = page.waitForResponse(
    (response) =>
      /\/api\/sites\/[^/]+$/.test(new URL(response.url()).pathname) &&
      response.request().method() === 'PUT' &&
      response.ok(),
    { timeout: 30_000 },
  )
  await edit()
  await written
}

test.describe('a project over its life', () => {
  test.beforeEach(async ({ page }) => {
    await openBlankEditor(page)
  })

  test('opens as a multi-page website', async ({ page }) => {
    const config = await readConfig(page)
    const names = config.pages.map((p: { name: string }) => p.name)

    // The page names belong to the template, not to this test: every design
    // opens with a home page and offers a way to make contact, and the rest
    // are that design's own.
    expect(names.length).toBeGreaterThanOrEqual(4)
    expect(names[0]).toBe('Home')
    expect(names).toContain('Contact')
    expect(new Set(names).size, 'two pages share a name').toBe(names.length)
  })

  test('adds, renames and deletes a page', async ({ page }) => {
    const errors = watchForErrors(page)

    await page.getByRole('button', { name: 'Add page' }).first().click()
    await page.getByLabel('Page name').fill('Gallery')
    await page.getByLabel('Page name').press('Enter')

    await expect(page.getByRole('button', { name: /Gallery/ }).first()).toBeVisible()
    let config = await readConfig(page)
    expect(config.pages.some((p: { name: string }) => p.name === 'Gallery')).toBe(true)
    // A new page gets its own address, not a duplicate of the home page's.
    const gallery = config.pages.find((p: { name: string }) => p.name === 'Gallery')
    expect(gallery.path).toBe('/gallery')

    await page.getByRole('button', { name: 'Rename Gallery' }).first().click()
    await page.getByRole('textbox', { name: 'Rename Gallery' }).fill('Our work')
    await page.getByRole('textbox', { name: 'Rename Gallery' }).press('Enter')

    config = await readConfig(page)
    expect(config.pages.some((p: { name: string }) => p.name === 'Our work')).toBe(true)

    await page.getByRole('button', { name: 'Delete Our work' }).first().click()
    config = await readConfig(page)
    expect(config.pages.some((p: { name: string }) => p.name === 'Our work')).toBe(false)

    expectNoPageErrors(errors)
  })

  test('switching pages shows that page and keeps the shared header', async ({ page }) => {
    const home = await canvasOf(page).locator('h1').first().textContent()

    await page.getByRole('button', { name: /^Contact/ }).first().click()

    // A different page, but the same header and footer around it.
    await expect(canvasOf(page).locator('nav').first()).toBeVisible()
    await expect(canvasOf(page).locator('footer').first()).toBeVisible()
    await expect(page.getByRole('button', { name: /Header .{1,6} every page/ })).toBeVisible()

    const about = await canvasOf(page).locator('h1, h2').first().textContent()
    expect(about).not.toBe(home)
  })

  test('a new page joins the menu on every page', async ({ page }) => {
    await page.getByRole('button', { name: 'Add page' }).first().click()
    await page.getByLabel('Page name').fill('Gallery')
    await page.getByLabel('Page name').press('Enter')

    const config = await readConfig(page)
    const navbar = config.header.find((block: { type: string }) => block.type === 'navbar')
    expect(navbar.props.links).toContain('Gallery')
  })

  test('editing the shared header changes it on the other pages too', async ({ page }) => {
    // Clicked in the navbar's own right-hand padding. The middle of the bar is
    // a menu link, which selects that link for editing rather than the navbar
    // section, and the top-left corner is covered by the "Header Â· every page"
    // badge. The padding beyond the last item belongs to the navbar itself.
    const nav = canvasOf(page).locator('nav').first()
    const bar = (await nav.boundingBox())!
    await nav.click({ position: { x: bar.width - 8, y: bar.height / 2 } })

    const logo = page.getByLabel('Business name')
    await expect(logo).toBeVisible()
    await logo.fill('Shared Header Works')

    await page.getByRole('button', { name: /^Contact/ }).first().click()
    await expect(canvasOf(page).locator('nav').first()).toContainText('Shared Header Works')
  })

  test('undo and redo restore an edit', async ({ page }) => {
    const canvas = canvasOf(page)
    await canvas.locator('h1').first().click()

    const before = await canvas.locator('h1').first().textContent()
    await page.getByLabel('Heading', { exact: true }).fill('Changed for the undo test')
    await expect(canvas.locator('h1').first()).toHaveText('Changed for the undo test')

    await page.getByLabel('Undo').click()
    await expect(canvas.locator('h1').first()).toHaveText(before!.trim())

    await page.getByLabel('Redo').click()
    await expect(canvas.locator('h1').first()).toHaveText('Changed for the undo test')
  })

  test('undo brings back a deleted section', async ({ page }) => {
    const before = (await readConfig(page)).pages[0].blocks.length

    await page.getByRole('button', { name: 'Layers', exact: true }).first().click()
    const layer = page.locator('div.group').filter({ hasText: /^Hero/ }).first()
    await layer.hover()
    await layer.getByRole('button', { name: /Remove/ }).first().click()
    expect((await readConfig(page)).pages[0].blocks.length).toBe(before - 1)

    await page.getByLabel('Undo').click()
    expect((await readConfig(page)).pages[0].blocks.length).toBe(before)
  })

  test('keeps the whole project across a reload', async ({ page }) => {
    const canvas = canvasOf(page)

    await savedAfter(page, async () => {
      await canvas.locator('h1').first().click()
      await page.getByLabel('Heading', { exact: true }).fill('Survives a reload')
      await expect(canvas.locator('h1').first()).toHaveText('Survives a reload')

      await page.getByRole('button', { name: 'Add page' }).first().click()
      await page.getByLabel('Page name').fill('Gallery')
      await page.getByLabel('Page name').press('Enter')
    })

    await reloadEditor(page)

    // Adding a page moves the editor onto it, and the editor remembers which
    // page was open â€” so the home page has to be asked for by name before its
    // heading can be read.
    await page.getByRole('button', { name: /^Home/ }).first().click()
    await expect(canvasOf(page).locator('h1').first()).toHaveText('Survives a reload')

    const config = await readConfig(page)
    expect(config.pages.some((p: { name: string }) => p.name === 'Gallery')).toBe(true)
    expect(config.header?.some((b: { type: string }) => b.type === 'navbar')).toBe(true)
    expect(config.footer?.some((b: { type: string }) => b.type === 'footer')).toBe(true)
  })

  test('reopens the saved site from the dashboard', async ({ page }) => {
    const canvas = canvasOf(page)

    await savedAfter(page, async () => {
      await canvas.locator('h1').first().click()
      await page.getByLabel('Heading', { exact: true }).fill('Reopened from the list')
      await expect(canvas.locator('h1').first()).toHaveText('Reopened from the list')
    })

    await page.getByText('Projects', { exact: true }).click()
    await expect(page).toHaveURL(/dashboard/)

    // Reopened from the server's copy, not from whatever the browser still
    // holds â€” which is the thing worth checking, because that copy is what
    // survives a new machine.
    await page.getByRole('button', { name: 'Edit' }).first().click()
    await expect(page).toHaveURL(/editor/)
    await expect(canvasOf(page).locator('h1').first()).toHaveText('Reopened from the list')
  })
})

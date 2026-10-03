import { test, expect, signUp, watchForErrors, expectNoPageErrors } from './fixtures'
import type { Page } from '@playwright/test'

/**
 * The two ways in, from /start: "Choose a template" and "Create a site". Both begin by asking what
 * kind of website this is and about the business, and neither drops anyone straight into a gallery
 * or an empty editor.
 */

const canvas = (page: Page) => page.getByRole('region', { name: /Site preview/ })

async function readConfig(page: Page) {
  await page.getByRole('button', { name: 'Toggle JSON drawer' }).click()
  const text = await page.locator('pre').first().innerText()
  await page.getByRole('button', { name: 'Toggle JSON drawer' }).click()
  return JSON.parse(text)
}

async function fillDetails(page: Page, name: string) {
  await page.getByLabel(/Website \/ Business name/).fill(name)
  await page.getByLabel('Short description').fill('Modern English-medium school providing education from nursery to class 12.')
  await page.getByLabel('Tagline').fill('Learning Today, Leading Tomorrow')
  await page.getByLabel('Main button text').fill('Apply for Admission')
  await page.getByLabel(/^Email/).fill('hello@bfa.example')
  await page.getByLabel('Phone').fill('+91 98765 43210')
}

test('Choose a template: type, details, ranked gallery, preview, use', async ({ page }) => {
  test.setTimeout(240_000)
  const errors = watchForErrors(page)
  await page.setViewportSize({ width: 1500, height: 1000 })
  await signUp(page)
  await page.goto('/start')

  // 1 — the first thing is the website type, not a gallery.
  await page.getByRole('button', { name: /Browse templates/ }).click()
  await expect(page).toHaveURL(/\/start\/template\/type/)
  await expect(page.getByRole('heading', { name: 'What kind of website are you building?' })).toBeVisible()
  await expect(page.getByText('Choose a category so we can show templates designed for your business.')).toBeVisible()
  const next = page.getByRole('button', { name: /^Continue/ })
  await expect(next).toBeDisabled()

  // The search narrows the cards; 29 types without it.
  expect(await page.locator('[data-website-type]').count()).toBe(29)
  await page.getByLabel('Search website type').fill('school')
  await expect(page.locator('[data-website-type="school"]')).toBeVisible()
  await expect(page.locator('[data-website-type="restaurant"]')).toHaveCount(0)
  await page.locator('[data-website-type="school"]').click()
  await expect(next).toBeEnabled()
  await next.click()

  // 2 — business details; two things are required.
  await expect(page).toHaveURL(/\/start\/template\/details/)
  await expect(page.getByRole('heading', { name: 'Tell us about your business' })).toBeVisible()
  await expect(page.getByTestId('chosen-type')).toContainText('School')
  await page.getByRole('button', { name: /Continue to Templates/ }).click()
  await expect(page.getByText('Enter your website or business name')).toBeVisible()
  await expect(page.getByText('Add a short description')).toBeVisible()
  await fillDetails(page, 'Bright Future Academy')

  // Going back keeps the answers, and so does a refresh.
  await page.getByRole('button', { name: 'Back' }).click()
  await expect(page.locator('[data-website-type="school"]')).toHaveAttribute('aria-checked', 'true')
  await page.getByRole('button', { name: /^Continue/ }).click()
  await page.reload()
  await expect(page.getByLabel(/Website \/ Business name/)).toHaveValue('Bright Future Academy')

  // 3 — a gallery that starts from the type.
  await page.getByRole('button', { name: /Continue to Templates/ }).click()
  await expect(page).toHaveURL(/\/templates\?from=start/)
  await expect(page.getByTestId('start-ranking')).toContainText('School')
  await expect(page.getByRole('group', { name: 'Template style' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'View all templates' })).toBeVisible()
  const cards = page.locator('article.group')
  await expect(cards.first()).toBeVisible({ timeout: 20_000 })
  await expect(cards.first()).toContainText(/education|school|academy|learn|course|coaching/i)

  // 4 — preview, on three screen sizes, with the pages it includes.
  await cards.first().getByRole('button', { name: 'Preview', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await expect(dialog).toContainText(/page/)
  for (const size of ['tablet', 'mobile', 'desktop']) {
    await dialog.getByRole('button', { name: size, exact: true }).click()
    await expect(dialog.getByRole('button', { name: size, exact: true })).toHaveAttribute('aria-pressed', 'true')
  }

  // 5 and 6 — use it: the editor opens on the template.
  await dialog.getByRole('button', { name: /Use this template/ }).click()
  await expect(page).toHaveURL(/\/editor/, { timeout: 30_000 })
  await expect(page.locator('iframe[title$="website canvas"], [role="region"][aria-label^="Site preview"]').first()).toBeVisible({ timeout: 30_000 })
  // Template previews load many third-party and sample files; only a thrown error counts here.
  expect(errors.messages.filter((message) => message.startsWith('uncaught'))).toEqual([])
})

test('Create a site: type, details, starting design, pages, then the widget editor', async ({ page }) => {
  test.setTimeout(240_000)
  const errors = watchForErrors(page)
  await page.setViewportSize({ width: 1700, height: 1000 })
  await signUp(page)
  await page.goto('/start')

  await page.getByRole('button', { name: /Start building/ }).click()
  await expect(page).toHaveURL(/\/start\/build\/type/)
  await expect(page.getByRole('heading', { name: 'What kind of website do you want to create?' })).toBeVisible()
  await page.locator('[data-website-type="restaurant"]').click()
  await page.getByRole('button', { name: /^Continue/ }).click()

  await expect(page.getByRole('heading', { name: 'Tell us about your business' })).toBeVisible()
  await expect(page.getByRole('button', { name: /Continue to Design/ })).toBeVisible()
  await fillDetails(page, 'The Urban Plate')
  await page.getByRole('button', { name: /Continue to Design/ }).click()

  // The design is chosen before any editor: 12 of them, blank being only one.
  await expect(page.getByRole('heading', { name: 'Choose how your website should look' })).toBeVisible()
  expect(await page.locator('[data-design]').count()).toBe(12)
  const next = page.getByRole('button', { name: /^Continue/ })
  await expect(next).toBeDisabled()
  await expect(page.locator('[data-design]').first()).toContainText('Suggested')
  await page.locator('[data-design="restaurant"]').click()
  await expect(next).toBeEnabled()
  await next.click()

  // Pages: Home is fixed, the type's pages are ticked, your own can be added.
  await expect(page.getByRole('heading', { name: 'Which pages do you need?' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Menu', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: 'Gallery', exact: true }).click()
  await page.getByLabel('Custom page name').fill('Events')
  await page.getByRole('button', { name: 'Add page' }).click()
  await expect(page.getByRole('button', { name: 'Events', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: 'Create my site' }).click()

  // The editor opens on a starter site, not an empty canvas.
  await expect(page).toHaveURL(/\/editor/, { timeout: 30_000 })
  await expect(canvas(page)).toBeVisible({ timeout: 30_000 })
  await expect(canvas(page).locator('nav').first()).toContainText('The Urban Plate')
  await expect(canvas(page).locator('h1').first()).toContainText('The Urban Plate')
  await expect(page.getByTestId('empty-page')).toHaveCount(0)
  let config = await readConfig(page)
  expect(config.pages.map((p: { name: string }) => p.name)).toEqual(['Home', 'About', 'Menu', 'Contact', 'Events'])
  expect(config.pages[0].blocks.length).toBeGreaterThan(4)
  expect(config.header[0].props.ctaText).toBe('Apply for Admission')
  expect(JSON.stringify(config.footer)).toContain('The Urban Plate')

  // All the widgets are there, searchable, and one lands where it is pointed, not at the bottom.
  await page.getByRole('button', { name: 'Widgets', exact: true }).first().click()
  const search = page.getByPlaceholder('Search 200+ widgets...')
  await expect(search).toBeVisible()
  await canvas(page).locator('h1').first().click()
  await search.fill('Heading')
  await page.getByRole('button', { name: /^Heading$/ }).first().click()
  config = await readConfig(page)
  const home = config.pages[0].blocks
  expect(home[0].type).toBe('hero')
  expect(home[1].type).toBe('heading')

  // The shared header lists every page, and Events has somewhere to start.
  expect(config.header[0].props.links).toEqual(['Home', 'About', 'Menu', 'Contact', 'Events'])
  expectNoPageErrors(errors)
})

test('Create a site: blank canvas keeps the chosen pages empty, and refresh keeps the setup', async ({ page }) => {
  test.setTimeout(180_000)
  await page.setViewportSize({ width: 1600, height: 1000 })
  await signUp(page)
  await page.goto('/start/build/type')
  await page.locator('[data-website-type="portfolio"]').click()
  await page.getByRole('button', { name: /^Continue/ }).click()
  await fillDetails(page, 'Asha Rao')
  await page.reload()
  await expect(page.getByLabel(/Website \/ Business name/)).toHaveValue('Asha Rao')
  await page.getByRole('button', { name: /Continue to Design/ }).click()
  await page.locator('[data-design="blank"]').click()
  await page.getByRole('button', { name: /^Continue/ }).click()
  await page.getByRole('button', { name: 'Create my site' }).click()
  await expect(page).toHaveURL(/\/editor/, { timeout: 30_000 })
  await expect(page.getByTestId('empty-page')).toBeVisible()
  const config = await readConfig(page)
  expect(config.pages.map((p: { name: string }) => p.name)).toEqual(['Home', 'About', 'Portfolio', 'Contact'])
})

test('a later screen cannot be opened before the first question is answered', async ({ page }) => {
  await signUp(page)
  await page.goto('/start/build/design')
  await expect(page).toHaveURL(/\/start\/build\/type/)
  await page.goto('/start/nonsense/type')
  await expect(page).toHaveURL(/\/start$/)
})

test('"Write it for me" drafts the empty fields and keeps what was typed', async ({ page }) => {
  test.setTimeout(120_000)
  const errors = watchForErrors(page)
  await signUp(page)
  await page.goto('/start')
  await page.getByRole('button', { name: /Browse templates/ }).click()
  await page.locator('[data-website-type="school"]').click()
  await page.getByRole('button', { name: /^Continue/ }).click()
  await expect(page).toHaveURL(/\/start\/template\/details/)

  // The name comes first: without it the text would not be about anyone.
  await page.getByRole('button', { name: 'Write it for me' }).click()
  await expect(page.getByLabel('Short description')).toHaveValue('')

  await page.getByLabel(/Website \/ Business name/).fill('Bright Future Academy')
  await page.getByLabel('Tagline').fill('My own tagline')
  await page.getByRole('button', { name: 'Write it for me' }).click()
  // With no AI key on the test server the built-in draft is used; either way the description is filled.
  await expect(page.getByLabel('Short description')).not.toHaveValue('', { timeout: 20_000 })
  await expect(page.getByLabel('Tagline')).toHaveValue('My own tagline')
  expectNoPageErrors(errors)
})

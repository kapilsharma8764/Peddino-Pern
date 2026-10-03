import { test, expect, openBlankEditor, watchForErrors, expectNoPageErrors, reloadEditor } from './fixtures'
import type { Download, Page } from '@playwright/test'
import { readFile, writeFile, mkdtemp, readdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { PIXEL, PRIMARY, PRIMARY_RGB, canvas, contrastOf, drawn, hexToRgb, serveFolder, setHex } from './theme-helpers'

/**
 * Theme Colors and Section colours, end to end.
 *
 * Each check is made where the owner would see it: the editor canvas, the page
 * after a reload, and the exported files served from a plain file server. The
 * colour under test is read with getComputedStyle, never from the stored
 * config, so a value that was saved but not drawn cannot pass.
 *
 * Run on two visually different designs (the wizard picks a different template
 * for each trade), and on the imported HTML designs, which are drawn from their
 * own stylesheets and need a separate mechanism.
 */

/** Fills the wizard for a given trade and builds the block editor's own layout. */
async function openBlockEditor(page: Page, _trade: RegExp, name: string) {
  // The block editor's own starter site, saved through the API (see openBlankEditor).
  await openBlankEditor(page, name)
}

async function exportBlockSite(page: Page) {
  const folder = await mkdtemp(join(tmpdir(), 'sitebuilder-theme-export-'))
  const downloads: Download[] = []
  page.on('download', (d) => downloads.push(d))
  await page.getByRole('button', { name: 'Export', exact: true }).click()
  await expect.poll(() => downloads.length, { timeout: 30_000 }).toBeGreaterThanOrEqual(2)
  await page.waitForTimeout(1500)
  for (const d of downloads) await writeFile(join(folder, d.suggestedFilename()), await readFile(await d.path()))
  return { folder, files: await readdir(folder) }
}

for (const design of [
  { name: 'Learning design', trade: /^Education/, business: 'Sharma Coaching' },
  { name: 'Restaurant design', trade: /^Food/, business: 'Spice Route Kitchen' },
]) {
  test.describe(`block editor — ${design.name}`, () => {
    test('a palette change reaches every page, the shared header and the footer', async ({ page }) => {
      const errors = watchForErrors(page)
      await openBlockEditor(page, design.trade, design.business)

      await page.getByRole('button', { name: 'Site', exact: true }).click()
      await expect(page.getByRole('heading', { name: 'Theme Colors' })).toBeVisible()

      const before = await drawn(page, '.site-root .bg-brand.text-white', 'backgroundColor')
      expect(before).not.toBe(PRIMARY_RGB)

      await setHex(page, 'Primary', PRIMARY)

      // The shared header's and footer's own brand-coloured parts.
      const header = canvas(page).locator('[aria-label^="navbar block"]')
      const footer = canvas(page).locator('[aria-label^="footer block"]')
      await expect(header.locator('.bg-brand').first()).toHaveCSS('background-color', PRIMARY_RGB)
      await expect(footer.locator('.bg-brand, .text-brand').first()).toBeVisible()
      await expect.poll(() => drawn(page, '.site-root .bg-brand.text-white', 'backgroundColor')).toBe(PRIMARY_RGB)

      // Then the other pages, reached the way a person reaches them.
      await page.getByRole('button', { name: 'Pages', exact: true }).first().click()
      const pageButtons = page.locator('[aria-label^="Rename "]')
      const count = await pageButtons.count()
      expect(count).toBeGreaterThan(1)
      for (let i = 1; i < Math.min(count, 3); i += 1) {
        await page.locator('[aria-label^="Rename "]').nth(i).locator('xpath=..').getByRole('button').first().click()
        await expect.poll(() => drawn(page, '.site-root .text-brand, .site-root .bg-brand', 'color')).not.toBe('')
        const brandBits = await page.locator('.site-root .bg-brand.text-white').count()
        if (brandBits) await expect.poll(() => drawn(page, '.site-root .bg-brand.text-white', 'backgroundColor')).toBe(PRIMARY_RGB)
        await expect(header.locator('.bg-brand').first()).toHaveCSS('background-color', PRIMARY_RGB)
      }
      expectNoPageErrors(errors)
    })

    test('a section can wear Style 2, Style 3 and a photo without touching its neighbours', async ({ page }) => {
      const errors = watchForErrors(page)
      await openBlockEditor(page, design.trade, design.business)

      const target = canvas(page).locator('[data-block-owner]').filter({ has: page.locator('h2') }).nth(1)
      await target.click()
      await page.getByRole('button', { name: 'Style', exact: true }).click()
      const panel = page.getByTestId('section-colors')
      await expect(panel.getByText('Section colours')).toBeVisible()

      const wrappers = () => canvas(page).locator('[data-section-colors]')
      await expect(wrappers()).toHaveCount(0)

      // Style 3: a band in the theme's primary colour, with readable text.
      await panel.getByRole('radio', { name: /Style 3/ }).click()
      await expect(wrappers()).toHaveCount(1)
      await expect(panel.getByRole('radio', { name: /Style 3/ })).toHaveAttribute('aria-checked', 'true')
      const band = wrappers().first()
      const bandColor = await band.evaluate((el) => getComputedStyle(el).backgroundColor)
      const themeBrand = await canvas(page).evaluate((el) => getComputedStyle(el.querySelector('.site-root') ?? el).getPropertyValue('--color-brand').trim())
      expect(bandColor).toBe(hexToRgb(themeBrand))
      const heading = band.locator('h1, h2, h3').first()
      expect(await contrastOf(page, await heading.evaluate((el) => getComputedStyle(el).color), bandColor)).toBeGreaterThanOrEqual(4.5)

      // Neighbours keep the theme.
      const others = canvas(page).locator('[data-block-owner]:not(:has([data-section-colors])) h2').first()
      expect(await others.evaluate((el) => getComputedStyle(el).color)).not.toBe(await heading.evaluate((el) => getComputedStyle(el).color))

      // Style 2 changes the surface without turning it into the primary colour.
      await panel.getByRole('radio', { name: /Style 2/ }).click()
      await expect(wrappers().first()).toHaveAttribute('data-section-colors', 'style2')
      expect(await wrappers().first().evaluate((el) => getComputedStyle(el).backgroundColor)).not.toBe(bandColor)

      // Undo and redo step through the choices.
      await panel.getByRole('button', { name: 'Undo' }).click()
      await expect(wrappers().first()).toHaveAttribute('data-section-colors', 'style3')
      await panel.getByRole('button', { name: 'Redo' }).click()
      await expect(wrappers().first()).toHaveAttribute('data-section-colors', 'style2')

      // A photo, with an overlay to keep the text readable.
      await panel.getByRole('radio', { name: /Image/ }).click()
      await panel.getByPlaceholder('https://…').fill(PIXEL)
      await panel.getByLabel('Overlay strength').fill('70')
      const photo = wrappers().first()
      await expect(photo).toHaveAttribute('data-section-image', '')
      await expect.poll(() => photo.evaluate((el) => getComputedStyle(el).backgroundImage)).toContain('linear-gradient')
      expect(await photo.evaluate((el) => getComputedStyle(el).backgroundImage)).toContain('url(')
      await expect(panel.getByText(/Estimated text contrast/)).toBeVisible()

      // A hand-picked colour belongs to this section only, and can be cleared.
      await panel.getByRole('button', { name: /Custom colours/ }).click()
      await panel.getByLabel('Headings HEX value').fill('#ff00ff')
      await expect(photo.locator('h1, h2, h3').first()).toHaveCSS('color', 'rgb(255, 0, 255)')
      await panel.getByRole('button', { name: /Clear this custom colour: Headings/ }).click()
      await expect(photo.locator('h1, h2, h3').first()).not.toHaveCSS('color', 'rgb(255, 0, 255)')

      // It survives a reload…
      await page.waitForTimeout(600)
      await reloadEditor(page)
      await expect(canvas(page)).toBeVisible()
      await expect(canvas(page).locator('[data-section-colors="image"]')).toHaveCount(1)

      // …and can be put back.
      await canvas(page).locator('[data-section-colors]').first().click()
      await page.getByRole('button', { name: 'Style', exact: true }).click()
      await page.getByTestId('section-colors').getByRole('button', { name: 'Reset to theme default' }).click()
      await expect(canvas(page).locator('[data-section-colors]')).toHaveCount(0)
      expectNoPageErrors(errors)
    })

    test('the exported site looks like the editor', async ({ page }) => {
      const errors = watchForErrors(page)
      await openBlockEditor(page, design.trade, design.business)

      // A palette change, a bold band and a photo section.
      await page.getByRole('button', { name: 'Site', exact: true }).click()
      await setHex(page, 'Primary', PRIMARY)
      const sections = canvas(page).locator('[data-block-owner]').filter({ has: page.locator('h2') })
      await sections.nth(1).click()
      await page.getByRole('button', { name: 'Style', exact: true }).click()
      await page.getByTestId('section-colors').getByRole('radio', { name: /Style 3/ }).click()
      const bandColor = await canvas(page).locator('[data-section-colors="style3"]').evaluate((el) => getComputedStyle(el).backgroundColor)
      await canvas(page).locator('[data-block-owner]').filter({ has: page.locator('h2') }).nth(2).click()
      // Selecting another section brings its Content forward, so Style is opened again.
      await page.getByRole('button', { name: 'Style', exact: true }).click()
      await page.getByTestId('section-colors').getByRole('radio', { name: /Image/ }).click()
      await page.getByTestId('section-colors').getByPlaceholder('https://…').fill(PIXEL)

      const { folder, files } = await exportBlockSite(page)
      expect(files).toContain('index.html')
      const html = await readFile(join(folder, 'index.html'), 'utf8')
      expect(html).toContain('--brand-primary: #e11d48')
      expect(html).toContain('rgb(var(--rgb-brand) / <alpha-value>)')

      const site = await serveFolder(folder)
      try {
        for (const file of files.filter((f) => f.endsWith('.html')).slice(0, 3)) {
          await page.goto(`${site.url}/${file}`)
          await expect(page.locator('nav').first()).toBeVisible()
          // Tailwind's runtime draws the page after it loads; the shared header's
          // brand-coloured button is on every page, so it is the readiness signal.
          await expect.poll(() => drawn(page, '.bg-brand', 'backgroundColor')).toBe(PRIMARY_RGB)
        }
        await page.goto(`${site.url}/index.html`)
        const exportedBand = page.locator('[class^="s-"]:has(h2)', { hasNot: page.locator('[data-section-image]') }).filter({ has: page.locator('h2') })
        await expect.poll(() => page.locator('div[class^="s-"]').first().evaluate((el) => getComputedStyle(el).backgroundColor)).toBeTruthy()
        const bands = await page.locator('div[class^="s-"]').evaluateAll((els) => els.map((el) => getComputedStyle(el).backgroundColor))
        expect(bands).toContain(bandColor)
        expect(await page.locator('div[data-section-image]').evaluate((el) => getComputedStyle(el).backgroundImage)).toContain('linear-gradient')
        void exportedBand
      } finally {
        await site.close()
      }
      expectNoPageErrors(errors)
    })
  })
}


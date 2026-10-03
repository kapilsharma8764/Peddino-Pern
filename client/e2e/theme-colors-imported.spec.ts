import { test, expect, signUp, reloadEditor } from './fixtures'
import type { Page } from '@playwright/test'
import { readFile, writeFile, mkdtemp, readdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { PIXEL, contrastOf, hexToRgb, serveFolder, setHex } from './theme-helpers'

/**
 * Theme Colors and Section colours on the imported HTML designs.
 *
 * Those designs are drawn from their own stylesheets inside a sandboxed frame,
 * so nothing here can read the stored theme to decide whether it worked: every
 * assertion is on the colour the browser computes for an element in the page
 * the visitor would see — in the editor's frame, after a reload, and in the
 * downloaded files served from a plain file server.
 */

const frameOf = (page: Page) => page.frameLocator('iframe[title$="website canvas"]')

async function openImported(page: Page, name: string) {
  await signUp(page)
  await page.goto('/create')
  await page.getByLabel('Website title').fill('Sharma Coaching')
  await page.getByRole('button', { name: /^Education/ }).click()
  await page.getByRole('button', { name: 'Continue' }).click()
  await expect(page.getByRole('heading', { name: 'Story' })).toBeVisible()
  await page.getByRole('button', { name: 'Skip for now' }).click()
  await expect(page.getByRole('heading', { name: 'Details' })).toBeVisible()
  await page.getByRole('button', { name: /^Finish/ }).click()
  await expect(page.getByRole('heading', { name: 'Your profile is ready' })).toBeVisible({ timeout: 15_000 })
  await page.getByRole('button', { name: 'Browse templates' }).click()
  await expect(page.getByRole('heading', { name: 'Find your starting point.' })).toBeVisible()
  // The gallery opens on the business's own category; these designs live in others.
  await page.goto('/templates?category=all')
  await expect(page.getByRole('heading', { name: 'Find your starting point.' })).toBeVisible()
  await page.getByLabel('Search templates').fill(name)
  await page.locator('article.group').filter({ hasText: name }).first().getByRole('button', { name: /Use this/ }).click()
  await expect(page).toHaveURL(/\/editor/)
  await expect(page.locator('iframe[title$="website canvas"]')).toBeVisible({ timeout: 20_000 })
}

async function openColoursTab(page: Page) {
  await page.getByRole('button', { name: /Colours/ }).first().click()
  await expect(page.getByRole('heading', { name: 'Theme Colors' })).toBeVisible({ timeout: 20_000 })
}

type Property = 'color' | 'backgroundColor' | 'borderTopColor'

/** Elements (by editor node id) currently drawing `rgb` as their text, background or border colour. */
async function elementsDrawing(page: Page, rgb: string) {
  return frameOf(page)
    .locator('html')
    .evaluate((root, target) => {
      const found: { id: string; property: string }[] = []
      root.querySelectorAll('[data-builder-node]').forEach((el) => {
        const style = getComputedStyle(el)
        for (const property of ['color', 'backgroundColor', 'borderTopColor'] as const) {
          if (style[property] === target && (property !== 'borderTopColor' || parseFloat(style.borderTopWidth) > 0)) {
            found.push({ id: el.getAttribute('data-builder-node')!, property })
            break
          }
        }
      })
      return found.slice(0, 60)
    }, rgb)
}

async function styleOf(page: Page, id: string, property: Property) {
  return frameOf(page)
    .locator(`[data-builder-node="${id}"]`).first()
    .evaluate((el, p) => getComputedStyle(el)[p as 'color'], property)
}

const currentPrimary = (page: Page) => page.getByLabel('Primary HEX value').inputValue()

async function switchPage(page: Page, name: string) {
  await page.getByLabel('Canvas page').selectOption({ label: name })
  await expect(page.locator('iframe[title$="website canvas"]')).toBeVisible()
  await page.waitForTimeout(1000)
}

/** Selects a real page section (not the header, menu or footer) from the left list. */
async function selectPageSection(page: Page, index = 0) {
  await page.getByRole('button', { name: 'Pages and layers' }).click()
  const sections = page.locator('.visual-section')
  await expect(sections.first()).toBeVisible()
  const real: number[] = []
  const total = await sections.count()
  for (let i = 0; i < total; i += 1) {
    const kind = await sections.nth(i).locator('small').innerText().catch(() => '')
    if (!/Logo|Links|Copyright|footer|menu/i.test(kind)) real.push(i)
  }
  await sections.nth(real[Math.min(index, real.length - 1)] ?? 0).click()
  await page.getByRole('button', { name: /^Design$/ }).first().click()
}

for (const design of [{ name: 'Agency' }, { name: 'Agriculture' }]) {
  test.describe(`imported design — ${design.name}`, () => {
    test('a palette change repaints every page, including the shared header and footer', async ({ page }) => {
      test.setTimeout(150_000)
      await openImported(page, design.name)
      await openColoursTab(page)

      const detected = await currentPrimary(page)
      const detectedRgb = hexToRgb(detected)
      const before = await elementsDrawing(page, detectedRgb)
      expect(before.length, 'the design draws something in its primary colour').toBeGreaterThan(0)

      await setHex(page, 'Primary', '#7c3aed')
      const next = 'rgb(124, 58, 237)'
      await expect.poll(() => styleOf(page, before[0].id, before[0].property as Property)).toBe(next)
      for (const item of before.slice(0, 12)) expect(await styleOf(page, item.id, item.property as Property)).toBe(next)
      // Nothing was left behind in the old colour.
      expect(await elementsDrawing(page, detectedRgb)).toHaveLength(0)

      // The same on another page of the site.
      const names = await page.getByLabel('Canvas page').locator('option').allTextContents()
      expect(names.length).toBeGreaterThan(1)
      await switchPage(page, names[1])
      await expect.poll(async () => (await elementsDrawing(page, next)).length).toBeGreaterThan(0)
      expect(await elementsDrawing(page, detectedRgb)).toHaveLength(0)

      // Reset returns the design's own colours.
      await page.getByRole('button', { name: /own palette/ }).click()
      await expect.poll(async () => (await elementsDrawing(page, detectedRgb)).length).toBeGreaterThan(0)
    })

    test('a section can wear Style 3 and a photo, be undone, and survive a reload', async ({ page }) => {
      test.setTimeout(180_000)
      await openImported(page, design.name)
      await openColoursTab(page)
      const primaryRgb = hexToRgb(await currentPrimary(page))

      await selectPageSection(page, 1)
      const panel = page.getByTestId('section-colors')
      await expect(panel).toBeVisible()
      await panel.getByRole('radio', { name: /Style 3/ }).click()

      const styled = frameOf(page).locator('[data-pt-s]')
      await expect(styled).toHaveCount(1)
      const band = await styled.evaluate((el) => getComputedStyle(el).backgroundColor)
      expect(band).toBe(primaryRgb)
      const text = await styled.locator('h1,h2,h3,h4,p').first().evaluate((el) => getComputedStyle(el).color)
      expect(await contrastOf(page, text, band)).toBeGreaterThanOrEqual(3)

      // Undo and redo.
      await panel.getByRole('button', { name: 'Undo' }).click()
      await expect(frameOf(page).locator('[data-pt-s]')).toHaveCount(0)
      await panel.getByRole('button', { name: 'Redo' }).click()
      await expect(frameOf(page).locator('[data-pt-s]')).toHaveCount(1)

      // A photo with an overlay.
      await panel.getByRole('radio', { name: /Image/ }).click()
      await panel.getByPlaceholder('https://…').fill(PIXEL)
      await panel.getByLabel('Overlay strength').fill('75')
      await expect
        .poll(() => frameOf(page).locator('[data-pt-s]').evaluate((el) => getComputedStyle(el).backgroundImage))
        .toContain('linear-gradient')

      // A section that follows the primary colour moves when the palette does.
      await panel.getByRole('radio', { name: /Style 3/ }).click()
      await page.getByRole('button', { name: /Colours/ }).first().click()
      await setHex(page, 'Primary', '#0ea5e9')
      await expect
        .poll(() => frameOf(page).locator('[data-pt-s]').evaluate((el) => getComputedStyle(el).backgroundColor))
        .toBe('rgb(14, 165, 233)')

      // Reload: the palette and the section are both still there. The editor
      // re-reads the saved copy, so the save has to have happened first.
      await page.waitForTimeout(4000)
      await reloadEditor(page)
      await expect(page.locator('iframe[title$="website canvas"]')).toBeVisible({ timeout: 20_000 })
      await expect
        .poll(() => frameOf(page).locator('[data-pt-s]').evaluate((el) => getComputedStyle(el).backgroundColor), { timeout: 20_000 })
        .toBe('rgb(14, 165, 233)')
    })

    test('styling the shared header restyles it on every page', async ({ page }) => {
      test.setTimeout(150_000)
      await openImported(page, design.name)
      await openColoursTab(page)

      await page.getByRole('button', { name: 'Pages and layers' }).click()
      const header = page.locator('.visual-section').filter({ has: page.locator('small', { hasText: /Logo/ }) }).first()
      await header.click()
      await page.getByRole('button', { name: /^Design$/ }).first().click()
      await expect(page.getByText(/across your website|Update matching header/).first()).toBeVisible()
      await page.getByTestId('section-colors').getByRole('radio', { name: /Style 3/ }).click()
      await expect(frameOf(page).locator('[data-pt-s]')).toHaveCount(1)
      const band = await frameOf(page).locator('[data-pt-s]').evaluate((el) => getComputedStyle(el).backgroundColor)

      const names = await page.getByLabel('Canvas page').locator('option').allTextContents()
      expect(names.length).toBeGreaterThan(1)
      for (const name of names.slice(1, 3)) {
        await switchPage(page, name)
        await expect(frameOf(page).locator('[data-pt-s]').first()).toBeVisible()
        expect(await frameOf(page).locator('[data-pt-s]').first().evaluate((el) => getComputedStyle(el).backgroundColor)).toBe(band)
      }
    })

    test('the downloaded site looks like the editor', async ({ page }) => {
      test.setTimeout(240_000)
      await openImported(page, design.name)
      await openColoursTab(page)
      const detectedRgb = hexToRgb(await currentPrimary(page))
      const before = await elementsDrawing(page, detectedRgb)
      await setHex(page, 'Primary', '#7c3aed')
      if (before.length) await expect.poll(() => styleOf(page, before[0].id, before[0].property as Property)).toBe('rgb(124, 58, 237)')

      await selectPageSection(page, 1)
      await page.getByTestId('section-colors').getByRole('radio', { name: /Style 3/ }).click()
      await expect(frameOf(page).locator('[data-pt-s]')).toHaveCount(1)
      const expectedBand = await frameOf(page).locator('[data-pt-s]').evaluate((el) => getComputedStyle(el).backgroundColor)

      const downloading = page.waitForEvent('download', { timeout: 120_000 })
      await page.getByRole('button', { name: 'Download site' }).click()
      const download = await downloading
      const folder = await mkdtemp(join(tmpdir(), 'sitebuilder-original-export-'))
      const { default: JSZip } = await import('jszip')
      const zip = await JSZip.loadAsync(await readFile(await download.path()))
      for (const [file, entry] of Object.entries(zip.files)) {
        if (!entry.dir) await writeFile(join(folder, file), Buffer.from(await entry.async('uint8array')))
      }
      const files = await readdir(folder)
      expect(files).toContain('index.html')
      const html = await readFile(join(folder, 'index.html'), 'utf8')
      expect(html).toContain('id="pt-theme"')
      expect(html).toContain('--pt-primary:#7c3aed')
      expect(html).toContain('id="pt-sections"')

      const site = await serveFolder(folder)
      try {
        await page.goto(`${site.url}/index.html`)
        await page.waitForLoadState('load')
        await expect
          .poll(() => page.locator('[data-pt-s]').first().evaluate((el) => getComputedStyle(el).backgroundColor))
          .toBe(expectedBand)
        const stillOld = await page.evaluate(
          (target) =>
            [...document.querySelectorAll('body *')].filter((el) => {
              const s = getComputedStyle(el)
              return s.color === target || s.backgroundColor === target
            }).length,
          detectedRgb,
        )
        // Only meaningful when the design drew that colour somewhere to begin with.
        if (before.length) expect(stillOld, 'the old primary colour is gone from the published page').toBe(0)

        const others = files.filter((f) => f.endsWith('.html') && f !== 'index.html')
        if (others.length) {
          await page.goto(`${site.url}/${others[0]}`)
          const drawsNew = await page.evaluate(() =>
            [...document.querySelectorAll('body *')].some((el) => {
              const s = getComputedStyle(el)
              return s.color === 'rgb(124, 58, 237)' || s.backgroundColor === 'rgb(124, 58, 237)'
            }),
          )
          expect(drawsNew).toBe(true)
        }
      } finally {
        await site.close()
      }
    })
  })
}

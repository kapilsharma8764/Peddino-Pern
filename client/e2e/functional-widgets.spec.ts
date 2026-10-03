import { test, expect, openBlankEditor, reloadEditor } from './fixtures'
import { readFile } from 'node:fs/promises'

test('representative widgets work after insertion, reload and HTML download', async ({ page, context }) => {
  await openBlankEditor(page)
  for (const name of ['Modal', 'Carousel', 'Countdown', 'Counter']) {
    await page.getByRole('button', { name: 'Widgets', exact: true }).first().click()
    await page.getByPlaceholder('Search 200+ widgets...').fill(name)
    await page.getByRole('button', { name, exact: true }).first().click()
  }
  // Reload only once the last edit has been written to the API; reloading sooner re-fetches the older saved copy.
  await page.waitForResponse((r) => r.request().method() === 'PUT' && /\/api\/sites\/[^/]+$/.test(new URL(r.url()).pathname) && r.ok(), { timeout: 30_000 })
  await reloadEditor(page)
  await expect(page.locator('[data-type="modal"]').first()).toBeAttached()
  const downloaded = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export', exact: true }).click()
  const file = await downloaded
  const html = await readFile((await file.path())!, 'utf8')
  const output = await context.newPage()
  await output.route('**/functional-preview', route => route.fulfill({ contentType: 'text/html', body: html }))
  await output.goto('http://127.0.0.1:5299/functional-preview', { waitUntil: 'domcontentloaded' })
  const modal = output.locator('[data-type="modal"]')
  await modal.getByRole('button', { name: 'Open dialog' }).click()
  await expect(modal.getByRole('dialog')).toBeVisible()
  await output.keyboard.press('Escape')
  await expect(modal.getByRole('dialog')).not.toBeVisible()
  await expect(modal.getByRole('button', { name: 'Open dialog' })).toBeFocused()
  const carousel = output.locator('[data-type="carousel"]')
  await carousel.getByRole('button', { name: 'Next slide' }).click()
  await expect(carousel.locator('[data-slide]').nth(1)).toBeVisible()
  await expect(carousel.locator('[data-slide]').nth(0)).not.toBeVisible()
  await expect(output.locator('[data-type="counter"] output')).toHaveText('1,250+')
  await expect(output.locator('[data-type="countdown"] output')).not.toHaveText('Calculatingâ€¦')
})

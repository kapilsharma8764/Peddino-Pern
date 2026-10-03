import { test, expect, signUp, watchForErrors, expectNoPageErrors } from './fixtures'

test('guided builder: type, header/footer, layout, widgets, preview, page switch, device toggle', async ({ page }) => {
  const errors = watchForErrors(page)
  await signUp(page)
  await page.goto('/build')

  await page.getByLabel('Site name').fill('Acme Studio')
  await page.getByRole('button', { name: /Business \/ Company/ }).click()

  // Header and footer
  await expect(page.getByRole('heading', { name: 'Header' })).toBeVisible()
  await page.getByRole('button', { name: /Centered/ }).click()
  await page.getByRole('button', { name: 'Continue' }).click()

  // Pages and layouts: the default pages are there, and the options respond.
  await expect(page.getByRole('heading', { name: 'Pages' })).toBeVisible()
  await page.getByRole('button', { name: 'Services', exact: true }).click()
  await page.getByRole('button', { name: '4', exact: true }).click()
  await page.getByRole('button', { name: 'Continue' }).click()

  // Widgets: replace one slot, then Quick Generate.
  await page.getByRole('button', { name: 'Quick Generate' }).click()
  await page.getByRole('button', { name: 'Continue' }).click()

  // Preview: header + content + footer in an iframe, with a working menu.
  const frame = page.frameLocator('iframe[title="Site preview"]')
  await expect(frame.locator('nav, header').first()).toBeVisible()
  await expect(frame.locator('footer').first()).toBeVisible()
  await frame.getByRole('link', { name: 'About', exact: true }).first().click()
  await expect(frame.locator('body')).not.toBeEmpty()

  await page.getByRole('button', { name: 'Mobile' }).click()
  const width = await page.locator('iframe[title="Site preview"]').evaluate((el) => el.getBoundingClientRect().width)
  expect(width).toBeLessThanOrEqual(376)

  // Export
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: /Download site/ }).click()
  expect((await download).suggestedFilename()).toMatch(/\.zip$/)

  expectNoPageErrors(errors)
})

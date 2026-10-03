import { test, expect, watchForErrors, expectNoPageErrors } from './fixtures'

/**
 * The public pages: every one opens, says who we are, links to the others, and nothing on them is hidden
 * once it has been scrolled to. The contact form really sends a message.
 */
const PAGES: [string, RegExp][] = [
  ['/features', /Everything you need to/],
  ['/how-it-works', /five steps/],
  ['/pricing', /Free to start/],
  ['/about', /We’re Peddino/],
  ['/contact', /hear from you/],
  ['/help', /Quick answers/],
  ['/privacy', /Privacy Policy/],
  ['/terms', /Terms of Service/],
]

test('every public page opens with the brand, a heading, the menu and the footer', async ({ page }) => {
  test.setTimeout(180_000)
  const errors = watchForErrors(page)
  for (const [path, heading] of PAGES) {
    await page.goto(path)
    await expect(page.getByRole('heading', { level: 1 })).toContainText(heading)
    await expect(page).toHaveTitle(/Peddino Site Builder/)
    await expect(page.getByRole('banner').getByLabel('Peddino Site Builder')).toBeVisible()
    await expect(page.getByRole('contentinfo', { name: 'Site footer' }).or(page.locator('footer[aria-label="Site footer"]'))).toBeVisible()
    // Scroll to the bottom slowly so every entrance fires, then nothing may still be hidden.
    await page.locator('[data-mk-page]').evaluate(async (el) => { for (let y = 0; y < el.scrollHeight; y += 300) { el.scrollTo(0, y); await new Promise((r) => setTimeout(r, 90)) } })
    await page.waitForTimeout(500)
    const hidden = await page.evaluate(() => [...document.querySelectorAll('[data-mk-page] .mk-card, [data-mk-page] .mk-step, [data-mk-page] .mk-plan')].filter((el) => getComputedStyle(el).opacity === '0').length)
    expect(hidden, `${path}: content left hidden`).toBe(0)
    expect(await page.evaluate(() => document.querySelector('[data-mk-page]')!.scrollWidth <= innerWidth + 1), `${path}: sideways overflow`).toBe(true)
  }
  expectNoPageErrors(errors)
})

test('the menu and footer reach every page, and the home page still works', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: /Your vision/ })).toBeVisible()
  const nav = page.getByRole('navigation', { name: 'Main navigation' })
  for (const [label, path] of [['Features', '/features'], ['How it works', '/how-it-works'], ['Pricing', '/pricing'], ['About', '/about'], ['Help', '/help']] as const) {
    await nav.getByRole('link', { name: label, exact: true }).click()
    await expect(page).toHaveURL(new RegExp(`${path}$`))
  }
  const footer = page.locator('footer[aria-label="Site footer"]')
  await footer.getByRole('link', { name: 'Privacy Policy' }).click()
  await expect(page).toHaveURL(/\/privacy$/)
  await footer.getByRole('link', { name: 'Terms of Service' }).click()
  await expect(page).toHaveURL(/\/terms$/)
  await page.getByRole('banner').getByRole('link', { name: 'Peddino Site Builder' }).click()
  await expect(page).toHaveURL(/\/$/)
})

test('the contact form checks its fields and then sends the message', async ({ page }) => {
  await page.goto('/contact')
  const form = page.getByRole('form', { name: 'Contact us' })
  await form.getByRole('button', { name: /Send message/ }).click()
  await expect(form.getByText('Please tell us your name.')).toBeVisible()
  await expect(form.getByText('Enter a valid email so we can reply.')).toBeVisible()
  await form.getByLabel('Your name').fill('Asha Rao')
  await form.getByLabel('Email').fill('asha@example.com')
  await form.getByLabel('Message').fill('How do I add a page to my menu?')
  const sent = page.waitForResponse((response) => response.url().endsWith('/api/leads') && response.request().method() === 'POST')
  await form.getByRole('button', { name: /Send message/ }).click()
  expect((await sent).status()).toBe(201)
  await expect(form.getByText(/Your message was received/)).toBeVisible()
})

test('the home-page "Try your idea" section still takes a sentence', async ({ page }) => {
  await page.goto('/')
  await page.locator('.tryx-chip', { hasText: 'School' }).click()
  await expect(page.locator('#business-brief')).toHaveValue(/school website/)
  await page.locator('.tryx-cta').click()
  await expect(page.locator('.tryx-result')).toBeVisible()
})

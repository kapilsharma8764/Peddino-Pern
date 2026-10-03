import { test as base, expect, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'

/**
 * Shared setup for the end-to-end run.
 *
 * Two things every spec wants and neither should repeat: an account to work
 * under, and a guarantee that the page did not quietly throw while the test
 * was busy asserting something else. A builder that logs "Cannot read
 * properties of undefined" on every click can still pass a naive click test.
 */

export interface PageErrors {
  /** Uncaught exceptions and console errors, in the order they happened. */
  messages: string[]
  /** Requests to our own origin that failed or answered 4xx/5xx. */
  brokenRequests: string[]
}

/** Errors the browser raises that say nothing about our code. */
const ignorable = [
  // A download the test itself cancels.
  /net::ERR_ABORTED/,
  // Fonts and photographs come from third parties; an offline CI runner
  // failing to reach them is not a fault in the builder. A console message
  // for one of these sometimes arrives without the URL attached, so a
  // runner with no network at all is also matched generically.
  /fonts\.googleapis\.com/,
  /fonts\.gstatic\.com/,
  /images\.unsplash\.com/,
  /net::ERR_INTERNET_DISCONNECTED/,
  // Playwright's trace recorder puts its own script into every frame to take a snapshot, and
  // Chrome reports the ones it cannot run in a deliberately script-less preview (`sandbox=""`).
  // The message names no script of ours; it disappears with `--trace off`.
  /Blocked script execution in 'about:srcdoc' because the document's frame is sandboxed/,
]

export function watchForErrors(page: Page): PageErrors {
  const record: PageErrors = { messages: [], brokenRequests: [] }

  page.on('pageerror', (error) => {
    record.messages.push(`uncaught: ${error.message}`)
  })

  page.on('console', (message) => {
    if (message.type() !== 'error') return
    const text = message.text()
    if (ignorable.some((pattern) => pattern.test(text))) return
    record.messages.push(`console: ${text}`)
  })

  page.on('requestfailed', (request) => {
    const url = request.url()
    if (ignorable.some((pattern) => pattern.test(url))) return
    if (ignorable.some((pattern) => pattern.test(request.failure()?.errorText ?? ''))) return
    record.brokenRequests.push(`${request.method()} ${url} — ${request.failure()?.errorText}`)
  })

  page.on('response', (response) => {
    const url = response.url()
    if (response.status() < 400) return
    if (ignorable.some((pattern) => pattern.test(url))) return
    // A 401 from /api/auth/me before signing in is how the app asks the
    // question; it is not a broken request.
    if (response.status() === 401 && url.includes('/api/auth/')) return
    record.brokenRequests.push(`${response.status()} ${url}`)
  })

  return record
}

/** Fails the test with the errors listed, rather than a bare count. */
export function expectNoPageErrors(record: PageErrors) {
  expect(record.messages, `uncaught errors:\n${record.messages.join('\n')}`).toEqual([])
  expect(
    record.brokenRequests,
    `broken requests:\n${record.brokenRequests.join('\n')}`,
  ).toEqual([])
}

/** A unique account per test, so specs never contend over one user's sites. */
export function freshAccount() {
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  return { email: `e2e-${stamp}@example.test`, password: 'test-password-123', name: 'E2E Tester' }
}

export async function signUp(page: Page) {
  const account = freshAccount()

  await page.goto('/sign-in')
  await page.getByRole('button', { name: 'Create one' }).click()
  await page.getByLabel('Your name').fill(account.name)
  await page.getByLabel('Email').fill(account.email)
  // Not `exact: true` would also match the "Show/Hide password" toggle
  // button next to the field — its accessible name contains "password" too.
  await page.getByLabel('Password', { exact: true }).fill(account.password)
  // The mode tab above the form reads "Create account" too once selected, so
  // the submit button has to be found within the form, not by name alone.
  await page.locator('form').getByRole('button', { name: 'Create account' }).click()

  // "My workspace" only appears in the header once the token is stored, so it
  // is the readiness signal. (A link like "Start building" is also on the
  // sign-in page and would let the test navigate away mid-request.)
  // The header link can be folded into a menu on a narrow screen, so the stored sign-in is the signal.
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('sitebuilder-auth') ?? '{}').state?.token ?? null)).toBeTruthy()

  return account
}

/**
 * Fills in the four-step form and stops at the "profile is ready" screen,
 * which is where the two ways of starting a site (a chosen design, or a
 * blank layout of this builder's own widgets) part ways.
 *
 * Brand, Story and Details are all optional, so the wizard is cleared with
 * "Skip for now" rather than filled in — a spec testing what comes after has
 * no reason to also exercise the logo uploader.
 */
async function fillWizard(page: Page, businessName: string) {
  await page.goto('/create')

  // Step 1 — business name and category together.
  await page.getByLabel('Website title').fill(businessName)
  await page.getByRole('button', { name: /^Education/ }).click()
  await page.getByRole('button', { name: 'Continue' }).click()

  // Steps 2–3 — Story, Details. The step change is animated (the
  // outgoing step fades out before the next one mounts), so the heading is
  // awaited between clicks rather than firing them back to back — otherwise
  // a click meant for "Story" can land on "Brand" a second time before it
  // has actually left.
  await expect(page.getByRole('heading', { name: 'Story' })).toBeVisible()
  await page.getByRole('button', { name: 'Skip for now' }).click()
  await expect(page.getByRole('heading', { name: 'Details' })).toBeVisible()
  await page.getByRole('button', { name: /^Finish/ }).click()

  // The generating screen is a short, staged animation, not a real wait on
  // the network — it always finishes, so a generous timeout beats a flaky
  // race against it rather than papering over a real hang.
  await expect(page.getByRole('heading', { name: 'Your profile is ready' })).toBeVisible({ timeout: 15_000 })
}

/** Fills in the wizard and stops at the template gallery. */
export async function completeWizard(page: Page, businessName = 'Sharma Coaching') {
  await fillWizard(page, businessName)
  await page.getByRole('button', { name: 'Browse templates' }).click()

  await expect(page.getByRole('heading', { name: 'Find your starting point.' })).toBeVisible()
  return businessName
}

/**
 * Fills in the wizard and builds the other kind of site: a shared
 * header/footer and a home page made of this builder's own drag-and-drop
 * widgets, rather than one of the 146 original designs.
 */
export async function completeWizardBlank(page: Page, businessName = 'Sharma Coaching') {
  await fillWizard(page, businessName)
  await page.getByRole('button', { name: 'Build this layout' }).click()

  await expect(page).toHaveURL(/\/editor/)
  await expect(page.getByRole('region', { name: /Site preview/ })).toBeVisible({ timeout: 15_000 })
  return businessName
}

/** Picks a template by name and waits for the editor to be usable. */
export async function applyTemplate(page: Page, name?: string) {
  const card = name
    ? page.locator('article.group').filter({ hasText: name }).first()
    : page.locator('article.group').first()
  await card.getByRole('button', { name: /Use this/ }).click()

  await expect(page).toHaveURL(/\/editor/)
  // Original templates open in the visual editor — a real HTML page in a
  // sandboxed iframe, not the generic block canvas, so the loaded signal is
  // that iframe rather than a "Site preview" region.
  await expect(page.locator('iframe[title$="website canvas"]')).toBeVisible({ timeout: 15_000 })
}

/** Signs up, fills the form and opens a template in the editor. */
export async function openEditorWithTemplate(page: Page, name?: string) {
  await signUp(page)
  const business = await completeWizard(page)
  await applyTemplate(page, name)
  return business
}

/**
 * Signs up and opens the "build it yourself" editor the way a client does: the
 * wizard's "Build this layout". The site starts with a shared header and footer
 * and one empty page — no ready-made sections.
 */
export async function openCustomEditor(page: Page, businessName?: string) {
  await signUp(page)
  return completeWizardBlank(page, businessName)
}

/**
 * Saves a ready-made four-page starter site to the signed-in account and opens it.
 *
 * Many specs here test things that are independent of how a site was started —
 * undo, the shared header, exporting, selecting and editing a heading — and
 * they need something on the page to act on. "Build it yourself" no longer
 * pours in sample sections, so they are given this starter through the API
 * instead (e2e/starter-site.json, a dump of the app's own starter site).
 */
export async function openBlankEditor(page: Page, businessName = 'Sharma Coaching') {
  await signUp(page)
  const token: string = await page.evaluate(() => JSON.parse(localStorage.getItem('sitebuilder-auth') ?? '{}').state.token)
  const config = JSON.parse(readFileSync(new URL('./starter-site.json', import.meta.url), 'utf8'))
  config.name = businessName
  for (const block of [...(config.header ?? []), ...(config.footer ?? [])]) if (block.props?.logo) block.props.logo = businessName
  const created = await page.request.post('http://127.0.0.1:8123/api/sites', {
    headers: { authorization: `Bearer ${token}` },
    data: { name: businessName, config },
  })
  expect(created.ok(), 'could not save the starter site').toBeTruthy()
  await page.goto('/dashboard')
  await page.getByRole('button', { name: 'Edit' }).first().click()
  await expect(page).toHaveURL(/\/editor/)
  await expect(page.getByRole('region', { name: /Site preview/ })).toBeVisible({ timeout: 15_000 })
  return businessName
}

export const test = base
export { expect }

/**
 * Reloads the browser while the editor is open, then comes back the way a person does.
 * A refresh of /editor opens the SiteBuilder home (see EditorEntry in App.tsx); the saved
 * project is still there, and the Editor link opens it again.
 */
export async function reloadEditor(page: Page) {
  await page.reload()
  await expect(page).not.toHaveURL(/\/editor/)
  await page.getByRole('link', { name: 'My workspace' }).click().catch(() => undefined)
  await page.getByRole('link', { name: 'Editor', exact: true }).first().click()
  await expect(page).toHaveURL(/\/editor/)
}

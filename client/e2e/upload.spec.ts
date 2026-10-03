import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test, expect, signUp, completeWizard, watchForErrors, expectNoPageErrors } from './fixtures'

/**
 * Bringing a website you already have.
 *
 * Driven through the browser because the thing that matters is not the parse â€”
 * that is covered in the unit tests â€” but whether somebody can actually get
 * from "I have a site" to editing it, with their own words on the screen.
 */

const PAGE = `<!doctype html>
<html><head><title>Verma Dental</title></head><body>
  <nav><a href="/">Home</a><a href="fees.html">Fees</a></nav>
  <section>
    <h1>Verma Dental Clinic</h1>
    <p>Gentle dentistry in Pune, open six days a week and late on Thursdays.</p>
    <a class="btn" href="#book">Book a check-up</a>
  </section>
  <section>
    <h2>What we treat</h2>
    <p>Everything from a routine clean to a full crown.</p>
    <div><h3>Check-ups</h3><p>Twenty minutes, including a scale and polish.</p></div>
    <div><h3>Fillings</h3><p>Tooth-coloured, done in one visit.</p></div>
    <div><h3>Crowns</h3><p>Made in our own lab upstairs.</p></div>
    <div><h3>Whitening</h3><p>Two sessions a fortnight apart.</p></div>
  </section>
  <section>
    <h2>Ask us anything</h2>
    <p>We answer the same day.</p>
    <form><input name="email"><button>Send</button></form>
  </section>
</body></html>`

test('a visitor can upload their own website and edit it', async ({ page }) => {
  const errors = watchForErrors(page)

  await signUp(page)
  await completeWizard(page, 'Verma Dental')

  await page.getByRole('button', { name: 'Upload a site' }).click()
  await expect(page.getByRole('heading', { name: 'Use a site you already have' })).toBeVisible()

  await page.getByLabel('Your website file').setInputFiles({
    name: 'my-site.html',
    mimeType: 'text/html',
    buffer: Buffer.from(PAGE),
  })

  // The screen says what it made of the upload, because an import is a guess
  // and only the owner can judge it. Uploads keep the original design exactly
  // as it was, the same way the 146 built-in templates do, rather than being
  // translated into this builder's own widgets — so what is reported is pages
  // read, not sections recognised.
  await expect(page.getByText(/Read \d+ pages? from/)).toBeVisible()
  await expect(page.getByText(/design kept exactly as uploaded/)).toBeVisible()

  await page.getByRole('button', { name: 'Open in the editor' }).click()

  await expect(page).toHaveURL(/\/editor/)
  // The upload opens in the visual editor — a real HTML page in a sandboxed
  // iframe, not the generic block canvas.
  const canvas = page.frameLocator('iframe[title$="website canvas"]')
  await expect(page.locator('iframe[title$="website canvas"]')).toBeVisible()

  // Their own words, on the canvas, exactly as they wrote them.
  await expect(canvas.locator('body')).toContainText('Verma Dental Clinic')
  await expect(canvas.locator('body')).toContainText('Gentle dentistry in Pune')
  await expect(canvas.locator('body')).toContainText('Crowns')

  expectNoPageErrors(errors)
})

test('an uploaded page is editable, not a slab of markup', async ({ page }) => {
  await signUp(page)
  await completeWizard(page, 'Verma Dental')

  await page.getByRole('button', { name: 'Upload a site' }).click()
  await page.getByLabel('Your website file').setInputFiles({
    name: 'my-site.html',
    mimeType: 'text/html',
    buffer: Buffer.from(PAGE),
  })
  await page.getByRole('button', { name: 'Open in the editor' }).click()

  const canvas = page.frameLocator('iframe[title$="website canvas"]')
  const heading = canvas.locator('h1').first()
  await heading.click()

  // Selecting the imported heading opens its settings, which is the whole
  // point of opening the upload in the visual editor rather than pasting it
  // in as a slab of markup nobody can touch.
  await expect(page.getByLabel('Text', { exact: true })).toHaveValue('Verma Dental Clinic')

  await page.getByLabel('Text', { exact: true }).fill('Verma Family Dental')
  await expect(heading).toHaveText('Verma Family Dental')
})

test('it explains itself when the file makes no sense', async ({ page }) => {
  await signUp(page)
  await completeWizard(page, 'Verma Dental')

  await page.getByRole('button', { name: 'Upload a site' }).click()
  await page.getByLabel('Your website file').setInputFiles({
    name: 'notes.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('just some notes'),
  })

  await expect(page.getByText(/Upload a \.html file, a \.zip/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Open in the editor' })).toHaveCount(0)
})

test('picking the whole website folder brings its pictures along', async ({ page }) => {
  const errors = watchForErrors(page)

  // A one-pixel PNG, so the folder holds a real picture rather than a string.
  const pixel = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
    'base64',
  )

  const root = mkdtempSync(join(tmpdir(), 'sitebuilder-upload-'))
  const siteDir = join(root, 'verma-dental')
  mkdirSync(join(siteDir, 'images'), { recursive: true })
  writeFileSync(
    join(siteDir, 'index.html'),
    PAGE.replace('</section>', '<img src="images/tooth.png" alt="A clean tooth"></section>'),
  )
  writeFileSync(join(siteDir, 'images', 'tooth.png'), pixel)

  await signUp(page)
  await completeWizard(page, 'Verma Dental')

  await page.getByRole('button', { name: 'Upload a site' }).click()
  await expect(page.getByRole('heading', { name: 'Use a site you already have' })).toBeVisible()

  await page.getByLabel('Your website folder').setInputFiles(siteDir)

  await expect(page.getByText(/Read \d+ pages? from/)).toBeVisible()
  // No picture should have been reported missing — the whole folder, images
  // included, was picked, not just the lone page.
  await expect(page.getByText(/could not be found/)).toHaveCount(0)
  await page.getByRole('button', { name: 'Open in the editor' }).click()

  await expect(page).toHaveURL(/\/editor/)
  await expect(page.locator('iframe[title$="website canvas"]')).toBeVisible()
  const canvas = page.frameLocator('iframe[title$="website canvas"]')
  await expect(canvas.locator('body')).toContainText('Verma Dental Clinic')
  await expect(canvas.locator('img[alt="A clean tooth"]')).toHaveAttribute('src', /^data:image\/png;base64,/)

  expectNoPageErrors(errors)
})

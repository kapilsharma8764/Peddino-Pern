import { test, expect, openBlankEditor, watchForErrors, expectNoPageErrors } from './fixtures'
import type { Download, Page } from '@playwright/test'
import { createServer, type Server } from 'node:http'
import { readFile, writeFile, mkdtemp, readdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { extname, join } from 'node:path'

/**
 * The exported website, checked as a website.
 *
 * Exporting is the moment the builder stops being involved: the files have to
 * stand on their own, on any static host, with no API behind them. So these
 * tests take what the Export button actually downloads, put it in a folder,
 * serve it from a plain file server that knows nothing about this project, and
 * then browse it the way a visitor would.
 *
 * Reading the export function's return value instead would prove nothing about
 * whether the files work when served.
 */

const types: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
}

/** A file server with no knowledge of the app â€” exactly what a static host is. */
async function serveFolder(folder: string) {
  const server: Server = createServer(async (request, response) => {
    const path = decodeURIComponent((request.url ?? '/').split('?')[0])
    const name = path === '/' ? 'index.html' : path.replace(/^\//, '')
    const file = join(folder, name)

    if (!file.startsWith(folder) || !existsSync(file)) {
      response.writeHead(404, { 'content-type': 'text/plain' })
      response.end('Not found')
      return
    }

    response.writeHead(200, { 'content-type': types[extname(file)] ?? 'application/octet-stream' })
    response.end(await readFile(file))
  })

  await new Promise<void>((done) => server.listen(0, '127.0.0.1', done))
  const port = (server.address() as { port: number }).port
  return {
    url: `http://127.0.0.1:${port}`,
    async close() {
      await new Promise<void>((done) => server.close(() => done()))
    },
  }
}

/**
 * Presses Export and writes every downloaded page into a folder.
 *
 * The editor downloads one file per page, spaced apart because browsers drop
 * downloads that arrive in the same instant. Collecting them by listening for
 * the event â€” rather than waiting a fixed time and hoping â€” is what keeps this
 * from being flaky.
 */
/**
 * How many pages the site open in the editor actually has.
 *
 * Read from the editor rather than assumed: each template brings its own
 * pages, so a test that expects four would quietly stop collecting downloads
 * partway through a design that has six.
 */
async function pageCount(page: Page): Promise<number> {
  await page.getByRole('button', { name: 'Toggle JSON drawer' }).click()
  const text = await page.locator('pre').first().innerText()
  await page.getByRole('button', { name: 'Toggle JSON drawer' }).click()
  const config = JSON.parse(text)
  return (config.pages ?? []).length || 1
}

async function exportSite(page: Page, expected: number) {
  const folder = await mkdtemp(join(tmpdir(), 'sitebuilder-export-'))
  const downloads: Download[] = []

  const collected = new Promise<void>((done) => {
    page.on('download', (download) => {
      downloads.push(download)
      if (downloads.length >= expected) done()
    })
  })

  await page.getByRole('button', { name: 'Export', exact: true }).click()
  await collected

  for (const download of downloads) {
    const name = download.suggestedFilename()
    await writeFile(join(folder, name), await readFile(await download.path()))
  }

  return { folder, files: await readdir(folder) }
}

test.describe('the exported website', () => {
  test('exports every page and serves them as a working site', async ({ page }) => {
    const errors = watchForErrors(page)
    await openBlankEditor(page)

    const { folder, files } = await exportSite(page, await pageCount(page))

    // One file per page, and the home page named so a host serves it by default.
    // One file per page, named after that template's own pages, with the home
    // page named so a static host serves it by default.
    // One file per page, named after that template's own pages, with the home
    // page named so a static host serves it by default.
    expect(files).toContain('index.html')
    expect(files.length).toBeGreaterThanOrEqual(4)
    expectNoPageErrors(errors)

    const site = await serveFolder(folder)
    try {
      const visitorErrors = watchForErrors(page)
      await page.goto(site.url)

      // A real page, with the shared parts around it.
      await expect(page.locator('nav').first()).toBeVisible()
      await expect(page.locator('footer').first()).toBeVisible()
      await expect(page.locator('h1').first()).toBeVisible()
      await expect(page.locator('body')).toContainText('Sharma Coaching')

      // The menu leads somewhere, and that somewhere is a real page.
      const menuLink = page.locator('nav a').filter({ hasText: /\w/ }).nth(1)
      const target = await menuLink.getAttribute('href')
      await menuLink.click()
      // The href is a plain file name, so ending with it is the whole check.
      await expect(page).toHaveURL(new RegExp(target!.replace(/\./g, '\\.') + '$'))
      await expect(page.locator('h1, h2').first()).toBeVisible()
      await expect(page.locator('nav').first()).toBeVisible()

      // And back again, so navigation works in both directions.
      await page.getByRole('link', { name: 'Home', exact: true }).first().click()
      await expect(page).toHaveURL(/index\.html$|\/$/)

      expectNoPageErrors(visitorErrors)
    } finally {
      await site.close()
    }
  })

  test('carries its styling and pictures, not just its words', async ({ page }) => {
    await openBlankEditor(page)
    const { folder } = await exportSite(page, await pageCount(page))

    const site = await serveFolder(folder)
    try {
      await page.goto(site.url)

      // Styled: the page has a background of its own rather than the browser's
      // default white, which is what an export with no CSS looks like.
      const background = await page
        .locator('body')
        .evaluate((node) => getComputedStyle(node).backgroundColor)
      expect(background).not.toBe('rgba(0, 0, 0, 0)')

      // Every picture the page asks for actually arrives.
      const images = page.locator('img')
      const count = await images.count()
      expect(count).toBeGreaterThan(0)
      for (let index = 0; index < count; index++) {
        const complete = await images.nth(index).evaluate(
          (node: HTMLImageElement) => node.complete && node.naturalWidth > 0,
        )
        const src = await images.nth(index).getAttribute('src')
        // A remote photograph may be unreachable on an offline runner; an
        // empty or undefined source is our fault either way.
        expect(src, 'an image with no source').toBeTruthy()
        expect(src).not.toBe('undefined')
        if (src?.startsWith('data:') || src?.startsWith('/')) {
          expect(complete, `local image did not load: ${src}`).toBe(true)
        }
      }
    } finally {
      await site.close()
    }
  })

  test('reads on a phone without spilling sideways', async ({ page }) => {
    await openBlankEditor(page)
    const { folder } = await exportSite(page, await pageCount(page))

    const site = await serveFolder(folder)
    try {
      await page.setViewportSize({ width: 390, height: 844 })
      await page.goto(site.url)

      // Nothing wider than the screen. A page a visitor has to scroll
      // sideways to read is the commonest way an exported site looks broken.
      const overflow = await page.evaluate(() => {
        const width = document.documentElement.clientWidth
        return document.documentElement.scrollWidth - width
      })
      expect(overflow, 'the exported page scrolls sideways on a phone').toBeLessThanOrEqual(1)
    } finally {
      await site.close()
    }
  })

  test('shows the contact form as a form, without submitting anywhere real', async ({ page }) => {
    await openBlankEditor(page)
    const { folder } = await exportSite(page, await pageCount(page))

    const site = await serveFolder(folder)
    try {
      await page.goto(`${site.url}/contact.html`)

      const form = page.locator('form').first()
      if ((await form.count()) === 0) {
        // Not every design carries a form; that is a design choice, not a bug.
        test.skip(true, 'this design has no contact form')
      }

      // The fields a visitor fills in are present and named the way the API
      // expects. Nothing is submitted: this checks the form is a form, not
      // that enquiries reach anybody.
      await expect(form.locator('input[name="name"], input[name="email"]').first()).toBeVisible()
      await expect(form.locator('button[type="submit"], input[type="submit"]').first()).toBeVisible()
    } finally {
      await site.close()
    }
  })
})

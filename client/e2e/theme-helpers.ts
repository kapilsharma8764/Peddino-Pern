import type { Page } from '@playwright/test'
import { createServer, type Server } from 'node:http'
import { readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { extname, join } from 'node:path'

export const canvas = (page: Page) => page.getByRole('region', { name: /Site preview/ })

export const PRIMARY = '#e11d48'
export const PRIMARY_RGB = 'rgb(225, 29, 72)'

export const types: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
}

export async function serveFolder(folder: string) {
  const server: Server = createServer(async (request, response) => {
    const path = decodeURIComponent((request.url ?? '/').split('?')[0])
    const file = join(folder, path === '/' ? 'index.html' : path.replace(/^\//, ''))
    if (!file.startsWith(folder) || !existsSync(file)) {
      response.writeHead(404)
      response.end('Not found')
      return
    }
    response.writeHead(200, { 'content-type': types[extname(file)] ?? 'application/octet-stream' })
    response.end(await readFile(file))
  })
  await new Promise<void>((done) => server.listen(0, '127.0.0.1', done))
  return {
    url: `http://127.0.0.1:${(server.address() as { port: number }).port}`,
    close: () => new Promise<void>((done) => server.close(() => done())),
  }
}

/** A tiny valid PNG, so the photo field has something real to hold. */
export const PIXEL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='

/** The colour a matching element actually draws, as the browser resolved it. */
export async function drawn(page: Page, selector: string, property: 'color' | 'backgroundColor' | 'backgroundImage', nth = 0) {
  return page.locator(selector).nth(nth).evaluate((el, prop) => getComputedStyle(el)[prop as 'color'], property)
}

export function contrastOf(page: Page, a: string, b: string) {
  return page.evaluate(
    ([fg, bg]) => {
      const channels = (css: string) => (css.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number)
      const lum = ([r, g, b]: number[]) => {
        const c = [r, g, b].map((v) => {
          const s = v / 255
          return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
        })
        return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
      }
      const [l1, l2] = [lum(channels(fg)), lum(channels(bg))]
      return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)
    },
    [a, b],
  )
}

export async function setHex(page: Page, label: string, hex: string) {
  const box = page.getByLabel(`${label} HEX value`)
  await box.fill(hex)
  await box.press('Enter')
}

export function hexToRgb(hex: string): string {
  const h = hex.replace('#', '')
  return `rgb(${parseInt(h.slice(0, 2), 16)}, ${parseInt(h.slice(2, 4), 16)}, ${parseInt(h.slice(4, 6), 16)})`
}

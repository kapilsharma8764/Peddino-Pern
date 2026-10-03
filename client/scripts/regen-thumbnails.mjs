// Re-captures gallery thumbnails that were saved half-loaded (preloader, fade-in, lazy images).
// Usage: node scripts/regen-thumbnails.mjs [--all] [--ids=a,b] [--min=0.15] [--conc=4]   (dev server must be on :5200)
// A capture only replaces the old file when it scores better ("busy-ness": 1 - share of the dominant colour).
import { chromium } from 'playwright'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'

const BASE = process.env.BASE ?? 'http://localhost:5200'
const arg = k => process.argv.find(a => a.startsWith(`--${k}=`))?.split('=')[1]
const only = arg('ids')?.split(',')
const minScore = Number(arg('min')) || 0.15   // below this an existing thumbnail is treated as broken
const all = process.argv.includes('--all')
const conc = Number(arg('conc')) || 4
const catalog = JSON.parse(readFileSync('src/templates/library/original-catalog.json', 'utf8'))
const list = (Array.isArray(catalog) ? catalog : catalog.templates).filter(t => !only || only.includes(t.id))
const HIDE = '#preloader,.preloader,#loader,.loader,#loading,.loading,.page-loader,.page-preloader,#status,.loader-wrapper,.loader-container,.preloader-wrapper,#page-loader,.spinner-wrapper,.pre-loader,#pre-loader,.loader-overlay,.preloader-area{display:none!important;opacity:0!important;visibility:hidden!important}.wow,.animated,[data-aos],.aos-init{visibility:visible!important;opacity:1!important;transform:none!important}'

const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1200, height: 800 } })
const scorer = await ctx.newPage()
await scorer.goto('about:blank')
async function score(buf) {
  return scorer.evaluate(async b64 => {
    const img = new Image(); img.src = 'data:image/jpeg;base64,' + b64; await img.decode()
    const c = document.createElement('canvas'); c.width = 120; c.height = 80
    const g = c.getContext('2d'); g.drawImage(img, 0, 0, 120, 80)
    const d = g.getImageData(0, 0, 120, 80).data, bins = new Map()
    for (let i = 0; i < d.length; i += 4) { const k = (d[i] >> 4) << 8 | (d[i + 1] >> 4) << 4 | d[i + 2] >> 4; bins.set(k, (bins.get(k) ?? 0) + 1) }
    return 1 - Math.max(...bins.values()) / (d.length / 4)
  }, buf.toString('base64'))
}

async function capture(url, noHide) {
  const page = await ctx.newPage()
  try {
    await page.goto(BASE + url, { waitUntil: process.env.UNTIL || 'load', timeout: 30000 })
    if (!noHide) await page.addStyleTag({ content: HIDE })
    // Scroll through the page so lazy images and scroll-triggered animations fire, then return to the top.
    await page.evaluate(async () => {
      const h = Math.min(document.documentElement.scrollHeight, 6000)
      for (let y = 0; y < h; y += 500) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 120)) }
      window.scrollTo(0, 0)
    })
    await page.waitForTimeout(Number(process.env.WAIT) || 5000)
    return await page.screenshot({ type: 'jpeg', quality: 82 })
  } finally { await page.close() }
}

let fixed = 0, kept = 0, bad = []
const queue = [...list]
async function worker() {
  for (let t; (t = queue.shift());) {
    const file = `public${t.thumbnail}`
    try {
      const old = existsSync(file) ? await score(readFileSync(file)) : -1
      if (!all && old >= minScore * 3) continue          // clearly fine, leave it
      let best = null, bestScore = -1
      for (const noHide of [false, true]) {              // some pages break when the loader CSS is forced
        const buf = await capture(t.url, noHide), s = await score(buf)
        if (s > bestScore) { best = buf; bestScore = s }
        if (s >= minScore * 3) break
      }
      const oldBytes = existsSync(file) ? readFileSync(file).length : 0
      // Better score, or a clearly more detailed picture (partly-loaded pages still score high but weigh less).
      if (bestScore > old + 0.02 || (bestScore >= old - 0.05 && best.length > oldBytes * 1.15)) { writeFileSync(file, best); fixed++; console.log('fixed', t.id, old.toFixed(2), '->', bestScore.toFixed(2)) }
      else { kept++ }
      if (Math.max(old, bestScore) < minScore) { bad.push(t.id); console.log('STILL BLANK', t.id) }
    } catch (e) { bad.push(t.id); console.log('fail ', t.id, e.message.split('\n')[0]) }
  }
}
await Promise.all(Array.from({ length: conc }, worker))
await browser.close()
console.log({ total: list.length, fixed, kept, stillBad: bad })

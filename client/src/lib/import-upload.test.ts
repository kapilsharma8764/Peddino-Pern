// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import JSZip from 'jszip'
import { importUploadedSite, importUploadedFolder, type PathedFile } from './import-upload'

/**
 * Uploading a website folder.
 *
 * The thing worth checking here is the pictures. A bought template is a folder
 * of HTML beside a folder of images, and if the import loses the link between
 * them the owner opens their own site and finds every photograph missing —
 * which is the difference between this feature working and not.
 */

/** A one-pixel PNG, so the archive holds a real picture rather than a string. */
const PIXEL = Uint8Array.from(
  atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='),
  (c) => c.charCodeAt(0),
)

const PAGE = `<!doctype html><html><head><title>Sharma Coaching</title></head><body>
  <nav><a href="/">Home</a><a href="about.html">About</a></nav>
  <section>
    <h1>Sharma Coaching Classes</h1>
    <p>Maths and science tuition in Jaipur since 2011, in small batches.</p>
    <img src="images/room.png" alt="The classroom">
  </section>
  <section>
    <h2>Our results</h2>
    <p>Ninety-six per cent of our students passed their boards last year.</p>
  </section>
</body></html>`

async function zipFile(files: Record<string, string | Uint8Array>, name = 'site.zip') {
  const zip = new JSZip()
  for (const [path, content] of Object.entries(files)) zip.file(path, content)
  const blob = await zip.generateAsync({ type: 'blob' })
  return new File([blob], name, { type: 'application/zip' })
}

describe('uploading a single page', () => {
  it('opens it as an editable site', async () => {
    const file = new File([PAGE], 'index.html', { type: 'text/html' })
    const { config, report } = await importUploadedSite(file)

    expect(config.name).toBe('Sharma Coaching')
    expect(report.sections).toBeGreaterThan(0)
    expect(JSON.stringify(config)).toContain('Sharma Coaching Classes')
  })

  it('says which pictures it could not bring, rather than showing them broken', async () => {
    const file = new File([PAGE], 'index.html', { type: 'text/html' })
    const { report } = await importUploadedSite(file)

    // A page on its own cannot carry the files that sat beside it.
    expect(report.missingImages).toContain('images/room.png')
  })

  it('refuses a file it cannot read, and says what it wanted', async () => {
    const file = new File(['nonsense'], 'notes.txt', { type: 'text/plain' })
    await expect(importUploadedSite(file)).rejects.toThrow(/\.html|\.zip/)
  })
})

describe('uploading a site folder', () => {
  it('brings the pictures with it', async () => {
    const file = await zipFile({ 'index.html': PAGE, 'images/room.png': PIXEL })
    const { config, report } = await importUploadedSite(file)

    expect(report.missingImages).toEqual([])

    // Carried inside the page's own markup, so it survives saving, publishing
    // and export — none of which can reach back into the file the visitor
    // chose. The page is kept as the original design, not translated into
    // this builder's own widgets.
    expect(config.blocks[0].props.originalTemplate).toBe(true)
    expect(String(config.blocks[0].props.html)).toMatch(/src="data:image\/png;base64,/)
  })

  it('finds the home page inside a folder', async () => {
    const file = await zipFile({
      'my-template/index.html': PAGE,
      'my-template/images/room.png': PIXEL,
      'my-template/about/index.html': '<html><body><p>About us</p></body></html>',
    })
    const { config, sourceFile } = await importUploadedSite(file)

    // The shallowest index.html, not the inner page.
    expect(sourceFile).toBe('my-template/index.html')
    expect(config.name).toBe('Sharma Coaching')
  })

  it('resolves a picture path that climbs out of its folder', async () => {
    const page = PAGE.replace('images/room.png', '../assets/room.png')
    const file = await zipFile({ 'site/index.html': page, 'assets/room.png': PIXEL })
    const { report } = await importUploadedSite(file)

    expect(report.missingImages).toEqual([])
  })

  it('makes a page for every HTML file actually in the archive', async () => {
    const file = await zipFile({
      'index.html': PAGE,
      'images/room.png': PIXEL,
      'about.html': '<html><head><title>About</title></head><body><p>About us</p></body></html>',
    })
    const { config } = await importUploadedSite(file)

    const names = (config.pages ?? []).map((page) => page.name)
    expect(names).toEqual(['Home', 'About'])
  })

  it('names a nested page after its folder rather than "Index"', async () => {
    const file = await zipFile({
      'index.html': PAGE,
      'images/room.png': PIXEL,
      'about/index.html': '<html><body><p>About us</p></body></html>',
    })
    const { config } = await importUploadedSite(file)

    const names = (config.pages ?? []).map((page) => page.name)
    expect(names).toEqual(['Home', 'About'])
  })

  it('refuses a page that still has unrendered template code in it', async () => {
    const templated = '<html><head><title>{% block title %}Spendly{% endblock %}</title></head><body></body></html>'
    const file = await zipFile({ 'index.html': templated })
    await expect(importUploadedSite(file)).rejects.toThrow(/unrendered/i)
  })

  it('says so when the archive has no page in it', async () => {
    const file = await zipFile({ 'images/room.png': PIXEL })
    await expect(importUploadedSite(file)).rejects.toThrow(/no HTML page/i)
  })
})

describe('uploading a folder straight off disk', () => {
  function pathed(path: string, content: BlobPart, type: string): PathedFile {
    return { path, file: new File([content], path.split('/').pop()!, { type }) }
  }

  it('reads a picked folder the same way it reads a zip of it', async () => {
    const files = [
      pathed('my-site/index.html', PAGE, 'text/html'),
      pathed('my-site/images/room.png', PIXEL, 'image/png'),
    ]
    const { config, report, sourceFile } = await importUploadedFolder(files)

    expect(sourceFile).toBe('my-site/index.html')
    expect(report.missingImages).toEqual([])
    expect(String(config.blocks[0].props.html)).toMatch(/src="data:image\/png;base64,/)
  })

  it('says so when the folder has no page in it', async () => {
    const files = [pathed('my-site/images/room.png', PIXEL, 'image/png')]
    await expect(importUploadedFolder(files)).rejects.toThrow(/no HTML page/i)
  })
})

import { gunzipSync } from 'node:zlib'

/**
 * Serves the template files (pages, CSS, fonts, pictures) that live in PostgreSQL
 * at the same URLs they had as static files: `/original-templates/...` and
 * `/templates/...`. `lookup(id)` returns the stored row or null; it is a
 * parameter so this can be tested without a database.
 *
 * Three things keep a template looking exactly as it did from the folder on the
 * developer's Windows disk, where lookups were forgiving and a server's are not:
 *  - a path naming a folder (`.../pages/`) answers with that folder's index.html;
 *  - a path that differs only in letter case (`Img/A.PNG` for `img/a.png`) still
 *    finds the file — Windows never cared, Linux and PostgreSQL do, and old
 *    template HTML is full of such slips;
 *  - the page may be shown inside another site's `<iframe>` (the gallery preview
 *    on the client's own domain), so no `X-Frame-Options` is sent for it.
 */
/** The stored bytes as a Buffer, whether they arrive as a Buffer or as a a driver wrapper. */
function toBuffer(stored) {
  if (Buffer.isBuffer(stored)) return stored
  if (stored instanceof Uint8Array) return Buffer.from(stored.buffer, stored.byteOffset, stored.byteLength)
  // a driver wrapper: `buffer` may be larger than the value; `position` is its true length.
  const bytes = stored.buffer
  const length = typeof stored.position === 'number' ? stored.position : bytes.length
  return Buffer.from(bytes.buffer, bytes.byteOffset, length)
}

async function findRow(lookup, id) {
  const exact = await lookup(id)
  if (exact) return exact
  if (id.endsWith('/')) return (await lookup(`${id}index.html`)) ?? (await lookup(`${id}index.html`, { loose: true }))
  return lookup(id, { loose: true })
}

export function templateAssetHandler(lookup) {
  return async function handler(req, res, next) {
    try {
      let id
      try { id = decodeURIComponent(req.path).replace(/^\/+/, '') } catch { return res.status(400).end() }
      if (!id || id.length > 600 || id.split('/').includes('..')) return res.status(404).end()

      const row = await findRow(lookup, id)
      if (!row) return res.status(404).type('text/plain').send('Not found')

      // Sandboxed template previews have an opaque origin, and fonts need CORS
      // to load at all, so these public files are readable from anywhere.
      res.removeHeader('Access-Control-Allow-Credentials')
      res.removeHeader('X-Frame-Options')
      res.set({
        'Access-Control-Allow-Origin': '*',
        'Cross-Origin-Resource-Policy': 'cross-origin',
        'Cache-Control': 'public, max-age=86400, s-maxage=604800',
        'Content-Type': row.contentType,
        ETag: `"${row.hash}"`,
        Vary: 'Accept-Encoding',
      })
      if (req.headers['if-none-match'] === `"${row.hash}"`) return res.status(304).end()

      let data = toBuffer(row.data)
      if (row.encoding === 'gzip') {
        if (req.acceptsEncodings('gzip')) res.set('Content-Encoding', 'gzip')
        else data = gunzipSync(data)
      }
      res.set('Content-Length', String(data.length))
      return res.end(req.method === 'HEAD' ? undefined : data)
    } catch (error) {
      next(error)
    }
  }
}

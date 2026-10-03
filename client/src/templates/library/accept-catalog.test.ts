import { describe, expect, it } from 'vitest'
import { acceptCatalog } from './accept-catalog'

// The bundled catalog is empty (no original templates ship), so the tests use
// a well-formed sample entry of their own.
const sample = {
  id: 'sample', name: 'Sample', description: 'A sample.', category: 'professional',
  collections: ['website-templates'], sources: ['sample'], height: 1000, fingerprint: 'x',
  url: '/original-templates/sample/index.html',
  thumbnail: '/original-templates/sample/thumbnail.jpg',
  pages: [{ name: 'Home', url: '/original-templates/sample/index.html' }],
}
const catalog = [sample]

describe('acceptCatalog', () => {
  it('accepts the catalog bundled with the app', () => {
    expect(acceptCatalog(catalog)).toHaveLength(catalog.length)
  })

  it('refuses anything that is not a non-empty list', () => {
    expect(acceptCatalog(null)).toBeNull()
    expect(acceptCatalog({})).toBeNull()
    expect(acceptCatalog([])).toBeNull()
  })

  it('refuses a list with one broken entry, so the bundled one stays', () => {
    const broken = [...catalog, { ...catalog[0], url: 'https://elsewhere.example/index.html' }]
    expect(acceptCatalog(broken)).toBeNull()
    expect(acceptCatalog([{ ...catalog[0], pages: [] }])).toBeNull()
    expect(acceptCatalog([{ ...catalog[0], thumbnail: undefined }])).toBeNull()
  })
})

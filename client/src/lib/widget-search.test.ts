import { describe, expect, it } from 'vitest'
import { blockMetadata } from './block-metadata'
import { widgetSchemas } from '@/widgets/schemas'
import { widgetSearchAliases } from './widget-search-aliases'
import { matchesWidgetSearch } from './widget-search'

const search = (query: string) => blockMetadata.filter((meta) => matchesWidgetSearch(meta, query))

describe('dataset names in widget search', () => {
  it.each([
    ['Google Maps', 'map'],
    [' Counter ', 'stats'],
    ['BUSINESS HOURS', 'hours'],
    ['Price Table', 'pricing'],
    ['Contact Form', 'contact'],
    ['Nav Menu', 'navbar'],
    ['Announcement Bar', 'banner'],
    ['Basic Gallery', 'gallery'],
    ['Image Carousel', 'slider'],
    ['EA Static Product', 'products'],
    ['Spacer', 'divider'],
  ])('finds the existing widget for %s', (query, type) => {
    expect(search(query).map((meta) => meta.type)).toContain(type)
  })

  it('preserves the complete existing library and its order with an empty query', () => {
    expect(search('')).toEqual(blockMetadata)
    expect(search('   ')).toEqual(blockMetadata)
  })

  it('keeps existing name, type, category and description searches', () => {
    for (const meta of blockMetadata) {
      for (const query of [meta.label, meta.type, meta.category, meta.description]) {
        expect(search(query)).toContain(meta)
      }
    }
  })

  it.each(['WooCommerce', 'Shortcode', 'EA Advanced Google Map'])('does not offer unsupported source capabilities for %s', (query) => {
    expect(search(query)).toEqual([])
  })

  it.each([
    ['Checkout', 'checkout-form'],
    ['Mega Menu', 'mega-menu'],
  ])('now offers a real %s widget, so this no longer belongs in the unsupported list above', (query, type) => {
    expect(search(query).map((meta) => meta.type)).toContain(type)
  })

  it('offers the container, now that nesting is real', () => {
    // This sat in the list above while a page was a flat stack of sections and
    // there was nothing a container could have meant. There is now a container
    // widget that genuinely holds other widgets, so searching for one should
    // find it rather than come back empty.
    expect(search('Container').map((meta) => meta.type)).toContain('container')
  })

  it('only maps to registered widgets with existing property schemas', () => {
    for (const [type, aliases] of Object.entries(widgetSearchAliases)) {
      expect(blockMetadata.some((meta) => meta.type === type)).toBe(true)
      expect(widgetSchemas).toHaveProperty(type)
      expect(aliases.length).toBeGreaterThan(0)
    }
  })

  it('returns existing metadata unchanged, including defaults and variants', () => {
    const before = JSON.stringify(blockMetadata)
    for (const aliases of Object.values(widgetSearchAliases)) {
      for (const alias of aliases) {
        for (const result of search(alias)) expect(blockMetadata).toContain(result)
      }
    }
    expect(JSON.stringify(blockMetadata)).toBe(before)
  })
})

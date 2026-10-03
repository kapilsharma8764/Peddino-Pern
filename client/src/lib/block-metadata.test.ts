import { describe, it, expect } from 'vitest'
import { blockMetadata } from './block-metadata'

describe('block metadata', () => {
  it('gives every block at least one variant', () => {
    for (const block of blockMetadata) {
      expect(block.variants.length, `${block.type} has no variants`).toBeGreaterThan(0)
    }
  })

  it('gives every block default props, so a freshly added widget is never empty', () => {
    // A widget dropped onto the canvas has to arrive filled in. An empty box is
    // the fastest way to make a builder feel broken to someone non-technical.
    for (const block of blockMetadata) {
      expect(block.defaultProps, `${block.type} has no defaultProps`).toBeDefined()
    }
  })

  it('has no duplicate block types', () => {
    const types = blockMetadata.map((b) => b.type)
    expect(new Set(types).size).toBe(types.length)
  })
})

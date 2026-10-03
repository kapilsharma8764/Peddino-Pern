import type { BlockConfig } from '@/blocks/types'
import { blockMetadata } from './block-metadata'

/**
 * The name a client sees for a block: Header, Footer, Section, Column or the
 * widget's own name. The stored `type` ("navbar", "container") is an
 * implementation word and stays out of the interface.
 *
 * A container directly on the page is a Section; one inside another container
 * is a Column.
 */
export function blockName(block: BlockConfig, nested = false): string {
  if (block.type === 'navbar') return 'Header'
  if (block.type === 'footer') return 'Footer'
  if (block.type === 'container') return nested ? 'Column' : 'Section'
  return blockMetadata.find((meta) => meta.type === block.type)?.label ?? block.type
}

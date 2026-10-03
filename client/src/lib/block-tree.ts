import type { BlockConfig } from '@/blocks/types'
import { newId } from './id'
import { layoutTypes } from '@/widgets/expanded'

/**
 * Sections that hold other sections.
 *
 * Until now a page was a flat list: a stack of finished sections, each one an
 * indivisible band across the page. That is enough to assemble a template and
 * nothing more — it cannot express two columns of text beside a photograph, or
 * a card that is itself a heading, a paragraph and a button.
 *
 * So a block may now carry children, and a page is a tree. Everything here is
 * a pure function over that tree: nothing touches the store, so the rules
 * about what may go where can be read and tested on their own, which matters
 * because a bug in this file corrupts the document rather than the screen.
 *
 * A block is addressed by its id, never by position. Positions shift the
 * moment anything moves; ids do not.
 */

/** Types that may hold children. Everything else is a leaf. */
export const CONTAINER_TYPES = new Set<string>(['container', ...layoutTypes])

export function isContainer(block: BlockConfig): boolean {
  return CONTAINER_TYPES.has(block.type)
}

/** Every block in the tree, parents before their children. */
export function walk(blocks: BlockConfig[]): BlockConfig[] {
  const out: BlockConfig[] = []
  for (const block of blocks) {
    out.push(block)
    if (block.children?.length) out.push(...walk(block.children))
  }
  return out
}

export function findBlock(blocks: BlockConfig[], id: string): BlockConfig | null {
  for (const block of blocks) {
    if (block.id === id) return block
    const found = block.children ? findBlock(block.children, id) : null
    if (found) return found
  }
  return null
}

/** The list a block sits in, and where in it — what a move needs to know. */
export function locate(
  blocks: BlockConfig[],
  id: string,
  parent: BlockConfig | null = null,
): { parent: BlockConfig | null; siblings: BlockConfig[]; index: number } | null {
  const index = blocks.findIndex((block) => block.id === id)
  if (index !== -1) return { parent, siblings: blocks, index }

  for (const block of blocks) {
    if (!block.children) continue
    const found = locate(block.children, id, block)
    if (found) return found
  }
  return null
}

/** The ids from the outermost block down to this one, inclusive. */
export function pathTo(blocks: BlockConfig[], id: string): string[] | null {
  for (const block of blocks) {
    if (block.id === id) return [block.id]
    const below = block.children ? pathTo(block.children, id) : null
    if (below) return [block.id, ...below]
  }
  return null
}

export function isAncestor(blocks: BlockConfig[], ancestorId: string, blockId: string): boolean {
  if (ancestorId === blockId) return false
  const path = pathTo(blocks, blockId)
  return path !== null && path.slice(0, -1).includes(ancestorId)
}

/**
 * Whether a block may be dropped into a container.
 *
 * The rule that matters is the last one: a container cannot be put inside
 * itself or inside anything it contains. Allowing it would detach that whole
 * branch from the document — the blocks would still exist, referring to each
 * other in a loop, and every walk of the tree would never end.
 */
export function canDrop(
  blocks: BlockConfig[],
  dragId: string | null,
  intoId: string | null,
): boolean {
  if (intoId === null) return true // the page itself always accepts a drop

  const target = findBlock(blocks, intoId)
  if (!target || !isContainer(target)) return false

  if (dragId === null) return true // a brand new widget has no ancestry
  if (dragId === intoId) return false
  return !isAncestor(blocks, dragId, intoId)
}

/** Replaces one block, wherever it is, leaving the rest of the tree untouched. */
export function replaceBlock(
  blocks: BlockConfig[],
  id: string,
  change: (block: BlockConfig) => BlockConfig,
): BlockConfig[] {
  return blocks.map((block) => {
    if (block.id === id) return change(block)
    if (!block.children) return block
    return { ...block, children: replaceBlock(block.children, id, change) }
  })
}

export function removeBlock(blocks: BlockConfig[], id: string): BlockConfig[] {
  return blocks
    .filter((block) => block.id !== id)
    .map((block) =>
      block.children ? { ...block, children: removeBlock(block.children, id) } : block,
    )
}

/**
 * Inserts a block, either into a container or into the page itself.
 *
 * An index past the end appends, which is what a drop below the last child
 * means; a negative one is treated as the start.
 */
export function insertBlock(
  blocks: BlockConfig[],
  block: BlockConfig,
  parentId: string | null,
  index?: number,
): BlockConfig[] {
  if (parentId === null) {
    const next = [...blocks]
    next.splice(clamp(index, next.length), 0, block)
    return next
  }

  return blocks.map((entry) => {
    if (entry.id === parentId) {
      const children = [...(entry.children ?? [])]
      children.splice(clamp(index, children.length), 0, block)
      return { ...entry, children }
    }
    if (!entry.children) return entry
    return { ...entry, children: insertBlock(entry.children, block, parentId, index) }
  })
}

function clamp(index: number | undefined, length: number): number {
  if (index === undefined) return length
  return Math.max(0, Math.min(index, length))
}

/**
 * Moves a block to a new parent and position.
 *
 * Taking it out first shifts every later position down by one, so a block
 * dragged further down its own list would land one place short. Correcting
 * for that here keeps the arithmetic out of the drop handler, where it was
 * quietly wrong in every builder that has ever got this wrong.
 */
export function moveBlock(
  blocks: BlockConfig[],
  id: string,
  parentId: string | null,
  index?: number,
): BlockConfig[] {
  if (!canDrop(blocks, id, parentId)) return blocks

  const found = locate(blocks, id)
  if (!found) return blocks

  const sameList =
    (found.parent?.id ?? null) === parentId
  const target =
    sameList && index !== undefined && index > found.index ? index - 1 : index

  return insertBlock(removeBlock(blocks, id), found.siblings[found.index], parentId, target)
}

/**
 * A copy of a block and everything inside it, with fresh ids throughout.
 *
 * Reusing the ids would give the document two blocks answering to the same
 * name, and every operation here addresses blocks by id — selecting one would
 * select both, deleting one would delete both.
 */
export function cloneBlock(block: BlockConfig): BlockConfig {
  return {
    ...structuredClone(block),
    id: newId(`block-${block.type}`),
    children: block.children?.map(cloneBlock),
  }
}

/** Puts a copy of a block directly after the original, in the same list. */
export function duplicateBlock(blocks: BlockConfig[], id: string): BlockConfig[] {
  const found = locate(blocks, id)
  if (!found) return blocks
  return insertBlock(
    blocks,
    cloneBlock(found.siblings[found.index]),
    found.parent?.id ?? null,
    found.index + 1,
  )
}

/** A fresh, empty container — what dropping the Container widget creates. */
export function newContainer(children: BlockConfig[] = []): BlockConfig {
  return {
    id: newId('block-container'),
    type: 'container',
    variant: 'flex',
    props: { direction: 'row', gap: 24, align: 'stretch', justify: 'start', columns: 2, wrap: true },
    children,
  }
}

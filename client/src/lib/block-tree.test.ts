import { describe, it, expect } from 'vitest'
import type { BlockConfig } from '@/blocks/types'
import {
  canDrop,
  cloneBlock,
  duplicateBlock,
  findBlock,
  insertBlock,
  isAncestor,
  locate,
  moveBlock,
  newContainer,
  pathTo,
  removeBlock,
  replaceBlock,
  walk,
} from './block-tree'

/**
 * The rules a nested page has to obey.
 *
 * These are written against the shapes a real page makes — a container holding
 * a container holding a heading — because the faults worth catching are the
 * ones that only appear once something is two levels deep.
 */

function leaf(id: string, type = 'heading'): BlockConfig {
  return { id, type: type as BlockConfig['type'], variant: 'default', props: { text: id } }
}

function box(id: string, children: BlockConfig[]): BlockConfig {
  return { id, type: 'container', variant: 'flex', props: {}, children }
}

/**
 *   outer
 *     ├── inner
 *     │     ├── a
 *     │     └── b
 *     └── c
 *   loose
 */
function tree(): BlockConfig[] {
  return [box('outer', [box('inner', [leaf('a'), leaf('b')]), leaf('c')]), leaf('loose')]
}

describe('walking a nested page', () => {
  it('visits every block, parents before children', () => {
    expect(walk(tree()).map((block) => block.id)).toEqual([
      'outer',
      'inner',
      'a',
      'b',
      'c',
      'loose',
    ])
  })

  it('finds a block however deep it sits', () => {
    expect(findBlock(tree(), 'b')?.id).toBe('b')
    expect(findBlock(tree(), 'nothing')).toBeNull()
  })

  it('reports the list a block sits in and where', () => {
    const found = locate(tree(), 'b')
    expect(found?.parent?.id).toBe('inner')
    expect(found?.index).toBe(1)

    const top = locate(tree(), 'loose')
    expect(top?.parent).toBeNull()
    expect(top?.index).toBe(1)
  })

  it('reads the path from the page down to a block', () => {
    expect(pathTo(tree(), 'b')).toEqual(['outer', 'inner', 'b'])
    expect(pathTo(tree(), 'outer')).toEqual(['outer'])
  })

  it('knows which blocks contain which', () => {
    expect(isAncestor(tree(), 'outer', 'b')).toBe(true)
    expect(isAncestor(tree(), 'inner', 'c')).toBe(false)
    // Nothing contains itself; treating it as if it did would let a container
    // be dropped into itself.
    expect(isAncestor(tree(), 'outer', 'outer')).toBe(false)
  })
})

describe('what may be dropped where', () => {
  it('lets the page itself take anything', () => {
    expect(canDrop(tree(), 'b', null)).toBe(true)
    expect(canDrop(tree(), null, null)).toBe(true)
  })

  it('refuses a leaf as a drop target', () => {
    // Dropping onto a heading would silently do nothing, or worse, give the
    // heading children the renderer never draws.
    expect(canDrop(tree(), 'loose', 'a')).toBe(false)
  })

  it('refuses to put a container inside itself', () => {
    expect(canDrop(tree(), 'outer', 'outer')).toBe(false)
  })

  it('refuses to put a container inside its own child', () => {
    // The fault that detaches a whole branch from the document and makes
    // every walk of the tree run for ever.
    expect(canDrop(tree(), 'outer', 'inner')).toBe(false)
  })

  it('allows a child to move up into a container above it', () => {
    expect(canDrop(tree(), 'inner', null)).toBe(true)
    expect(canDrop(tree(), 'loose', 'inner')).toBe(true)
  })
})

describe('changing a nested page', () => {
  it('replaces a block deep in the tree and leaves the rest alone', () => {
    const next = replaceBlock(tree(), 'b', (block) => ({ ...block, props: { text: 'changed' } }))
    expect(findBlock(next, 'b')?.props.text).toBe('changed')
    expect(findBlock(next, 'a')?.props.text).toBe('a')
    expect(walk(next).length).toBe(walk(tree()).length)
  })

  it('removes a block from wherever it sits', () => {
    const next = removeBlock(tree(), 'a')
    expect(findBlock(next, 'a')).toBeNull()
    expect(findBlock(next, 'b')?.id).toBe('b')
  })

  it('removes a container together with everything in it', () => {
    const next = removeBlock(tree(), 'inner')
    expect(findBlock(next, 'inner')).toBeNull()
    expect(findBlock(next, 'a')).toBeNull()
    expect(findBlock(next, 'c')?.id).toBe('c')
  })

  it('inserts into a container at a position', () => {
    const next = insertBlock(tree(), leaf('new'), 'inner', 1)
    expect(findBlock(next, 'inner')?.children?.map((c) => c.id)).toEqual(['a', 'new', 'b'])
  })

  it('appends when no position is given, and clamps one past the end', () => {
    expect(insertBlock(tree(), leaf('x'), 'inner')?.[0].children?.[0].children?.map((c) => c.id))
      .toEqual(['a', 'b', 'x'])
    expect(
      insertBlock(tree(), leaf('x'), 'inner', 99)[0].children?.[0].children?.map((c) => c.id),
    ).toEqual(['a', 'b', 'x'])
  })

  it('inserts into the page when no parent is named', () => {
    const next = insertBlock(tree(), leaf('x'), null, 0)
    expect(next.map((block) => block.id)).toEqual(['x', 'outer', 'loose'])
  })
})

describe('moving a block', () => {
  it('moves it out of a container and onto the page', () => {
    const next = moveBlock(tree(), 'a', null, 0)
    expect(next.map((block) => block.id)).toEqual(['a', 'outer', 'loose'])
    expect(findBlock(next, 'inner')?.children?.map((c) => c.id)).toEqual(['b'])
  })

  it('moves it from the page into a container', () => {
    const next = moveBlock(tree(), 'loose', 'inner', 0)
    expect(next.map((block) => block.id)).toEqual(['outer'])
    expect(findBlock(next, 'inner')?.children?.map((c) => c.id)).toEqual(['loose', 'a', 'b'])
  })

  it('lands where the gap was when dragged further down its own list', () => {
    // Taking the block out first shifts the later gaps down by one. Without
    // correcting for it, "move a after b" leaves a exactly where it started.
    const next = moveBlock(tree(), 'a', 'inner', 2)
    expect(findBlock(next, 'inner')?.children?.map((c) => c.id)).toEqual(['b', 'a'])
  })

  it('lands where the gap was when dragged up its own list', () => {
    const next = moveBlock(tree(), 'b', 'inner', 0)
    expect(findBlock(next, 'inner')?.children?.map((c) => c.id)).toEqual(['b', 'a'])
  })

  it('refuses a move that would detach a branch, leaving the page as it was', () => {
    const before = tree()
    const after = moveBlock(before, 'outer', 'inner', 0)
    expect(after).toEqual(before)
    expect(walk(after).length).toBe(6)
  })

  it('never loses or repeats a block', () => {
    const next = moveBlock(tree(), 'a', null, 1)
    const ids = walk(next).map((block) => block.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids.length).toBe(6)
  })
})

describe('copying a block', () => {
  it('gives the copy and everything in it fresh ids', () => {
    const copy = cloneBlock(findBlock(tree(), 'outer')!)
    const ids = walk([copy]).map((block) => block.id)
    for (const id of ids) expect(['outer', 'inner', 'a', 'b', 'c']).not.toContain(id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('keeps the copy the same shape as the original', () => {
    const copy = cloneBlock(findBlock(tree(), 'outer')!)
    expect(copy.children?.[0].children?.length).toBe(2)
    expect(copy.type).toBe('container')
  })

  it('puts a duplicate directly after the original', () => {
    const next = duplicateBlock(tree(), 'a')
    const children = findBlock(next, 'inner')!.children!
    expect(children.length).toBe(3)
    expect(children[0].id).toBe('a')
    expect(children[1].id).not.toBe('a')
    expect(children[1].props.text).toBe('a')
    expect(children[2].id).toBe('b')
  })

  it('duplicates a whole container in place', () => {
    const next = duplicateBlock(tree(), 'inner')
    const children = findBlock(next, 'outer')!.children!
    expect(children.map((block) => block.type)).toEqual(['container', 'container', 'heading'])
    expect(walk(next).length).toBe(9)
  })
})

describe('a new container', () => {
  it('arrives empty, ready to be dropped into', () => {
    const container = newContainer()
    expect(container.type).toBe('container')
    expect(container.children).toEqual([])
    expect(canDrop([container], null, container.id)).toBe(true)
  })

  it('can be created around blocks that already exist', () => {
    const container = newContainer([leaf('a'), leaf('b')])
    expect(container.children?.map((block) => block.id)).toEqual(['a', 'b'])
  })
})

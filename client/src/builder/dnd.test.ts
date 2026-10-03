import { describe, it, expect } from 'vitest'
import { isDragPayload, isDropTarget, resolveMoveIndex } from './dnd'

describe('resolveMoveIndex', () => {
  it('accounts for the section leaving its old place', () => {
    // Dragging section 0 into the gap after section 2 should land it at index
    // 1 in the shortened list — without this it would stop one place short.
    expect(resolveMoveIndex(0, 2)).toBe(1)
    expect(resolveMoveIndex(1, 4)).toBe(3)
  })

  it('leaves an upward move alone', () => {
    expect(resolveMoveIndex(3, 1)).toBe(1)
    expect(resolveMoveIndex(2, 0)).toBe(0)
  })

  it('treats the gap just below as no move at all', () => {
    expect(resolveMoveIndex(2, 3)).toBe(2)
    expect(resolveMoveIndex(2, 2)).toBe(2)
  })
})

describe('drag payload guards', () => {
  it('recognises the two things that get dragged', () => {
    expect(isDragPayload({ kind: 'new', type: 'hero' })).toBe(true)
    expect(isDragPayload({ kind: 'move', id: 'a', region: 'page', index: 0 })).toBe(true)
  })

  it('rejects anything else, including nothing', () => {
    expect(isDragPayload(undefined)).toBe(false)
    expect(isDragPayload({})).toBe(false)
    expect(isDragPayload({ kind: 'gap' })).toBe(false)
  })

  it('recognises a drop target', () => {
    expect(isDropTarget({ kind: 'gap', region: 'page', index: 2 })).toBe(true)
    expect(isDropTarget({ kind: 'new' })).toBe(false)
    expect(isDropTarget(null)).toBe(false)
  })
})

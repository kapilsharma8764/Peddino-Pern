import { describe, it, expect } from 'vitest'
import { readPath, writePath } from './inline-edit'

const props = {
  headline: 'Coaching that gets results',
  items: [
    { title: 'Board exams', description: 'Classes 9 to 12' },
    { title: 'Competitive', description: 'Entrance prep' },
  ],
}

describe('readPath', () => {
  it('reads a plain property and one inside a list', () => {
    expect(readPath(props, 'headline')).toBe('Coaching that gets results')
    expect(readPath(props, 'items.1.title')).toBe('Competitive')
  })

  it('returns nothing for a path that is not there, rather than throwing', () => {
    expect(readPath(props, 'nope')).toBeUndefined()
    expect(readPath(props, 'items.9.title')).toBeUndefined()
    expect(readPath(props, 'headline.deeper')).toBeUndefined()
  })
})

describe('writePath', () => {
  it('sets a plain property', () => {
    expect(writePath(props, 'headline', 'New heading').headline).toBe('New heading')
  })

  it('sets one inside a list without disturbing its neighbours', () => {
    const next = writePath(props, 'items.0.title', 'Changed')
    const items = next.items as { title: string; description: string }[]
    expect(items[0].title).toBe('Changed')
    expect(items[0].description).toBe('Classes 9 to 12')
    expect(items[1].title).toBe('Competitive')
  })

  it('never writes into the object it was given', () => {
    // The store hands out the object it holds; mutating it would change the
    // site with nothing re-rendering and nothing on the undo stack.
    const before = JSON.stringify(props)
    writePath(props, 'items.0.title', 'Changed')
    writePath(props, 'headline', 'Changed')
    expect(JSON.stringify(props)).toBe(before)
  })

  it('creates the path when it does not exist yet', () => {
    const next = writePath({}, 'meta.caption', 'Hello')
    expect((next.meta as { caption: string }).caption).toBe('Hello')
  })
})

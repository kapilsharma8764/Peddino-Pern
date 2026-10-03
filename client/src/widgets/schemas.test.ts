import { describe, it, expect } from 'vitest'
import { blockMetadata } from '@/lib/block-metadata'
import { widgetSchemas } from './schemas'
import type { Field } from './field-types'

function fieldsOf(type: keyof typeof widgetSchemas): [string, Field][] {
  return widgetSchemas[type].groups.flatMap((group) => Object.entries(group.fields))
}

describe('widget schemas', () => {
  it('covers every widget in the library', () => {
    for (const block of blockMetadata) {
      expect(widgetSchemas[block.type], `${block.type} has no schema`).toBeDefined()
    }
  })

  it('offers exactly the variants the widget actually has', () => {
    // A dropdown listing a variant the component cannot render sends the user
    // to a broken layout; one missing a variant hides a layout they paid for.
    for (const block of blockMetadata) {
      const variantField = fieldsOf(block.type).find(([key]) => key === 'variant')?.[1]
      if (!variantField) {
        expect(block.variants.length, `${block.type} has variants but no variant control`).toBe(1)
        continue
      }
      expect(variantField.kind).toBe('select')
      if (variantField.kind !== 'select') return
      const offered = variantField.options.map((option) => option.value)
      expect(offered.sort()).toEqual([...block.variants].sort())
    }
  })

  it('labels every field in plain language', () => {
    for (const block of blockMetadata) {
      for (const [key, field] of fieldsOf(block.type)) {
        expect(field.label, `${block.type}.${key} has no label`).toBeTruthy()
        // Labels are read by someone who has never seen the prop names.
        expect(field.label, `${block.type}.${key} is labelled with its key`).not.toBe(key)
      }
    }
  })

  it('gives every dropdown at least two choices', () => {
    for (const block of blockMetadata) {
      for (const [key, field] of fieldsOf(block.type)) {
        if (field.kind !== 'select') continue
        expect(field.options.length, `${block.type}.${key} has one option`).toBeGreaterThan(1)
      }
    }
  })

  it('names every repeater entry field', () => {
    for (const block of blockMetadata) {
      for (const [key, field] of fieldsOf(block.type)) {
        if (field.kind !== 'repeater') continue
        const subFields = Object.entries(field.fields)
        expect(subFields.length, `${block.type}.${key} repeats nothing`).toBeGreaterThan(0)
        for (const [subKey, sub] of subFields) {
          expect(sub.label, `${block.type}.${key}.${subKey} has no label`).toBeTruthy()
        }
        if (field.titleKey) {
          expect(
            Object.keys(field.fields),
            `${block.type}.${key} titles rows by a field it does not have`,
          ).toContain(field.titleKey)
        }
      }
    }
  })

  it('starts each widget with a Content group where one exists', () => {
    // The first group is the one open when the panel appears, so it has to be
    // the words on the page — not styling.
    for (const block of blockMetadata) {
      const [first] = widgetSchemas[block.type].groups
      expect(first, `${block.type} has no groups`).toBeDefined()
      const titles = widgetSchemas[block.type].groups.map((group) => group.title)
      if (titles.includes('Content')) {
        expect(first.title, `${block.type} opens on ${first.title}`).toBe('Content')
      }
    }
  })
})

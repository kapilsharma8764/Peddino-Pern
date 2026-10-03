/**
 * Editing text by typing on the page itself.
 *
 * Widgets mark their text with `data-edit="headline"`, or
 * `data-edit="items.0.title"` for something inside a repeater. Double-clicking
 * such an element makes it editable, and what is typed is written back to that
 * property.
 *
 * The alternative — hunting for the right box in the side panel every time you
 * want to change a word — is the difference between a builder that feels
 * direct and one that feels like filling in a form.
 */

/** Reads the value at a path like `items.0.title`. */
export function readPath(props: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((value, key) => {
    if (value === null || value === undefined) return undefined
    if (Array.isArray(value)) return value[Number(key)]
    if (typeof value === 'object') return (value as Record<string, unknown>)[key]
    return undefined
  }, props)
}

/**
 * Returns a copy of `props` with `path` set to `value`.
 *
 * Copies at each level rather than writing in place, because the store hands
 * out the object it is holding and mutating it would change the site without
 * anything noticing — no re-render, and nothing on the undo stack.
 */
export function writePath(
  props: Record<string, unknown>,
  path: string,
  value: unknown,
): Record<string, unknown> {
  const keys = path.split('.')

  const set = (target: unknown, index: number): unknown => {
    const key = keys[index]
    const last = index === keys.length - 1

    if (Array.isArray(target)) {
      const copy = [...target]
      copy[Number(key)] = last ? value : set(copy[Number(key)] ?? {}, index + 1)
      return copy
    }

    const source = target && typeof target === 'object' ? (target as Record<string, unknown>) : {}
    return { ...source, [key]: last ? value : set(source[key] ?? {}, index + 1) }
  }

  return set(props, 0) as Record<string, unknown>
}

/** The nearest element carrying a `data-edit` path, if any. */
export function editableTarget(from: EventTarget | null): HTMLElement | null {
  if (!(from instanceof Element)) return null
  return from.closest<HTMLElement>('[data-edit]')
}

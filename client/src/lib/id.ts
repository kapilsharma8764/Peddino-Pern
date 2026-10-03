let counter = 0

/**
 * Generates a unique id for a block, page or project.
 *
 * Timestamps alone are not enough here: adding two blocks in the same
 * millisecond — which happens when a template is applied, or when the user
 * clicks quickly — would hand both the same id, and the editor keys everything
 * off ids. The counter guarantees uniqueness within a session, and the random
 * suffix keeps ids from colliding across sessions when configs are merged.
 */
export function newId(prefix: string): string {
  counter += 1
  const random = Math.random().toString(36).slice(2, 8)
  return `${prefix}-${Date.now().toString(36)}-${counter}${random}`
}

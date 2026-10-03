/**
 * Web addresses for published sites.
 *
 * The slug is what the business hands to a customer, so it should read like
 * their name — "sharma-coaching-classes" — and it has to stay unique across
 * every published site on the server.
 */

const RESERVED = new Set(['api', 'site', 'admin', 'assets', 'static', 'health', 'www'])

export function slugify(name) {
  const slug = String(name ?? '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
  return slug || 'site'
}

/**
 * Makes the slug unique by adding a counter, skipping the site keeping its own
 * slug so republishing does not walk it to "name-2", "name-3" and so on.
 */
export function uniqueSlug(name, taken, ownId = null) {
  const base = RESERVED.has(slugify(name)) ? `${slugify(name)}-site` : slugify(name)
  const used = new Set(
    taken.filter((row) => row.id !== ownId).map((row) => row.slug).filter(Boolean),
  )

  if (!used.has(base)) return base
  let counter = 2
  while (used.has(`${base}-${counter}`)) counter += 1
  return `${base}-${counter}`
}

/** Resolve generated root-relative page links once the public site slug is known. */
export function publishedPageLinks(pages, slug) {
  const base = `/site/${slug}`
  const paths = new Map(pages.map((page) => [`/${page.slug}`, page.slug ? `${base}/${page.slug}` : base]))
  paths.set('/', base)
  return pages.map((page) => ({
    ...page,
    html: page.html.replace(/href=(["'])(\/[^"']*)\1/g, (attribute, quote, href) => {
      const [path] = href.split(/[?#]/)
      const target = paths.get(path)
      return target ? `href=${quote}${target}${href.slice(path.length)}${quote}` : attribute
    }),
  }))
}

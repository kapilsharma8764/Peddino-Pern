/** The company and product name, in one place so every page, title and footer says the same thing. */
export const BRAND = {
  name: 'Peddino Site Builder',
  short: 'Peddino',
  tag: 'SITE BUILDER',
  tagline: 'Build a website you are proud of, without code.',
  year: new Date().getFullYear(),
}

/** The public (marketing) pages, in the order the menu and footer list them. */
export const marketingPages = [
  { to: '/features', label: 'Features' },
  { to: '/how-it-works', label: 'How it works' },
  { to: '/pricing', label: 'Pricing' },
  { to: '/about', label: 'About' },
  { to: '/help', label: 'Help' },
  { to: '/contact', label: 'Contact' },
] as const

export const legalPages = [
  { to: '/privacy', label: 'Privacy Policy' },
  { to: '/terms', label: 'Terms of Service' },
] as const

/** Paths drawn with the public header and footer rather than the workspace chrome. */
export const marketingPaths: string[] = ['/', '/sign-in', ...marketingPages.map((page) => page.to), ...legalPages.map((page) => page.to)]

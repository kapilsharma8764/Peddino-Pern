import type { PageColors } from '@/blocks/types'

/**
 * Colours for one page only.
 *
 * Widgets draw from the theme's CSS variables, so a page's colours are simply
 * those variables set again on the element wrapping the page's own sections:
 * everything inside follows, and the shared header, footer and every other page
 * — outside the wrapper — keep the site theme. No widget needs to know a page
 * override exists.
 */
export function pageColorVars(colors: PageColors | undefined): Record<string, string> {
  const vars: Record<string, string> = {}
  if (!colors) return vars
  if (colors.background) {
    vars['--color-bg-1'] = colors.background
    vars['background-color'] = colors.background
  }
  const heading = colors.heading ?? colors.text
  if (heading) vars['--color-text-0'] = heading
  if (colors.text) {
    vars['--color-text-1'] = colors.text
    vars.color = colors.text
  }
  return vars
}

export function hasPageColors(colors: PageColors | undefined): boolean {
  return Object.keys(pageColorVars(colors)).length > 0
}

/** The `style` attribute text for the wrapper, for the exported page. */
export function pageColorStyleText(colors: PageColors | undefined): string {
  return Object.entries(pageColorVars(colors)).map(([name, value]) => `${name}:${value}`).join(';')
}

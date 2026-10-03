import type { ThemeConfig } from '@/blocks/types'
import { sectionColorCss } from './section-colors'

export const REGION_TOKENS = [
  ['headerBackground', 'Header background'], ['headerText', 'Header text'], ['headerLink', 'Header link'], ['headerButton', 'Header button'],
  ['footerBackground', 'Footer background'], ['footerText', 'Footer text'], ['footerLink', 'Footer link'],
] as const

/** Region defaults are inherited; a block's own overrides remain nearest. */
export function regionColorVars(theme: Partial<ThemeConfig> | undefined, region: 'header' | 'footer') {
  const background = theme?.[`${region}Background`]
  const text = theme?.[`${region}Text`]
  const link = theme?.[`${region}Link`]
  const button = region === 'header' ? theme?.headerButton : undefined
  if (!background && !text && !link && !button) return {}
  return sectionColorCss(theme, { overrides: {
    ...(background ? { background, surface: background } : {}),
    ...(text ? { text, heading: text, muted: text, link: text } : {}),
    ...(link ? { link } : {}),
    ...(button ? { button } : {}),
  } })?.style ?? {}
}

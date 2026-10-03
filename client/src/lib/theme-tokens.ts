import type { ThemeConfig } from '@/blocks/types'
import { luminance, mix, normalizeHex } from './color'
import { resolveTheme, semanticColors } from './theme-presets'

/**
 * The palette as a person thinks of it — Primary, Background, Text, Button —
 * mapped onto the theme's finer-grained colour fields.
 *
 * One friendly colour often stands for several of the theme's own: Background
 * is two grounds, Text has a body-copy shade beneath it. So when one is
 * changed, the shades hanging off it follow, but only while they are still
 * "linked" — still the template's original or still the automatic blend. A
 * shade someone set by hand is theirs and stays put.
 */

export type ThemeTokenId =
  | 'primary'
  | 'secondary'
  | 'accent'
  | 'background'
  | 'surface'
  | 'text'
  | 'muted'
  | 'border'
  | 'buttonBg'
  | 'buttonText'

export interface ThemeToken {
  id: ThemeTokenId
  label: string
  /** Shown as a tooltip: where the colour appears. */
  hint: string
  /** Fields this token owns, for reset and for "differs from the template". */
  keys: (keyof ThemeConfig)[]
  read: (theme: ThemeConfig) => string
}

export const THEME_TOKENS: ThemeToken[] = [
  { id: 'primary', label: 'Primary', hint: 'Brand colour: links, icons, highlights and tinted badges', keys: ['accent', 'accentDim'], read: (t) => t.accent },
  { id: 'secondary', label: 'Secondary', hint: 'Darker brand shade, used when buttons and links are hovered', keys: ['accentDim'], read: (t) => t.accentDim },
  { id: 'accent', label: 'Accent', hint: 'Focus outlines and highlighted text selection', keys: ['highlight'], read: (t) => semanticColors(t).highlight },
  { id: 'background', label: 'Background', hint: 'The page behind everything', keys: ['bg0', 'bg1'], read: (t) => t.bg1 },
  { id: 'surface', label: 'Surface', hint: 'Cards, panels and form fields', keys: ['bg2', 'bg3'], read: (t) => t.bg2 },
  { id: 'text', label: 'Text', hint: 'Headings and body copy', keys: ['text0', 'text1'], read: (t) => t.text0 },
  { id: 'muted', label: 'Muted text', hint: 'Captions, labels and secondary copy', keys: ['text2', 'text3'], read: (t) => t.text2 },
  { id: 'border', label: 'Border', hint: 'Lines, dividers and outlines', keys: ['borderDefault', 'borderSubtle', 'borderHover'], read: (t) => t.borderDefault },
  { id: 'buttonBg', label: 'Button', hint: 'Fill of buttons', keys: ['buttonBg'], read: (t) => semanticColors(t).button },
  { id: 'buttonText', label: 'Button text', hint: 'Label on buttons', keys: ['buttonText'], read: (t) => semanticColors(t).buttonText },
]

type Fields = Partial<ThemeConfig>

const dim = (t: ThemeConfig) => mix(t.accent, '#000000', 0.18)
const bodyText = (t: ThemeConfig) => mix(t.text0, t.bg1, 0.2)
const dimmedText = (t: ThemeConfig) => mix(t.text2, t.bg1, 0.35)
const hoverSurface = (t: ThemeConfig) => mix(t.bg2, t.text0, 0.06)
const subtleBorder = (t: ThemeConfig) => mix(t.borderDefault, t.bg1, 0.5)
const hoverBorder = (t: ThemeConfig) => mix(t.borderDefault, t.text0, 0.15)

/** True while a dependent shade has not been touched by hand. */
function linked(
  theme: ThemeConfig,
  defaults: ThemeConfig,
  dependent: keyof ThemeConfig,
  sources: (keyof ThemeConfig)[],
  auto: (t: ThemeConfig) => string,
): boolean {
  const pristine = theme[dependent] === defaults[dependent] && sources.every((key) => theme[key] === defaults[key])
  return pristine || theme[dependent] === auto(theme)
}

/**
 * The theme fields to write when one token changes.
 *
 * Returns only what changed, ready for `updateTheme`.
 */
export function themeTokenChange(
  themeInput: Partial<ThemeConfig> | undefined,
  defaultsInput: Partial<ThemeConfig> | undefined,
  id: ThemeTokenId,
  value: string,
): Fields {
  const hex = normalizeHex(value)
  if (!hex) return {}
  const theme = resolveTheme(themeInput)
  const defaults = resolveTheme(defaultsInput ?? themeInput)
  const next: ThemeConfig = { ...theme }
  const out: Fields = {}
  const set = <K extends keyof ThemeConfig>(key: K, v: ThemeConfig[K]) => {
    out[key] = v
    next[key] = v
  }

  switch (id) {
    case 'primary': {
      const follow = linked(theme, defaults, 'accentDim', ['accent'], dim)
      set('accent', hex)
      if (follow) set('accentDim', dim(next))
      break
    }
    case 'secondary':
      set('accentDim', hex)
      break
    case 'accent':
      set('highlight', hex)
      break
    case 'background': {
      const wasEqual = theme.bg0 === theme.bg1
      const darker = luminance(theme.bg0) < luminance(theme.bg1)
      set('bg1', hex)
      // The outer ground keeps its relationship to the page: the same shade if
      // the template used one, otherwise a step darker or lighter, the way it
      // was.
      set('bg0', wasEqual ? hex : mix(hex, darker ? '#000000' : '#ffffff', 0.35))
      break
    }
    case 'surface': {
      const follow = linked(theme, defaults, 'bg3', ['bg2'], hoverSurface)
      set('bg2', hex)
      if (follow) set('bg3', hoverSurface(next))
      break
    }
    case 'text': {
      const follow = linked(theme, defaults, 'text1', ['text0'], bodyText)
      set('text0', hex)
      if (follow) set('text1', bodyText(next))
      break
    }
    case 'muted': {
      const follow = linked(theme, defaults, 'text3', ['text2'], dimmedText)
      set('text2', hex)
      if (follow) set('text3', dimmedText(next))
      break
    }
    case 'border': {
      const followSubtle = linked(theme, defaults, 'borderSubtle', ['borderDefault'], subtleBorder)
      const followHover = linked(theme, defaults, 'borderHover', ['borderDefault'], hoverBorder)
      set('borderDefault', hex)
      if (followSubtle) set('borderSubtle', subtleBorder(next))
      if (followHover) set('borderHover', hoverBorder(next))
      break
    }
    case 'buttonBg':
      set('buttonBg', hex)
      break
    case 'buttonText':
      set('buttonText', hex)
      break
  }
  return out
}

/** The fields to write to put one token back to the template's palette. */
export function themeTokenReset(id: ThemeTokenId): (keyof ThemeConfig)[] {
  return THEME_TOKENS.find((token) => token.id === id)?.keys ?? []
}

/** Whether a token differs from the template's palette. */
export function themeTokenIsCustom(
  themeInput: Partial<ThemeConfig> | undefined,
  defaultsInput: Partial<ThemeConfig> | undefined,
  id: ThemeTokenId,
): boolean {
  if (!defaultsInput) return false
  const token = THEME_TOKENS.find((entry) => entry.id === id)
  if (!token) return false
  return token.read(resolveTheme(themeInput)) !== token.read(resolveTheme(defaultsInput))
}

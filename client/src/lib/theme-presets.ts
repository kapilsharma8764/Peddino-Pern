import type { ThemeConfig } from '@/blocks/types'
import { mix, normalizeHex, rgbChannels } from './color'

export const defaultTheme: ThemeConfig = {
  bg0: '#09090b',
  bg1: '#0f0f12',
  bg2: '#18181b',
  bg3: '#1e1e23',
  bg4: '#27272a',
  bg5: '#303036',
  text0: '#fafafa',
  text1: '#a1a1aa',
  text2: '#71717a',
  text3: '#52525b',
  accent: '#22c55e',
  accentDim: '#16a34a',
  borderDefault: '#2a2a2f',
  borderSubtle: '#1f1f24',
  borderHover: '#3a3a3f',
  fontSans: 'DM Sans',
  fontDisplay: 'Space Grotesk',
  fontMono: 'JetBrains Mono',
  radius: 8,
  radiusLg: 12,
}

export interface ThemePreset {
  id: string
  name: string
  theme: ThemeConfig
}

export const themePresets: ThemePreset[] = [
  {
    id: 'default',
    name: 'Dark Minimal',
    theme: { ...defaultTheme },
  },
  {
    id: 'ivory',
    name: 'Ivory',
    theme: {
      ...defaultTheme,
      bg0: '#fdfcfa',
      bg1: '#f5f3ef',
      bg2: '#edebe5',
      bg3: '#e0ddd6',
      bg4: '#ccc8bf',
      bg5: '#b0ab9f',
      text0: '#1c1917',
      text1: '#44403c',
      text2: '#78716c',
      text3: '#a8a29e',
      accent: '#4f46e5',
      accentDim: '#4338ca',
      borderDefault: '#e5e2db',
      borderSubtle: '#f0ede7',
      borderHover: '#d5d0c8',
      fontSans: 'Plus Jakarta Sans',
      fontDisplay: 'Sora',
      radius: 10,
      radiusLg: 16,
    },
  },
  {
    id: 'clean',
    name: 'Clean',
    theme: {
      ...defaultTheme,
      bg0: '#ffffff',
      bg1: '#f8f9fa',
      bg2: '#f1f3f5',
      bg3: '#e9ecef',
      bg4: '#dee2e6',
      bg5: '#ced4da',
      text0: '#212529',
      text1: '#495057',
      text2: '#868e96',
      text3: '#adb5bd',
      accent: '#228be6',
      accentDim: '#1c7ed6',
      borderDefault: '#e9ecef',
      borderSubtle: '#f1f3f5',
      borderHover: '#dee2e6',
      fontSans: 'Inter',
      fontDisplay: 'Inter',
      radius: 8,
      radiusLg: 12,
    },
  },
  {
    id: 'sand',
    name: 'Sand',
    theme: {
      ...defaultTheme,
      bg0: '#faf8f5',
      bg1: '#f2efe8',
      bg2: '#e8e4db',
      bg3: '#ddd8cd',
      bg4: '#c8c2b5',
      bg5: '#b3ab9c',
      text0: '#2c2418',
      text1: '#5c5347',
      text2: '#8a8074',
      text3: '#b0a798',
      accent: '#d97706',
      accentDim: '#b45309',
      borderDefault: '#e2ddd4',
      borderSubtle: '#ebe8e1',
      borderHover: '#d5cfc4',
      fontSans: 'Nunito Sans',
      fontDisplay: 'Outfit',
      radius: 10,
      radiusLg: 14,
    },
  },
  {
    id: 'amber',
    name: 'Amber',
    theme: {
      ...defaultTheme,
      bg0: '#171210',
      bg1: '#1e1816',
      bg2: '#26201c',
      bg3: '#302925',
      bg4: '#3d3530',
      bg5: '#504640',
      text0: '#faf6f0',
      text1: '#d4c8b8',
      text2: '#a89a88',
      text3: '#7d7062',
      accent: '#e8a838',
      accentDim: '#cc8f20',
      borderDefault: '#352e28',
      borderSubtle: '#28211b',
      borderHover: '#443c35',
      fontSans: 'Outfit',
      fontDisplay: 'Outfit',
      radius: 6,
      radiusLg: 10,
    },
  },
  {
    id: 'ocean',
    name: 'Ocean',
    theme: {
      ...defaultTheme,
      bg0: '#0a1628',
      bg1: '#101e32',
      bg2: '#162740',
      bg3: '#1d3050',
      bg4: '#264060',
      bg5: '#305575',
      text0: '#eef4ff',
      text1: '#b0c8e8',
      text2: '#7a9cc0',
      text3: '#506d90',
      accent: '#3b82f6',
      accentDim: '#2563eb',
      borderDefault: '#1e3250',
      borderSubtle: '#162640',
      borderHover: '#2a4468',
      fontSans: 'Inter',
      fontDisplay: 'Sora',
    },
  },
  {
    id: 'rose',
    name: 'Rosé',
    theme: {
      ...defaultTheme,
      bg0: '#16101a',
      bg1: '#1e1620',
      bg2: '#261e28',
      bg3: '#302632',
      bg4: '#3e3340',
      bg5: '#504250',
      text0: '#faf4f8',
      text1: '#d0bcc8',
      text2: '#a08898',
      text3: '#786575',
      accent: '#f472b6',
      accentDim: '#ec4899',
      borderDefault: '#30252e',
      borderSubtle: '#241c25',
      borderHover: '#402e3a',
      fontSans: 'DM Sans',
      fontDisplay: 'Raleway',
      radius: 12,
      radiusLg: 18,
    },
  },
  {
    id: 'purple-haze',
    name: 'Purple Haze',
    theme: {
      ...defaultTheme,
      bg0: '#100c1a',
      bg1: '#16111f',
      bg2: '#1e1828',
      bg3: '#262033',
      bg4: '#302a40',
      bg5: '#3e3650',
      text0: '#f5f0ff',
      text1: '#c4b5fd',
      text2: '#8b7cbf',
      text3: '#6b5c8f',
      accent: '#8b5cf6',
      accentDim: '#7c3aed',
      borderDefault: '#2a2240',
      borderSubtle: '#1e1832',
      borderHover: '#38304f',
      fontSans: 'Manrope',
      fontDisplay: 'Sora',
      radius: 10,
      radiusLg: 14,
    },
  },
  {
    id: 'slate',
    name: 'Slate',
    theme: {
      ...defaultTheme,
      bg0: '#0f1114',
      bg1: '#161a1e',
      bg2: '#1e2228',
      bg3: '#252a32',
      bg4: '#2e353e',
      bg5: '#3a4250',
      text0: '#f0f4f8',
      text1: '#94a3b8',
      text2: '#64748b',
      text3: '#475569',
      accent: '#06b6d4',
      accentDim: '#0891b2',
      borderDefault: '#252a32',
      borderSubtle: '#1c2028',
      borderHover: '#323a45',
      fontSans: 'Work Sans',
      fontDisplay: 'Space Grotesk',
      radius: 6,
      radiusLg: 10,
    },
  },
  {
    id: 'forest',
    name: 'Forest',
    theme: {
      ...defaultTheme,
      bg0: '#0a120c',
      bg1: '#101a13',
      bg2: '#16221a',
      bg3: '#1e2c22',
      bg4: '#26382a',
      bg5: '#304434',
      text0: '#eef8f0',
      text1: '#a0c8a8',
      text2: '#6ea078',
      text3: '#4e7858',
      accent: '#10b981',
      accentDim: '#059669',
      borderDefault: '#1e3022',
      borderSubtle: '#162418',
      borderHover: '#2c4230',
      fontSans: 'Plus Jakarta Sans',
      fontDisplay: 'DM Sans',
      radius: 8,
      radiusLg: 14,
    },
  },
  // Business-oriented presets: a named, ready-made palette for each of the
  // common site categories (school/business/portfolio/agency/premium),
  // rather than requiring someone to hand-tune tokens from scratch.
  {
    id: 'grey-minimal',
    name: 'Grey Minimal',
    theme: {
      ...defaultTheme,
      bg0: '#f9fafb',
      bg1: '#f3f4f6',
      bg2: '#e5e7eb',
      bg3: '#d1d5db',
      bg4: '#9ca3af',
      bg5: '#6b7280',
      text0: '#111827',
      text1: '#374151',
      text2: '#6b7280',
      text3: '#9ca3af',
      accent: '#4b5563',
      accentDim: '#374151',
      borderDefault: '#e5e7eb',
      borderSubtle: '#f3f4f6',
      borderHover: '#d1d5db',
      fontSans: 'Inter',
      fontDisplay: 'Inter',
      headerBackground: '#ffffff',
      headerText: '#111827',
      footerBackground: '#111827',
      footerText: '#ffffff',
      buttonBg: '#111827',
      buttonText: '#ffffff',
      radius: 8,
      radiusLg: 12,
    },
  },
  {
    id: 'dark-grey',
    name: 'Dark Grey',
    theme: {
      ...defaultTheme,
      bg0: '#121212',
      bg1: '#1a1a1a',
      bg2: '#232323',
      bg3: '#2e2e2e',
      bg4: '#3a3a3a',
      bg5: '#4a4a4a',
      text0: '#f5f5f5',
      text1: '#c7c7c7',
      text2: '#9a9a9a',
      text3: '#6f6f6f',
      accent: '#9ca3af',
      accentDim: '#6b7280',
      borderDefault: '#2e2e2e',
      borderSubtle: '#232323',
      borderHover: '#3a3a3a',
      fontSans: 'Manrope',
      fontDisplay: 'Space Grotesk',
      headerBackground: '#121212',
      headerText: '#f5f5f5',
      footerBackground: '#000000',
      footerText: '#f5f5f5',
      buttonBg: '#f5f5f5',
      buttonText: '#121212',
      radius: 6,
      radiusLg: 10,
    },
  },
  {
    id: 'blue-corporate',
    name: 'Blue Corporate',
    theme: {
      ...defaultTheme,
      bg0: '#f8fafc',
      bg1: '#f1f5f9',
      bg2: '#e2e8f0',
      bg3: '#cbd5e1',
      bg4: '#94a3b8',
      bg5: '#64748b',
      text0: '#0f172a',
      text1: '#334155',
      text2: '#64748b',
      text3: '#94a3b8',
      accent: '#2563eb',
      accentDim: '#1d4ed8',
      borderDefault: '#e2e8f0',
      borderSubtle: '#f1f5f9',
      borderHover: '#cbd5e1',
      fontSans: 'Inter',
      fontDisplay: 'Sora',
      headerBackground: '#ffffff',
      headerText: '#0f172a',
      footerBackground: '#0f172a',
      footerText: '#ffffff',
      buttonBg: '#2563eb',
      buttonText: '#ffffff',
      radius: 8,
      radiusLg: 14,
    },
  },
  {
    id: 'green-education',
    name: 'Green Education',
    theme: {
      ...defaultTheme,
      bg0: '#f8fafb',
      bg1: '#eef6f0',
      bg2: '#dcece0',
      bg3: '#c3ddc9',
      bg4: '#8fb99a',
      bg5: '#5f8f6c',
      text0: '#111827',
      text1: '#374151',
      text2: '#6b7280',
      text3: '#9ca3af',
      accent: '#16a34a',
      accentDim: '#15803d',
      borderDefault: '#d7ecdd',
      borderSubtle: '#eef6f0',
      borderHover: '#c3ddc9',
      fontSans: 'Plus Jakarta Sans',
      fontDisplay: 'DM Sans',
      headerBackground: '#ffffff',
      headerText: '#111827',
      footerBackground: '#14532d',
      footerText: '#ffffff',
      buttonBg: '#16a34a',
      buttonText: '#ffffff',
      radius: 10,
      radiusLg: 16,
    },
  },
  {
    id: 'orange-creative',
    name: 'Orange Creative',
    theme: {
      ...defaultTheme,
      bg0: '#fefaf7',
      bg1: '#fdf3ea',
      bg2: '#f8e3cc',
      bg3: '#f0cba0',
      bg4: '#e0a565',
      bg5: '#c17d33',
      text0: '#1f1a14',
      text1: '#4a3f31',
      text2: '#7a6b56',
      text3: '#a89a85',
      accent: '#ea580c',
      accentDim: '#c2410c',
      borderDefault: '#f0e3d2',
      borderSubtle: '#faf1e6',
      borderHover: '#e6cba8',
      fontSans: 'Outfit',
      fontDisplay: 'Outfit',
      headerBackground: '#ffffff',
      headerText: '#1f1a14',
      footerBackground: '#1f1a14',
      footerText: '#fdf3ea',
      buttonBg: '#ea580c',
      buttonText: '#ffffff',
      radius: 14,
      radiusLg: 22,
    },
  },
  {
    id: 'black-premium',
    name: 'Black Premium',
    theme: {
      ...defaultTheme,
      bg0: '#000000',
      bg1: '#0a0a0a',
      bg2: '#141414',
      bg3: '#1f1f1f',
      bg4: '#2b2b2b',
      bg5: '#3a3a3a',
      text0: '#ffffff',
      text1: '#d4d4d4',
      text2: '#a3a3a3',
      text3: '#737373',
      accent: '#c9a961',
      accentDim: '#a8873f',
      borderDefault: '#1f1f1f',
      borderSubtle: '#141414',
      borderHover: '#2b2b2b',
      fontSans: 'Manrope',
      fontDisplay: 'Sora',
      headerBackground: '#000000',
      headerText: '#ffffff',
      footerBackground: '#000000',
      footerText: '#e5e5e5',
      buttonBg: '#c9a961',
      buttonText: '#000000',
      radius: 4,
      radiusLg: 8,
    },
  },
]

/**
 * Palettes for the website itself (not the editor): two neutrals, a dark one and one for each
 * accent colour. They only set colours, so picking one never changes a layout.
 */
function websitePalette(id: string, name: string, accent: string, accentDim: string, mode: 'light' | 'grey' | 'dark'): ThemePreset {
  const light = {
    bg0: '#ffffff', bg1: '#ffffff', bg2: '#f6f7f9', bg3: '#eef0f3', bg4: '#e2e5ea', bg5: '#d0d5dc',
    text0: '#111827', text1: '#374151', text2: '#6b7280', text3: '#9ca3af',
    borderDefault: '#e5e7eb', borderSubtle: '#f0f1f4', borderHover: '#d1d5db',
  }
  const grey = {
    bg0: '#f3f4f6', bg1: '#f3f4f6', bg2: '#e9ebef', bg3: '#dfe2e7', bg4: '#d3d7de', bg5: '#c3c8d1',
    text0: '#1f2937', text1: '#374151', text2: '#6b7280', text3: '#9ca3af',
    borderDefault: '#d6dae1', borderSubtle: '#e5e7eb', borderHover: '#c3c8d1',
  }
  const dark = {
    bg0: '#0f1115', bg1: '#14171c', bg2: '#1b1f26', bg3: '#232832', bg4: '#2c323d', bg5: '#363d4a',
    text0: '#f5f6f8', text1: '#c5cad3', text2: '#8b93a1', text3: '#646c7a',
    borderDefault: '#2a303a', borderSubtle: '#20252d', borderHover: '#3a4250',
  }
  const base = mode === 'dark' ? dark : mode === 'grey' ? grey : light
  return { id, name, theme: { ...defaultTheme, ...base, accent, accentDim, fontSans: 'Inter', fontDisplay: 'Inter', radius: 8, radiusLg: 12 } }
}

themePresets.push(
  websitePalette('neutral-light', 'Neutral Light', '#374151', '#1f2937', 'light'),
  websitePalette('neutral-grey', 'Neutral Grey', '#4b5563', '#374151', 'grey'),
  websitePalette('website-dark', 'Dark', '#e5e7eb', '#cbd5e1', 'dark'),
  websitePalette('website-blue', 'Blue', '#2563eb', '#1d4ed8', 'light'),
  websitePalette('website-green', 'Green', '#16a34a', '#15803d', 'light'),
  websitePalette('website-orange', 'Orange', '#ea580c', '#c2410c', 'light'),
  websitePalette('website-purple', 'Purple', '#7c3aed', '#6d28d9', 'light'),
)

/** The palette a site built from layouts starts with: white and grey, no accent colour of its own. */
export const neutralTheme: ThemeConfig = themePresets.find((preset) => preset.id === 'neutral-light')!.theme

export function resolveTheme(partial?: Partial<ThemeConfig>): ThemeConfig {
  if (!partial) return defaultTheme
  return { ...defaultTheme, ...partial }
}

export function hexToRgb(hex: string): string {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `${r}, ${g}, ${b}`
}

/**
 * The colours a theme actually uses once the optional ones are filled in.
 *
 * Buttons keep the look they have always had unless someone changes them: the
 * accent as fill, white as label, the dimmer accent on hover.
 */
export function semanticColors(theme: ThemeConfig) {
  const buttonBg = normalizeHex(theme.buttonBg)
  return {
    highlight: normalizeHex(theme.highlight) ?? theme.accent,
    button: buttonBg ?? theme.accent,
    buttonText: normalizeHex(theme.buttonText) ?? '#ffffff',
    buttonHover: buttonBg ? mix(buttonBg, '#000000', 0.15) : theme.accentDim,
  }
}

/**
 * Every colour variable, as `--color-*` plus a matching `--rgb-*` channel
 * triplet. The editor's stylesheet reads the first; the published page's
 * Tailwind build reads the second so that opacity modifiers such as
 * `bg-brand/10` keep working while the colour underneath stays a variable —
 * which is what lets a section re-point it.
 */
export function colorVarsToRgb(vars: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [name, value] of Object.entries(vars)) {
    if (!name.startsWith('--color-') || !normalizeHex(value)) continue
    out[`--rgb-${name.slice('--color-'.length)}`] = rgbChannels(value)
  }
  return out
}

export function themeToCSS(theme: ThemeConfig): Record<string, string> {
  const rgb = hexToRgb(theme.accent)
  const semantic = semanticColors(theme)
  const colors: Record<string, string> = {
    // Semantic names are the public palette for a client's site. The older
    // --color-* names below deliberately point to them, keeping all existing
    // widgets in sync while new widgets can use the clearer brand tokens.
    '--brand-primary': theme.accent,
    '--brand-secondary': theme.accentDim,
    '--brand-accent': theme.accent,
    '--brand-text': theme.text0,
    '--brand-bg': theme.bg0,
    '--color-bg-0': 'var(--brand-bg)',
    '--color-bg-1': theme.bg1,
    '--color-bg-2': theme.bg2,
    '--color-bg-3': theme.bg3,
    '--color-bg-4': theme.bg4,
    '--color-bg-5': theme.bg5,
    '--color-text-0': 'var(--brand-text)',
    '--color-text-1': theme.text1,
    '--color-text-2': theme.text2,
    '--color-text-3': theme.text3,
    '--color-brand': 'var(--brand-primary)',
    '--color-brand-dim': 'var(--brand-secondary)',
    '--color-highlight': semantic.highlight,
    '--color-button': semantic.button,
    '--color-button-text': semantic.buttonText,
    '--color-button-hover': semantic.buttonHover,
    '--color-border-default': theme.borderDefault,
    '--color-border-subtle': theme.borderSubtle,
    '--color-border-hover': theme.borderHover,
  }
  const literal: Record<string, string> = { ...colors, '--color-bg-0': theme.bg0, '--color-text-0': theme.text0, '--color-brand': theme.accent, '--color-brand-dim': theme.accentDim }
  return {
    ...colors,
    ...colorVarsToRgb(literal),
    '--color-brand-glow': `rgba(${rgb}, 0.12)`,
    '--color-brand-glow2': `rgba(${rgb}, 0.06)`,
    '--color-accent-rgb': rgb,
    '--font-sans': `"${theme.fontSans}", -apple-system, system-ui, sans-serif`,
    '--font-display': `"${theme.fontDisplay}", system-ui, sans-serif`,
    '--font-mono': `"${theme.fontMono}", ui-monospace, monospace`,
    '--radius-default': `${theme.radius}px`,
    '--radius-lg': `${theme.radiusLg}px`,
  }
}

export const googleFontOptions = [
  'DM Sans',
  'Inter',
  'Space Grotesk',
  'Poppins',
  'Manrope',
  'Outfit',
  'Plus Jakarta Sans',
  'Sora',
  'Nunito Sans',
  'Work Sans',
  'Rubik',
  'Raleway',
  'JetBrains Mono',
  'Fira Code',
  'Source Code Pro',
]

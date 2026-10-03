import { describe, expect, it } from 'vitest'
import { defaultTheme, themeToCSS } from './theme-presets'

describe('themeToCSS', () => {
  it('maps one client-controlled primary color to every existing brand token', () => {
    const css = themeToCSS({ ...defaultTheme, accent: '#e11d48', accentDim: '#be123c' })

    expect(css['--brand-primary']).toBe('#e11d48')
    expect(css['--color-brand']).toBe('var(--brand-primary)')
    expect(css['--brand-secondary']).toBe('#be123c')
    expect(css['--color-brand-dim']).toBe('var(--brand-secondary)')
  })

  it('maps site background and primary text through semantic global tokens', () => {
    const css = themeToCSS({ ...defaultTheme, bg0: '#fff7ed', text0: '#1c1917' })

    expect(css['--brand-bg']).toBe('#fff7ed')
    expect(css['--color-bg-0']).toBe('var(--brand-bg)')
    expect(css['--brand-text']).toBe('#1c1917')
    expect(css['--color-text-0']).toBe('var(--brand-text)')
  })
})

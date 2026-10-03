import { describe, it, expect } from 'vitest'
import { effectiveStyle, hasOverrides, styleToRules } from './block-style'
import type { BlockStyle } from './types'

const style: BlockStyle = {
  background: '#111111',
  paddingTop: 96,
  mobile: { paddingTop: 32 },
}

describe('effectiveStyle', () => {
  it('inherits what a narrower screen does not override', () => {
    // A phone should keep the desktop background; only the padding changed.
    expect(effectiveStyle(style, 'mobile')).toEqual({
      background: '#111111',
      paddingTop: 32,
    })
  })

  it('leaves the desktop values alone', () => {
    expect(effectiveStyle(style, 'desktop').paddingTop).toBe(96)
  })

  it('passes a phone through the tablet', () => {
    // Setting something on tablets should reach phones too unless the phone
    // says otherwise — the same way the CSS cascade reads.
    const cascade: BlockStyle = { tablet: { textAlign: 'center' }, mobile: { paddingTop: 16 } }
    expect(effectiveStyle(cascade, 'mobile').textAlign).toBe('center')
  })
})

describe('hasOverrides', () => {
  it('reports which sizes carry changes of their own', () => {
    expect(hasOverrides(style, 'mobile')).toBe(true)
    expect(hasOverrides(style, 'tablet')).toBe(false)
    expect(hasOverrides(style, 'desktop')).toBe(false)
  })
})

describe('styleToRules', () => {
  const css = styleToRules(style, '.s-abc')

  it('writes the desktop rule without a media query', () => {
    expect(css).toContain('.s-abc{')
    expect(css).toContain('padding-top:96px')
  })

  it('puts the phone override behind a media query', () => {
    // Without this the published page would use the desktop spacing on a
    // phone — the editor can switch viewports, a live page cannot.
    expect(css).toContain('@media (max-width:767px)')
    expect(css).toContain('padding-top:32px')
  })

  it('does not repeat what the phone inherits', () => {
    const mobileRule = css.slice(css.indexOf('@media (max-width:767px)'))
    expect(mobileRule).not.toContain('#111111')
  })

  it('writes nothing for a section with no styling', () => {
    expect(styleToRules(undefined, '.s-x')).toBe('')
    expect(styleToRules({}, '.s-x')).toBe('')
  })
})

import { describe, it, expect } from 'vitest'
import { isEmptyStyle, styleToCss, styleToCssText, widthCss } from './block-style'

describe('styleToCss', () => {
  it('produces nothing when a section has no styling', () => {
    // The common case. A bare section must not gain a wrapper or any CSS,
    // or the design's own layout starts shifting for no reason.
    expect(styleToCss(undefined)).toEqual({})
    expect(styleToCss({})).toEqual({})
  })

  it('applies only the values that were set', () => {
    expect(styleToCss({ paddingTop: 40 })).toEqual({ paddingTop: '40px' })
    expect(styleToCss({ background: '#ff0000' })).toEqual({ background: '#ff0000' })
  })

  it('clips the corners when a radius is set', () => {
    // Without overflow hidden a background photo squares off the rounded edge.
    const css = styleToCss({ radius: 16 })
    expect(css.borderRadius).toBe('16px')
    expect(css.overflow).toBe('hidden')
  })

  it('leaves text size alone at one hundred percent', () => {
    expect(styleToCss({ fontScale: 100 }).fontSize).toBeUndefined()
    expect(styleToCss({ fontScale: 120 }).fontSize).toBe('120%')
  })

  it('covers a background photo rather than tiling it', () => {
    const css = styleToCss({ backgroundImage: 'https://example.com/a.jpg' })
    expect(css.backgroundImage).toBe('url("https://example.com/a.jpg")')
    expect(css.backgroundSize).toBe('cover')
    expect(css.backgroundPosition).toBe('center')
    expect(css.backgroundRepeat).toBe('no-repeat')
  })
})

describe('widthCss', () => {
  it('centres a constrained column', () => {
    expect(widthCss({ width: 'narrow' })).toEqual({
      maxWidth: '760px',
      marginLeft: 'auto',
      marginRight: 'auto',
    })
  })

  it('leaves full width unconstrained', () => {
    expect(widthCss({ width: 'full' })).toEqual({})
    expect(widthCss(undefined)).toEqual({})
  })
})

describe('isEmptyStyle', () => {
  it('treats blank values as unset', () => {
    expect(isEmptyStyle({ background: '' })).toBe(true)
    expect(isEmptyStyle({ background: '#000' })).toBe(false)
  })
})

describe('styleToCssText', () => {
  it('writes CSS the published file can use', () => {
    // The editor and the export share these rules, which is what keeps a
    // published page looking like what was on screen.
    const text = styleToCssText({ paddingTop: 24, background: '#111', width: 'narrow' })
    expect(text).toContain('padding-top:24px')
    expect(text).toContain('background:#111')
    expect(text).toContain('max-width:760px')
  })

  it('is empty for an unstyled section', () => {
    expect(styleToCssText(undefined)).toBe('')
  })
})

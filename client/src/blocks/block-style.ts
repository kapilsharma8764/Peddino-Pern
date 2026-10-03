import type { BlockStyle, Breakpoint, StyleValues } from './types'

/**
 * Turns a section's style settings into CSS.
 *
 * One set of rules, used by the editor canvas and by the published HTML, so a
 * section cannot look one way while you are editing and another once it is
 * live. Anything left unset produces no CSS at all, which is what lets the
 * widget's own design show through untouched.
 */

const WIDTHS: Record<NonNullable<StyleValues['width']>, string> = {
  full: '100%',
  centered: '1100px',
  narrow: '760px',
}

/** Where each breakpoint stops. Matches Tailwind's md and lg. */
export const BREAKPOINTS: { key: Breakpoint; maxWidth?: number }[] = [
  { key: 'desktop' },
  { key: 'tablet', maxWidth: 1023 },
  { key: 'mobile', maxWidth: 767 },
]

/**
 * The values in force at a given width.
 *
 * Narrower screens inherit everything they do not override, so a phone gets
 * the desktop background unless it was given one of its own.
 */
export function effectiveStyle(
  style: BlockStyle | undefined,
  breakpoint: Breakpoint = 'desktop',
): StyleValues {
  if (!style) return {}
  const { tablet, mobile, ...base } = style

  if (breakpoint === 'desktop') return base
  if (breakpoint === 'tablet') return { ...base, ...tablet }
  // A phone inherits through the tablet, which is how the cascade reads in CSS.
  return { ...base, ...tablet, ...mobile }
}

export function styleToCss(style: StyleValues | undefined): Record<string, string> {
  if (!style) return {}
  const css: Record<string, string> = {}
  for (const key of ['paddingLeft','paddingRight','marginTop','marginBottom','marginLeft','marginRight','minHeight','maxWidth','borderWidth','top','left'] as const) {
    if (typeof style[key] === 'number' && Number.isFinite(style[key])) css[key] = `${style[key]}px`
  }
  if (style.borderWidth !== undefined) css.borderStyle = 'solid'
  if (style.borderColor) css.borderColor = style.borderColor
  if (style.shadow) css.boxShadow = style.shadow === 'soft' ? '0 4px 16px #0002' : style.shadow === 'strong' ? '0 16px 40px #0004' : 'none'
  if (style.position) css.position = style.position
  if (style.zIndex !== undefined) css.zIndex = String(style.zIndex)
  if (style.opacity !== undefined) css.opacity = String(Math.max(0, Math.min(1, style.opacity / 100)))
  if (style.overflow) css.overflow = style.overflow
  if (style.hidden !== undefined) css.display = style.hidden ? 'none' : 'block'
  if (style.animation) css.animation = `sb-${style.animation} .7s ease both`

  if (style.background) css.background = style.background
  if (style.backgroundImage) {
    css.backgroundImage = `url("${style.backgroundImage}")`
    css.backgroundSize = 'cover'
    css.backgroundPosition = 'center'
    css.backgroundRepeat = 'no-repeat'
  }
  if (style.textColor) css.color = style.textColor
  if (style.textAlign) css.textAlign = style.textAlign
  if (style.paddingTop !== undefined) css.paddingTop = `${style.paddingTop}px`
  if (style.paddingBottom !== undefined) css.paddingBottom = `${style.paddingBottom}px`
  if (style.radius !== undefined) {
    css.borderRadius = `${style.radius}px`
    // Without this a background or image would spill past the rounded corner.
    css.overflow = 'hidden'
  }
  if (style.fontFamily) css.fontFamily = style.fontFamily
  if (style.fontScale !== undefined && style.fontScale !== 100) {
    // Scaling the root font size rather than each heading keeps the widget's
    // own proportions intact while making the whole section bigger or smaller.
    css.fontSize = `${style.fontScale}%`
  }

  return css
}

/** Styles for the inner wrapper that constrains how wide the content runs. */
export function widthCss(style: StyleValues | undefined): Record<string, string> {
  const width = style?.width
  if (!width || width === 'full') return {}
  return { maxWidth: WIDTHS[width], marginLeft: 'auto', marginRight: 'auto' }
}

/** True when the section has nothing set at any width and needs no wrapper. */
export function isEmptyStyle(style: BlockStyle | undefined): boolean {
  if (!style) return true
  const set = (values: StyleValues | undefined) =>
    values ? Object.values(values).some((value) => value !== undefined && value !== '') : false
  const { tablet, mobile, ...base } = style
  return !set(base) && !set(tablet) && !set(mobile)
}

/** True when this breakpoint has any override of its own. */
export function hasOverrides(style: BlockStyle | undefined, breakpoint: Breakpoint): boolean {
  if (!style || breakpoint === 'desktop') return false
  const values = breakpoint === 'tablet' ? style.tablet : style.mobile
  return Boolean(values && Object.values(values).some((v) => v !== undefined && v !== ''))
}

function toCssText(css: Record<string, string>): string {
  return Object.entries(css)
    .map(([property, value]) => `${property.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}:${value}`)
    .join(';')
}

/** CSS text for one breakpoint, for inline styles in the published file. */
export function styleToCssText(
  style: BlockStyle | undefined,
  breakpoint: Breakpoint = 'desktop',
): string {
  const values = effectiveStyle(style, breakpoint)
  return toCssText({ ...styleToCss(values), ...widthCss(values) })
}

/**
 * A stylesheet for one section, with media queries for the narrower widths.
 *
 * The published page needs real media queries — it cannot know which device is
 * looking at it the way the editor's viewport switch can.
 */
export function styleToRules(style: BlockStyle | undefined, selector: string): string {
  if (!style || isEmptyStyle(style)) return ''

  const rules: string[] = []

  for (const { key, maxWidth } of BREAKPOINTS) {
    // Only what this breakpoint changes, so a phone rule does not restate the
    // desktop background it already inherits.
    const values =
      key === 'desktop' ? effectiveStyle(style, 'desktop') : key === 'tablet' ? style.tablet : style.mobile
    if (!values) continue

    const outer = toCssText(styleToCss(values))
    const inner = toCssText(widthCss(values))
    if (!outer && !inner) continue

    const body = [
      outer ? `${selector}{${outer}}` : '',
      inner ? `${selector}>*{${inner}}` : '',
    ]
      .filter(Boolean)
      .join('')

    rules.push(maxWidth ? `@media (max-width:${maxWidth}px){${body}}` : body)
  }

  return rules.join('\n')
}

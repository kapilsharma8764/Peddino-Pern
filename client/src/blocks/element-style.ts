import type { CSSProperties } from 'react'
import type { BlockConfig, Breakpoint } from './types'

export type ElementStyle = CSSProperties & { tablet?: CSSProperties; mobile?: CSSProperties }
export function elementStyles(block: BlockConfig): Record<string, ElementStyle> {
  return (block.props.elementStyles ?? {}) as Record<string, ElementStyle>
}
export function elementCss(block: BlockConfig, path: string, device: Breakpoint = 'desktop'): CSSProperties {
  const { tablet, mobile, ...base } = elementStyles(block)[path] ?? {}
  return { ...base, ...(device !== 'desktop' ? tablet : {}), ...(device === 'mobile' ? mobile : {}) }
}
export function elementToken(block: BlockConfig, path: string): string {
  return `el-${Array.from(`${block.id}:${path}`).map(c => c.codePointAt(0)!.toString(16)).join('-')}`
}
export function elementRules(block: BlockConfig): string {
  const rules = (style: CSSProperties) => Object.entries(style).filter(([, v]) => v !== undefined && v !== '').map(([k, v]) => {
    const key = k.replace(/[A-Z]/g, c => `-${c.toLowerCase()}`)
    const value = typeof v === 'number' && !['fontWeight', 'opacity', 'lineHeight', 'flexGrow', 'flexShrink', 'order', 'zIndex'].includes(k) ? `${v}px` : String(v)
    return `${key}:${value.replace(/[<>;{}]/g, '')} !important`
  }).join(';')
  return Object.keys(elementStyles(block)).map(path => {
    const selector = `[data-element-token="${elementToken(block, path)}"]`
    return `${selector}{${rules(elementCss(block, path))}}@media(max-width:1024px){${selector}{${rules(elementCss(block,path,'tablet'))}}}@media(max-width:767px){${selector}{${rules(elementCss(block,path,'mobile'))}}}`
  }).join('\n')
}

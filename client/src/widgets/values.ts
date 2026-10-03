import type { CSSProperties } from 'react'
import type { BlockConfig } from '@/blocks/types'
export const str = (value: unknown, fallback = '') => typeof value === 'string' ? value : fallback
export const rows = (value: unknown): Record<string, unknown>[] => Array.isArray(value) ? value.filter(item => item && typeof item === 'object' && !Array.isArray(item)) : []
export const strings = (value: unknown): string[] => Array.isArray(value) ? value.map(String) : []
export const number = (value: unknown, fallback = 0, min = -1000000, max = 1000000) => Number.isFinite(Number(value)) ? Math.min(max, Math.max(min, Number(value))) : fallback
export function safeUrl(value: unknown) {
  const url = str(value).trim()
  if (/^(?:https?:\/\/|mailto:|tel:|#|\/(?!\/)|\?|\.\/|\.\.\/)/i.test(url)) return url
  if (url && !/[:\\\s]/.test(url)) return url
  return '#'
}
export const money = (value: unknown, currency: unknown) => {
  try { return new Intl.NumberFormat('en-US', {style:'currency',currency:str(currency,'USD')}).format(number(value)) } catch { return number(value).toFixed(2) }
}
export function functionalLayoutStyle(block: BlockConfig): CSSProperties {
  const p=block.props, gap=number(p.gap,20,0,300)
  switch(block.type) {
    case 'row': return {display:'flex',flexWrap:'wrap',gap}
    case 'grid': return {display:'grid',gridTemplateColumns:`repeat(${number(p.columns,3,1,6)},minmax(0,1fr))`,gap}
    case 'auto-grid': return {display:'grid',gridTemplateColumns:`repeat(auto-fit,minmax(min(100%,${number(p.minCardWidth,240,80,1000)}px),1fr))`,gap}
    case 'masonry-layout': return {columns:number(p.columns,3,1,6),columnGap:gap}
    case 'split-layout': return {display:'grid',gridTemplateColumns:`minmax(0,${number(p.ratio,40,10,90)}fr) minmax(0,${100-number(p.ratio,40,10,90)}fr)`,gap}
    case 'sidebar-layout': return {display:'grid',gridTemplateColumns:`minmax(0,${number(p.sidebarWidth,240,100,600)}px) minmax(0,1fr)`,gap}
    case 'scroll-container': return {display:'flex',flexDirection:'column',gap,maxHeight:number(p.height,320,80,1200),overflowY:'auto'}
    case 'full-height-section': return {display:'flex',flexDirection:'column',justifyContent:'center',minHeight:'100vh',gap}
    case 'centered-container': return {display:'flex',flexDirection:'column',gap,maxWidth:number(p.maxWidth,720,320,1400),marginLeft:'auto',marginRight:'auto'}
    default:return {display:'flex',flexDirection:'column',gap}
  }
}

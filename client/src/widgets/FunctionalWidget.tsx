import { useEffect, useRef, type ReactNode } from 'react'
import type { BlockConfig } from '@/blocks/types'
import { functionalMap } from './catalogue'
import { mountWidgets } from './runtime'
import { FamilyContent } from './Families'
import { number, str } from './values'
import './functional.css'

export function FunctionalWidget({ block, children }: { block: BlockConfig; children?: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => { if (ref.current) return mountWidgets(ref.current) }, [block])
  const definition = functionalMap.get(block.type)
  if (!definition) return null
  const p = block.props
  const id = `fw-${encodeURIComponent(block.id).replace(/%/g, '-')}`
  const family = definition.family
  const sticky = block.type === 'sticky-container' || block.type === 'floating-navigation'
  const style = block.type === 'speed-dial' ? { position:'fixed' as const, bottom:16, right:16, zIndex:20 }
    : block.type === 'sticky-cta-bar' ? { position:'fixed' as const, left:16, right:16, bottom:16, zIndex:20 }
    : sticky ? { position:'sticky' as const, top:number(p.offset,16), zIndex:10 }
    : undefined
  return <div ref={ref} style={style}>
    <section className="fw" data-fw={family} data-type={block.type} data-props={JSON.stringify(p)} data-widget-id={block.id} data-autoplay={String(p.autoplay === true)} data-interval={String(p.interval ?? 5)} data-deadline={str(p.deadline)} data-expired={str(p.expired)}>
      {p.title && !['input','navigation'].includes(family) && family !== 'layout' ? <h3 data-edit="title">{str(p.title)}</h3> : null}
      <FamilyContent block={block} id={id} family={family}>{children}</FamilyContent>
    </section>
  </div>
}

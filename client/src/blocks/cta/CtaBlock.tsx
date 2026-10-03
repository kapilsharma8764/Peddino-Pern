import { EditableAction } from '../EditableAction'
import type { BlockConfig } from '../types'
import { ArrowRight } from 'lucide-react'

interface CtaProps {
  headline: string
  subheadline?: string
  buttonText: string
}

function CtaSimple({ props }: { props: CtaProps }) {
  return (
    <section className="px-6 @md:px-10 py-16 @md:py-20 text-center relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-brand/6 via-brand/3 to-transparent pointer-events-none" />

      <div className="relative z-10">
        <h2 data-edit="headline" className="reveal-fade-up reveal-d1 text-2xl @md:text-3xl font-bold tracking-tight mb-3">{props.headline}</h2>
        {props.subheadline && (
          <p data-edit="subheadline" className="reveal-fade-up reveal-d2 text-text-2 text-sm mb-6 max-w-md mx-auto">{props.subheadline}</p>
        )}
        <div className="reveal-fade-up reveal-d3">
          <EditableAction path="buttonText" urlPath="buttonUrl" label="CTA Button" className="px-8 py-3 rounded-lg bg-brand text-white text-sm font-semibold hover:bg-brand-dim transition-all hover:accent-glow-xl inline-flex items-center gap-2">
            
            <ArrowRight size={16} />
          </EditableAction>
        </div>
      </div>
    </section>
  )
}

function CtaSplit({ props }: { props: CtaProps }) {
  return (
    <section className="px-6 @md:px-10 py-12 @md:py-16">
      <div className="reveal-scale reveal-d1 flex flex-col @lg:flex-row items-center justify-between gap-6 p-8 rounded-xl bg-bg-2 border border-border-default relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-brand/5 to-transparent pointer-events-none" />
        <div className="relative z-10">
          <h2 data-edit="headline" className="text-xl @md:text-2xl font-bold tracking-tight mb-1">{props.headline}</h2>
          {props.subheadline && (
            <p data-edit="subheadline" className="text-text-2 text-sm">{props.subheadline}</p>
          )}
        </div>
        <EditableAction path="buttonText" urlPath="buttonUrl" label="CTA Button" className="relative z-10 px-6 py-3 rounded-lg bg-brand text-white text-sm font-semibold hover:bg-brand-dim transition-all shrink-0 flex items-center gap-2">
          
          <ArrowRight size={16} />
        </EditableAction>
      </div>
    </section>
  )
}

export function CtaBlock({ block }: { block: BlockConfig }) {
  const props = block.props as unknown as CtaProps

  switch (block.variant) {
    case 'split':
      return <CtaSplit props={props} />
    default:
      return <CtaSimple props={props} />
  }
}

import { EditableAction } from '../EditableAction'
import type { BlockConfig } from '../types'
import { ArrowRight, Sparkles } from 'lucide-react'

/**
 * The opening section.
 *
 * Nearly every professional template leads with a photograph, and the version
 * this replaces drew a dashed box labelled "Preview" instead — which is the
 * single thing that made a finished template look unfinished. All the layouts
 * that have room for an image now take one, and fall back to a tinted panel
 * rather than a placeholder when there is none.
 */

interface HeroProps {
  badge?: string
  headline: string
  subheadline: string
  primaryCta: string
  secondaryCta?: string
  image?: string
  imageAlt?: string
}

function PrimaryButton({ label }: { label: string }) {
  return (
    <EditableAction path="primaryCta" urlPath="primaryCtaUrl" label="Primary Button" fallback={label} className="px-6 py-3 rounded-lg bg-brand text-white text-sm font-semibold hover:bg-brand-dim transition-all flex items-center gap-2">
      <ArrowRight size={16} />
    </EditableAction>
  )
}

function SecondaryButton({ label }: { label: string }) {
  return (
    <EditableAction path="secondaryCta" urlPath="secondaryCtaUrl" label="Secondary Button" fallback={label} className="px-6 py-3 rounded-lg bg-bg-3 text-text-0 text-sm font-medium border border-border-default hover:bg-bg-4 hover:border-border-hover transition-all">
    </EditableAction>
  )
}

function Badge({ text }: { text: string }) {
  return (
    <div className="reveal-fade-up reveal-d1 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand/10 border border-brand/20 text-brand text-[11px] font-medium mb-6">
      <Sparkles size={12} />
      {text}
    </div>
  )
}

/** The photo, or a quiet panel in its place — never a dashed placeholder. */
function Visual({ src, alt }: { src?: string; alt: string }) {
  if (src) {
    return (
      <img
        data-image="image"
        data-element-alt="imageAlt"
        src={src}
        alt={alt}
        loading="eager"
        className="w-full h-full object-cover"
      />
    )
  }
  return (
    <div className="w-full h-full bg-gradient-to-br from-brand/20 via-bg-2 to-bg-3" aria-hidden="true" />
  )
}

function HeroCentered({ props }: { props: HeroProps }) {
  return (
    <section className="px-6 @md:px-10 py-20 @md:py-24 text-center">
      {props.badge && <Badge text={props.badge} />}

      <h1 data-edit="headline" className="reveal-fade-up reveal-d2 text-4xl @md:text-5xl font-bold tracking-tight leading-[1.1] mb-4 max-w-3xl mx-auto">
        {props.headline}
      </h1>

      <p data-edit="subheadline" className="reveal-fade-up reveal-d3 text-text-2 text-base @md:text-lg leading-relaxed max-w-xl mx-auto mb-8">
        {props.subheadline}
      </p>

      <div className="reveal-fade-up reveal-d4 flex flex-wrap items-center justify-center gap-3">
        <PrimaryButton label={props.primaryCta} />
        {props.secondaryCta && <SecondaryButton label={props.secondaryCta} />}
      </div>

      {props.image && (
        <div className="reveal-fade-up reveal-d5 mt-14 max-w-4xl mx-auto aspect-[16/9] rounded-2xl overflow-hidden border border-border-default">
          <Visual src={props.image} alt={props.imageAlt || props.headline} />
        </div>
      )}
    </section>
  )
}

function HeroSplit({ props }: { props: HeroProps }) {
  return (
    <section className="px-6 @md:px-10 py-16 @md:py-24 flex flex-col @2xl:flex-row items-center gap-10 @2xl:gap-14">
      <div className="flex-1">
        {props.badge && <Badge text={props.badge} />}
        <h1 data-edit="headline" className="reveal-fade-up reveal-d2 text-3xl @md:text-5xl font-bold tracking-tight leading-[1.1] mb-4">
          {props.headline}
        </h1>
        <p data-edit="subheadline" className="reveal-fade-up reveal-d3 text-text-2 text-base leading-relaxed mb-6 max-w-lg">
          {props.subheadline}
        </p>
        <div className="reveal-fade-up reveal-d4 flex flex-wrap items-center gap-3">
          <PrimaryButton label={props.primaryCta} />
          {props.secondaryCta && <SecondaryButton label={props.secondaryCta} />}
        </div>
      </div>

      <div className="reveal-fade-up reveal-d3 flex-1 w-full">
        <div className="aspect-[4/3] rounded-2xl overflow-hidden border border-border-default">
          <Visual src={props.image} alt={props.imageAlt || props.headline} />
        </div>
      </div>
    </section>
  )
}

/**
 * A photograph across the full width with the words on top — the layout most
 * restaurants, gyms and hotels lead with.
 */
function HeroPhoto({ props }: { props: HeroProps }) {
  return (
    <section className="relative min-h-[420px] @md:min-h-[560px] flex items-center overflow-hidden">
      <div className="absolute inset-0">
        <Visual src={props.image} alt="" />
        {/* Dark wash so the text stays readable whatever the photo is. */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/45 to-black/25" />
      </div>

      <div className="relative z-10 px-6 @md:px-14 py-20 max-w-3xl">
        {props.badge && (
          <div className="reveal-fade-up reveal-d1 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 border border-white/25 text-white text-[11px] font-medium mb-5 backdrop-blur-sm">
            {props.badge}
          </div>
        )}
        <h1 data-edit="headline" className="reveal-fade-up reveal-d2 text-4xl @md:text-6xl font-bold tracking-tight leading-[1.05] mb-4 text-white">
          {props.headline}
        </h1>
        <p data-edit="subheadline" className="reveal-fade-up reveal-d3 text-white/85 text-base @md:text-lg leading-relaxed max-w-xl mb-8">
          {props.subheadline}
        </p>
        <div className="reveal-fade-up reveal-d4 flex flex-wrap items-center gap-3">
          <PrimaryButton label={props.primaryCta} />
          {props.secondaryCta && (
            <EditableAction path="secondaryCta" urlPath="secondaryCtaUrl" label="Secondary Button" className="px-6 py-3 rounded-lg bg-white/10 text-white text-sm font-medium border border-white/30 hover:bg-white/20 transition-all backdrop-blur-sm">
            </EditableAction>
          )}
        </div>
      </div>
    </section>
  )
}

function HeroGradient({ props }: { props: HeroProps }) {
  return (
    <section className="px-6 @md:px-10 py-20 @md:py-28 text-center relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-brand/8 via-transparent to-transparent pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-brand/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative z-10">
        {props.badge && <Badge text={props.badge} />}

        <h1 data-edit="headline" className="reveal-fade-up reveal-d2 text-4xl @md:text-5xl font-bold tracking-tight leading-[1.1] mb-4 max-w-3xl mx-auto">{props.headline}</h1>

        <p data-edit="subheadline" className="reveal-fade-up reveal-d3 text-text-2 text-base @md:text-lg leading-relaxed max-w-xl mx-auto mb-8">{props.subheadline}</p>

        <div className="reveal-fade-up reveal-d4 flex flex-wrap items-center justify-center gap-3">
          <PrimaryButton label={props.primaryCta} />
          {props.secondaryCta && <SecondaryButton label={props.secondaryCta} />}
        </div>

        {props.image && (
          <div className="reveal-fade-up reveal-d5 mt-14 max-w-4xl mx-auto aspect-[16/9] rounded-2xl overflow-hidden border border-border-default">
            <Visual src={props.image} alt={props.imageAlt || props.headline} />
          </div>
        )}
      </div>
    </section>
  )
}

function HeroMinimal({ props }: { props: HeroProps }) {
  return (
    <section className="px-6 @md:px-10 py-24 @md:py-32 text-center">
      <h1 data-edit="headline" className="reveal-fade-up reveal-d1 text-5xl @md:text-7xl font-bold tracking-tighter leading-[1.05] mb-6 max-w-4xl mx-auto">
        {props.headline}
      </h1>
      <p data-edit="subheadline" className="reveal-fade-up reveal-d2 text-text-2 text-lg @md:text-xl leading-relaxed max-w-lg mx-auto mb-10">
        {props.subheadline}
      </p>
      <div className="reveal-fade-up reveal-d3 flex justify-center">
        <PrimaryButton label={props.primaryCta} />
      </div>
    </section>
  )
}

export function HeroBlock({ block }: { block: BlockConfig }) {
  const props = block.props as unknown as HeroProps

  switch (block.variant) {
    case 'split':
      return <HeroSplit props={props} />
    case 'photo':
      return <HeroPhoto props={props} />
    case 'gradient':
      return <HeroGradient props={props} />
    case 'minimal':
      return <HeroMinimal props={props} />
    default:
      return <HeroCentered props={props} />
  }
}

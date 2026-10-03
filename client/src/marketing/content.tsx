import type { ReactNode } from 'react'
import { columnsOf, textOf, type ContentSection } from '@/services/contentApi'
import { cardItems, fill } from './content-helpers'
import { CardGrid, CtaBand, PageHero, Section } from './MarketingPage'

/**
 * Draws a section of database-managed marketing content with the page's own
 * components. A section that is missing (switched off in the database, or not
 * part of this page) simply draws nothing.
 */

export function HeroSection({ section, children }: { section?: ContentSection; children?: ReactNode }) {
  if (!section) return null
  return <PageHero eyebrow={textOf(section.content.eyebrow)} title={fill(section.title)} accent={textOf(section.content.accent) || undefined} lede={fill(section.subtitle)}>{children}</PageHero>
}

export function CardsSection({ section, id }: { section?: ContentSection; id?: string }) {
  if (!section) return null
  const { content } = section
  return (
    <Section id={id} eyebrow={textOf(content.eyebrow) || undefined} title={section.title || undefined} lede={fill(section.subtitle) || undefined} tone={content.tone === 'soft' ? 'soft' : undefined}>
      <CardGrid columns={columnsOf(content.columns, 3)} items={cardItems(section)} />
    </Section>
  )
}

export function CtaSection({ section }: { section?: ContentSection }) {
  if (!section) return null
  const { content } = section
  const secondaryLabel = textOf(content.secondaryLabel)
  const secondaryTo = textOf(content.secondaryTo)
  return (
    <CtaBand
      title={section.title}
      text={fill(section.subtitle)}
      label={textOf(content.label) || undefined}
      to={textOf(content.to) || undefined}
      secondary={secondaryLabel && secondaryTo ? { label: secondaryLabel, to: secondaryTo } : undefined}
    />
  )
}

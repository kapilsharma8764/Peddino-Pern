import { EditableContext } from './editable-context'
import { useConfigStore } from '@/store/configStore'
import { ensurePages } from '@/store/site-shape'
import type { BlockConfig } from './types'
import { effectiveStyle, isEmptyStyle, styleToCss, widthCss } from './block-style'
import { useEditorStore } from '@/store/editorStore'
import { Component, type ReactNode } from 'react'

import { NavbarBlock } from './navbar/NavbarBlock'
import { HeroBlock } from './hero/HeroBlock'
import { FeaturesBlock } from './features/FeaturesBlock'
import { PricingBlock } from './pricing/PricingBlock'
import { CtaBlock } from './cta/CtaBlock'
import { FooterBlock } from './footer/FooterBlock'
import { TestimonialsBlock } from './testimonials/TestimonialsBlock'
import { StatsBlock } from './stats/StatsBlock'
import { FaqBlock } from './faq/FaqBlock'
import { TeamBlock } from './team/TeamBlock'
import { ContactBlock } from './contact/ContactBlock'
import { NewsletterBlock } from './newsletter/NewsletterBlock'
import { LogoCloudBlock } from './logocloud/LogoCloudBlock'
import { DividerBlock } from './divider/DividerBlock'
import { BannerBlock } from './banner/BannerBlock'
import { ContentBlock } from './content/ContentBlock'
import { ImageBlock } from './image/ImageBlock'
import { VideoBlock } from './video/VideoBlock'
import { GalleryBlock } from './gallery/GalleryBlock'
import { MapBlock } from './map/MapBlock'
import { WhatsappBlock } from './whatsapp/WhatsappBlock'
import { ChartBlock } from './chart/ChartBlock'
import { HoursBlock } from './hours/HoursBlock'
import { SliderBlock } from './slider/SliderBlock'
import { ProductsBlock } from './products/ProductsBlock'
import { AdditionalBlock } from './AdditionalWidget'
import { ContainerBlock } from './container/ContainerBlock'
import { sectionColorCss } from '@/lib/section-colors'
import { functionalWidgets } from '@/widgets/catalogue'
import { FunctionalWidget } from '@/widgets/FunctionalWidget'
import { layoutTypes } from '@/widgets/expanded'
import { functionalLayoutStyle } from '@/widgets/values'
import { elementRules } from './element-style'

function FunctionalLayout({block}:{block:BlockConfig}) {
  return <FunctionalWidget block={block}><ContainerBlock block={block} layout={functionalLayoutStyle(block)}/></FunctionalWidget>
}

// Error boundary for individual blocks
class BlockErrorBoundary extends Component<
  { blockType: string; children: ReactNode },
  { hasError: boolean; error?: Error }
> {
  state = { hasError: false, error: undefined as Error | undefined }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="px-6 py-8 text-center border border-status-red/20 bg-status-red/5 rounded-lg mx-4 my-2">
          <p className="text-status-red text-sm font-medium mb-1">
            Failed to render {this.props.blockType} block
          </p>
          <p className="text-text-3 text-xs">
            {this.state.error?.message || 'An unexpected error occurred'}
          </p>
        </div>
      )
    }
    return this.props.children
  }
}

// Fallback for unregistered block types
function PlaceholderBlock({ block }: { block: BlockConfig }) {
  return (
    <div className="px-9 py-7 text-center text-text-3 text-sm">
      {block.type} block (coming soon)
    </div>
  )
}

const blockRenderers: Record<string, React.ComponentType<{ block: BlockConfig }>> = {
  ...Object.fromEntries(functionalWidgets.map(widget => [widget.type, layoutTypes.has(widget.type as never) ? FunctionalLayout : FunctionalWidget])),
  navbar: NavbarBlock,
  hero: HeroBlock,
  features: FeaturesBlock,
  pricing: PricingBlock,
  cta: CtaBlock,
  footer: FooterBlock,
  testimonials: TestimonialsBlock,
  stats: StatsBlock,
  faq: FaqBlock,
  team: TeamBlock,
  contact: ContactBlock,
  newsletter: NewsletterBlock,
  logocloud: LogoCloudBlock,
  divider: DividerBlock,
  banner: BannerBlock,
  content: ContentBlock,
  image: ImageBlock,
  video: VideoBlock,
  gallery: GalleryBlock,
  map: MapBlock,
  whatsapp: WhatsappBlock,
  chart: ChartBlock,
  hours: HoursBlock,
  slider: SliderBlock,
  products: ProductsBlock,
  heading: AdditionalBlock,
  button: AdditionalBlock,
  'rich-text': AdditionalBlock,
  icon: AdditionalBlock,
  'icon-box': AdditionalBlock,
  'image-box': AdditionalBlock,
  'social-icons': AdditionalBlock,
  list: AdditionalBlock,
  progress: AdditionalBlock,
  tabs: AdditionalBlock,
  accordion: AdditionalBlock,
  'html-embed': AdditionalBlock,
  spacer: AdditionalBlock,
  quote: AdditionalBlock,
  badge: AdditionalBlock,
  'code-block': AdditionalBlock,
  table: AdditionalBlock,
  steps: AdditionalBlock,
  audio: AdditionalBlock,
  'back-to-top': AdditionalBlock,
  container: ContainerBlock,
}

export function RenderBlock({ block }: { block: BlockConfig }): ReactNode {
  const Renderer = blockRenderers[block.type] || PlaceholderBlock
  // The canvas simulates a device by width, so the styling that applies is
  // decided here rather than by a media query — what is on screen is then
  // exactly what that device gets.
  const viewport = useEditorStore((s) => s.viewport)
  const config = useConfigStore(s => s.config)
  const onPage = useConfigStore(s => s.setActivePage)

  const rendered = (
    <BlockErrorBoundary blockType={block.type}>
      {Object.keys((block.props.elementStyles ?? {}) as object).length > 0 && <style>{elementRules(block)}</style>}
      <EditableContext.Provider value={{ block, pages: ensurePages(config), viewport, onPage }}>
        <Renderer block={block} />
      </EditableContext.Provider>
    </BlockErrorBoundary>
  )

  const content = block.props.anchorId || block.props.cssClasses ? <div id={block.props.anchorId ? String(block.props.anchorId) : undefined} className={String(block.props.cssClasses ?? '')}>{rendered}</div> : rendered

  // Colour styling comes from the theme, so it is worked out here rather than
  // stored: change the theme and every section restyled from it follows.
  const colorCss = sectionColorCss(config.theme, block.colors)

  // A section with no styling of its own is rendered bare, so the common case
  // adds no markup at all.
  if (isEmptyStyle(block.style) && !colorCss) return content
  const values = effectiveStyle(block.style, viewport)
  if (values.hidden) return null
  // Explicit box styling goes last, so a background set by hand still beats a
  // colour preset — the order the section colours are documented to resolve in.
  const boxCss = styleToCss(values)
  const outer: Record<string, string> = { ...colorCss?.style, ...boxCss }
  // `background` is a shorthand; leaving the preset's longhands beside it would
  // make React redraw the two against each other.
  if (boxCss.background) for (const key of ['backgroundColor', 'backgroundImage', 'backgroundSize', 'backgroundPosition', 'backgroundRepeat']) delete outer[key]
  const inner = widthCss(values)

  return (
    <div style={outer} data-section-image={colorCss?.image ? '' : undefined} data-section-colors={colorCss ? block.colors?.preset ?? 'custom' : undefined}>
      {Object.keys(inner).length > 0 ? <div style={inner}>{content}</div> : content}
    </div>
  )
}

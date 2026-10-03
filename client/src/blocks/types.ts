import type { FunctionalWidgetType } from '@/widgets/catalogue'

export type BlockType = FunctionalWidgetType
  | 'navbar'
  | 'hero'
  | 'features'
  | 'pricing'
  | 'cta'
  | 'footer'
  | 'testimonials'
  | 'stats'
  | 'faq'
  | 'team'
  | 'contact'
  | 'newsletter'
  | 'logocloud'
  | 'divider'
  | 'banner'
  | 'content'
  | 'image'
  | 'video'
  | 'gallery'
  | 'map'
  | 'whatsapp'
  | 'chart'
  | 'hours'
  | 'slider'
  | 'products'
  | 'heading'
  | 'button'
  | 'rich-text'
  | 'icon'
  | 'icon-box'
  | 'image-box'
  | 'social-icons'
  | 'list'
  | 'progress'
  | 'tabs'
  | 'accordion'
  | 'html-embed'
  | 'spacer'
  | 'quote'
  | 'badge'
  | 'code-block'
  | 'table'
  | 'steps'
  | 'audio'
  | 'back-to-top'
  | 'container'

export type BlockVariant = string

/**
 * Per-section styling, applied by the renderer around whatever the widget
 * draws.
 *
 * This is the "resize and restyle" part of the brief, done the way Elementor
 * does it rather than the way Framer does: not free dragging on a canvas, but
 * a set of controls — width, spacing, background, alignment, type — that apply
 * to the section you have selected. Every value is optional, and an absent one
 * means "leave the widget's own design alone".
 */
/**
 * The style values a section can carry. Every one is optional; an absent value
 * means "leave the widget's own design alone".
 */
export interface StyleValues {
  /** How wide the content runs: full bleed, centred column, or narrow. */
  width?: 'full' | 'centered' | 'narrow'
  paddingTop?: number
  paddingBottom?: number
  paddingLeft?: number
  paddingRight?: number
  marginTop?: number
  marginBottom?: number
  marginLeft?: number
  marginRight?: number
  minHeight?: number
  maxWidth?: number
  borderWidth?: number
  borderColor?: string
  shadow?: 'none' | 'soft' | 'strong'
  position?: 'static' | 'relative' | 'sticky' | 'absolute' | 'fixed'
  top?: number
  left?: number
  zIndex?: number
  opacity?: number
  overflow?: 'visible' | 'hidden' | 'auto'
  background?: string
  backgroundImage?: string
  textAlign?: 'left' | 'center' | 'right'
  textColor?: string
  /** Scales the section's text, 100 being the design's own size. */
  fontScale?: number
  fontFamily?: string
  radius?: number
  /** Hides the section without deleting it. */
  hidden?: boolean
  /** A short entrance animation, played when the section appears. */
  animation?: 'fade' | 'slide-up' | 'slide-left' | 'zoom'
}

/**
 * A section's styling, with optional overrides for narrower screens.
 *
 * The base values apply everywhere; `tablet` and `mobile` change only what
 * they mention, so setting a smaller heading on a phone does not mean
 * restating the background and spacing as well.
 */
export interface BlockStyle extends StyleValues {
  tablet?: StyleValues
  mobile?: StyleValues
}

/** Which screen width is being edited or drawn. */
export type Breakpoint = 'desktop' | 'tablet' | 'mobile'

/**
 * The colour styles a section can wear. Each one is a recipe over the site's
 * own theme colours rather than a fixed palette, so it follows the template it
 * sits in: change the theme and every section restyled this way moves with it.
 *
 * `style1` is the theme as designed, `style2` a softer alternating surface,
 * `style3` a bold band in the primary colour, and `image` a photograph under a
 * tinted overlay.
 */
export type SectionColorPreset = 'style1' | 'style2' | 'style3' | 'image'

/** The individual colours a section may override on its own. */
export type SectionColorKey =
  | 'background'
  | 'surface'
  | 'heading'
  | 'text'
  | 'muted'
  | 'link'
  | 'button'
  | 'buttonText'
  | 'border'

export interface SectionColors {
  /** Absent means the section simply inherits the theme. */
  preset?: SectionColorPreset
  /** Background photo and the tint laid over it, for the `image` preset. */
  image?: {
    src?: string
    overlayColor?: string
    /** 0–100. */
    overlayOpacity?: number
  }
  /** Colours set by hand for this section only. */
  overrides?: Partial<Record<SectionColorKey, string>>
}

export interface BlockConfig {
  id: string
  type: BlockType
  variant: BlockVariant
  props: Record<string, unknown>
  style?: BlockStyle
  /**
   * Colour styling for this section: a preset over the theme, plus any
   * hand-picked overrides. Kept apart from `style` because it is not
   * responsive — a section is one colour on every device — and because absent
   * must keep meaning "follow the theme" for every site saved before it existed.
   */
  colors?: SectionColors
  /**
   * Blocks drawn inside this one.
   *
   * Only containers use it; for every other widget it is absent, which is why
   * it is optional rather than an empty array — a saved site from before
   * nesting existed stays valid, and `blocks.map` over a flat page still
   * means what it always meant.
   */
  children?: BlockConfig[]
}

export interface ThemeConfig {
  headerBackground?: string
  headerText?: string
  headerLink?: string
  headerButton?: string
  footerBackground?: string
  footerText?: string
  footerLink?: string
  // Backgrounds
  bg0: string
  bg1: string
  bg2: string
  bg3: string
  bg4: string
  bg5: string
  // Text
  text0: string
  text1: string
  text2: string
  text3: string
  // Accent
  accent: string
  accentDim: string
  // Borders
  borderDefault: string
  borderSubtle: string
  borderHover: string
  // Fonts
  fontSans: string
  fontDisplay: string
  fontMono: string
  // Semantic extras. Absent means "derive from the colours above", which is
  // what every site saved before these existed does.
  /** Focus rings, selection and highlights; falls back to the accent. */
  highlight?: string
  /** Fill of buttons; falls back to the accent. */
  buttonBg?: string
  /** Label on buttons; falls back to white, as buttons have always been. */
  buttonText?: string
  // Radius
  radius: number
  radiusLg: number
}

/** Colours that apply to one page only; absent means the page follows the site theme. */
export interface PageColors {
  background?: string
  text?: string
  heading?: string
}

export interface PageConfig {
  id: string
  name: string
  path: string
  blocks: BlockConfig[]
  colors?: PageColors
  /** Whether this page appears in the site's navigation. Defaults to true. */
  showInMenu?: boolean
}

/**
 * Theme colours for an imported HTML design.
 *
 * Those designs bring their own stylesheets full of literal colours, so there
 * is no theme to edit directly. Instead the colours are read out of the
 * template once (`detected`), the owner's choices are kept as tokens, and the
 * difference between the two is turned into CSS that is laid over every page
 * (`rules`) — the template's own files are never touched.
 */
export interface OriginalTheme {
  /** The palette read from the template, which "reset" returns to. */
  detected?: Partial<Record<string, string>>
  /** Colours chosen by the owner, by token id. */
  tokens?: Partial<Record<string, string>>
  /** CSS applying those choices to the template's own stylesheets. */
  rules?: string
}

export interface SiteConfig {
  migrationVersion?: number
  name: string
  /**
   * How the site was started. "custom" means the owner chose to build it from
   * layouts and widgets, so the editor never offers ready-made templates.
   * Absent on every site saved before this existed, which behaves as before.
   */
  buildMode?: 'custom'
  /**
   * Drawn above every page. Held here rather than inside each page for the same
   * reason a PHP site keeps one header.php: edit the logo once and it changes
   * everywhere, instead of once per page and eventually inconsistently.
   */
  header?: BlockConfig[]
  pages?: PageConfig[]
  /** The active page's blocks, mirrored for anything that predates pages. */
  blocks: BlockConfig[]
  /** Drawn below every page. */
  footer?: BlockConfig[]
  theme?: Partial<ThemeConfig>
  /**
   * The palette the template shipped with, kept so "reset" has something to
   * return to. Captured on first edit for sites saved before it existed.
   */
  themeDefaults?: Partial<ThemeConfig>
  /** Theme colours for imported HTML designs, which have no theme of their own. */
  originalTheme?: OriginalTheme
  /** Set only while one page is being exported, so the exporter knows that page's colours. */
  pageColors?: PageColors
}

/** Which part of the site the editor is currently working on. */
export type SiteRegion = 'header' | 'page' | 'footer'

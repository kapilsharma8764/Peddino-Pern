import type { LayoutDef, RowDef, SlotDef } from '../types'

/**
 * Fixed page layouts. Each is a list of rows, each row a few slots; a widget
 * from the library goes into every slot. The `accepts` lists name real widget
 * types, ordered by how well they fit.
 */

const slot = (name: string, label: string, accepts: string[], def?: string): SlotDef => ({ name, label, accepts, default: def ?? accepts[0] })
const full = (id: string, label: string, accepts: string[], def?: string): RowDef => ({ id, label, kind: 'full', slots: [slot('widget', label, accepts, def)] })

const HEADINGS = ['heading', 'banner', 'rich-text', 'paragraph', 'highlight-text']
const HERO = ['hero', 'banner', 'slider', 'video', 'full-height-section', 'promo-banner']
const FEATURES = ['features', 'feature-box', 'icon-box', 'use-cases', 'services-grid', 'steps', 'process', 'trust-badges']
const CTA = ['cta', 'banner', 'promo-banner', 'sticky-cta-bar', 'newsletter']
const TESTIMONIALS = ['testimonials', 'testimonial', 'testimonial-carousel', 'press-mentions', 'logocloud']
const CONTENT = ['content', 'rich-text', 'paragraph', 'quote', 'timeline', 'image-box', 'heading']
const IMAGE = ['image', 'gallery', 'responsive-image', 'media-card', 'before-after', 'video', 'carousel']
const CARDS = ['icon-box', 'image-box', 'service-card', 'feature-box', 'media-card', 'team-member', 'product-card', 'blog-card', 'pricing-card', 'testimonial']
const GALLERY = ['gallery', 'masonry-gallery', 'lightbox-gallery', 'gallery-filter', 'carousel', 'logo-carousel']
const TEAM = ['team', 'team-member', 'client-logos', 'awards-list']
const STATS = ['stats', 'animated-counter', 'counter', 'logocloud', 'awards-list']
const PRICING = ['pricing', 'pricing-card', 'pricing-toggle', 'comparison-table', 'service-price-list']
const FAQ = ['faq', 'accordion', 'collapse', 'tabs']
const FORMS = ['contact', 'form-container', 'appointment-request', 'newsletter', 'job-application-form', 'rsvp-form']
const MAPS = ['map', 'office-locations', 'hours', 'business-card', 'service-areas']
const SIDEBAR = ['category-list', 'post-list', 'archive-list', 'tags', 'social-share', 'newsletter', 'author-box', 'table-of-contents']
const BLOG_MAIN = ['blog-grid', 'post-list', 'featured-post', 'blog-card', 'related-posts']
const PRODUCT_GRID = ['product-grid', 'products', 'product-list', 'category-grid', 'related-products']

const cardRow = (id: string, label: string, accepts: string[], def: string): RowDef => ({
  id,
  label,
  kind: 'grid',
  slots: [1, 2, 3, 4].map((n) => slot(`card-${n}`, `Card ${n}`, accepts, def)),
})

const none = { reverse: false, columns: false, sidebar: false }

export const layouts: LayoutDef[] = [
  {
    id: 'home', label: 'Home', pageName: 'Home', slug: '', description: 'Hero, features, about preview, services, testimonials and a call to action.',
    rows: [
      full('hero', 'Hero', HERO, 'hero'),
      full('features', 'Features', FEATURES, 'features'),
      { id: 'about', label: 'About preview', kind: 'split', slots: [slot('left', 'Left', CONTENT, 'content'), slot('right', 'Right', IMAGE, 'image')] },
      full('services', 'Services', ['services-grid', 'features', 'service-card', 'use-cases'], 'services-grid'),
      full('testimonials', 'Testimonials', TESTIMONIALS, 'testimonials'),
      full('cta', 'Call to action', CTA, 'cta'),
    ],
    defaults: {}, supports: { reverse: true, columns: false, sidebar: false },
  },
  {
    id: 'about', label: 'About', pageName: 'About', slug: 'about', description: 'Content beside an image, then the team and key numbers.',
    rows: [
      { id: 'story', label: 'Our story', kind: 'split', slots: [slot('left', 'Content', CONTENT, 'content'), slot('right', 'Image', IMAGE, 'image')] },
      full('team', 'Team', TEAM, 'team'),
      full('stats', 'Stats', STATS, 'stats'),
    ],
    defaults: {}, supports: { reverse: true, columns: false, sidebar: false },
  },
  {
    id: 'services', label: 'Services', pageName: 'Services', slug: 'services', description: 'A heading, a 2, 3 or 4 column card grid and a call to action.',
    rows: [full('heading', 'Heading', HEADINGS, 'heading'), cardRow('cards', 'Service cards', CARDS, 'service-card'), full('cta', 'Call to action', CTA, 'cta')],
    defaults: { columns: 3 }, supports: { reverse: false, columns: true, sidebar: false },
  },
  {
    id: 'portfolio', label: 'Portfolio / Gallery', pageName: 'Portfolio', slug: 'portfolio', description: 'A heading, a masonry or grid gallery and a call to action.',
    rows: [full('heading', 'Heading', HEADINGS, 'heading'), full('gallery', 'Gallery', GALLERY, 'gallery'), full('cta', 'Call to action', CTA, 'cta')],
    defaults: {}, supports: none,
  },
  {
    id: 'blog-list', label: 'Blog list', pageName: 'Blog', slug: 'blog', description: 'Posts on the left, a sidebar on the right.',
    rows: [{ id: 'main', label: 'Posts and sidebar', kind: 'sidebar', slots: [slot('main', 'Main content', BLOG_MAIN, 'blog-grid'), slot('side', 'Sidebar', SIDEBAR, 'category-list')] }],
    defaults: { sidebar: 'right' }, supports: { reverse: false, columns: false, sidebar: true },
  },
  {
    id: 'blog-detail', label: 'Blog article', pageName: 'Article', slug: 'article', description: 'An article with a sidebar.',
    rows: [{ id: 'main', label: 'Article and sidebar', kind: 'sidebar', slots: [slot('main', 'Article', ['content', 'rich-text', 'featured-post', 'paragraph'], 'content'), slot('side', 'Sidebar', ['related-posts', ...SIDEBAR], 'related-posts')] }],
    defaults: { sidebar: 'right' }, supports: { reverse: false, columns: false, sidebar: true },
  },
  {
    id: 'pricing', label: 'Pricing', pageName: 'Pricing', slug: 'pricing', description: 'A heading, pricing cards and a FAQ.',
    rows: [full('heading', 'Heading', HEADINGS, 'heading'), full('plans', 'Pricing cards', PRICING, 'pricing'), full('faq', 'FAQ', FAQ, 'faq')],
    defaults: {}, supports: none,
  },
  {
    id: 'contact', label: 'Contact', pageName: 'Contact', slug: 'contact', description: 'A contact form beside a map or contact details.',
    rows: [{ id: 'main', label: 'Form and map', kind: 'split', slots: [slot('left', 'Form', FORMS, 'contact'), slot('right', 'Map / info', MAPS, 'map')] }],
    defaults: {}, supports: { reverse: true, columns: false, sidebar: false },
  },
  {
    id: 'faq', label: 'FAQ', pageName: 'FAQ', slug: 'faq', description: 'A heading and an accordion.',
    rows: [full('heading', 'Heading', HEADINGS, 'heading'), full('faq', 'Questions', FAQ, 'faq')],
    defaults: {}, supports: none,
  },
  {
    id: 'team', label: 'Team', pageName: 'Team', slug: 'team', description: 'A heading and the team grid.',
    rows: [full('heading', 'Heading', HEADINGS, 'heading'), full('team', 'Team', TEAM, 'team')],
    defaults: {}, supports: none,
  },
  {
    id: 'product-list', label: 'Product list', pageName: 'Shop', slug: 'shop', description: 'A filter sidebar beside the product grid.',
    rows: [{ id: 'main', label: 'Products and filters', kind: 'sidebar', slots: [slot('main', 'Product grid', PRODUCT_GRID, 'product-grid'), slot('side', 'Filters', ['category-list', 'tags', 'search-form', 'category-card', 'free-shipping-progress'], 'category-list')] }],
    defaults: { sidebar: 'left' }, supports: { reverse: false, columns: false, sidebar: true },
  },
  {
    id: 'product-detail', label: 'Product detail', pageName: 'Product', slug: 'product', description: 'A gallery beside the product information.',
    rows: [
      { id: 'main', label: 'Gallery and info', kind: 'split', slots: [slot('left', 'Gallery', ['product-gallery', 'image', 'gallery', 'carousel'], 'product-gallery'), slot('right', 'Product info', ['product-description', 'product-title', 'product-price', 'add-to-cart', 'product-tabs'], 'product-description')] },
      full('related', 'Related products', ['related-products', 'product-grid', 'products'], 'related-products'),
    ],
    defaults: {}, supports: { reverse: true, columns: false, sidebar: false },
  },
  {
    id: 'testimonials', label: 'Testimonials', pageName: 'Testimonials', slug: 'testimonials', description: 'A heading and customer testimonials.',
    rows: [full('heading', 'Heading', HEADINGS, 'heading'), full('quotes', 'Testimonials', TESTIMONIALS, 'testimonials')],
    defaults: {}, supports: none,
  },
  {
    id: '404', label: '404', pageName: 'Not found', slug: '404', description: 'The page shown for a missing address.',
    rows: [full('message', 'Message', ['heading', 'banner', 'content', 'alert'], 'heading'), full('back', 'Link home', ['button', 'cta', 'back-to-top'], 'button')],
    defaults: {}, supports: none,
  },
]

export const layoutMap = new Map(layouts.map((layout) => [layout.id, layout]))
export const slotKey = (rowId: string, slotName: string) => `${rowId}.${slotName}`

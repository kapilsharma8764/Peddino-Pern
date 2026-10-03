import type { BlockType } from '@/blocks/types'
import { samplePhoto, samplePhotos } from './sample-photos'
import { defaultHours } from '@/blocks/hours/hours-data'
import { additionalWidgets } from '@/widgets/additional'
import { functionalWidgets } from '@/widgets/catalogue'

export interface BlockMeta {
  type: BlockType
  label: string
  description: string
  category: string
  variants: string[]
  defaultProps: Record<string, unknown>
}

export const blockMetadata: BlockMeta[] = [
  {
    type: 'navbar',
    label: 'Navbar',
    description: 'The header: logo, menu and a button. Shown on every page.',
    category: 'Navigation',
    variants: ['default', 'centered', 'stacked', 'stacked-pipes', 'contact', 'burger', 'split-center', 'icons', 'topbar'],
    defaultProps: {
      logo: 'Brand',
      logoImage: '',
      links: ['Home', 'About', 'Services', 'Contact'],
      ctaText: 'Get in touch',
    },
  },
  {
    type: 'hero',
    label: 'Hero',
    description: 'Full-width hero section with headline and CTAs',
    category: 'Hero',
    variants: ['centered', 'split', 'photo', 'gradient', 'minimal'],
    defaultProps: {
      headline: 'Your headline here',
      subheadline: 'One or two lines saying what you do and who you do it for.',
      primaryCta: 'Get in touch',
      secondaryCta: 'Learn more',
      // A photograph rather than an empty string: a hero with no picture is
      // the difference between a website and a wireframe, and the owner
      // replaces it with their own in one click.
      image: samplePhoto(samplePhotos.workspace),
    },
  },
  {
    type: 'features',
    label: 'Features',
    description: 'Feature showcase with icon cards',
    category: 'Content',
    variants: ['grid', 'list', 'alternating'],
    defaultProps: { title: 'Features', subtitle: 'Everything you need', items: [{ icon: 'Zap', title: 'Fast', description: 'Lightning fast performance' }, { icon: 'Shield', title: 'Secure', description: 'Enterprise-grade security' }, { icon: 'Globe', title: 'Global', description: 'Available worldwide' }] },
  },
  {
    type: 'pricing',
    label: 'Pricing',
    description: 'Pricing tiers with feature comparison',
    category: 'Commerce',
    variants: ['simple', 'comparison'],
    defaultProps: { title: 'Pricing', subtitle: 'Choose the plan that fits your needs' },
  },
  {
    type: 'cta',
    label: 'Call to Action',
    description: 'Conversion-focused section with CTA button',
    category: 'Conversion',
    variants: ['simple', 'split'],
    defaultProps: { headline: 'Ready to get started?', subheadline: 'Start building today.', buttonText: 'Start Free' },
  },
  {
    type: 'footer',
    label: 'Footer',
    description: 'The footer: logo, links and copyright. Shown on every page.',
    category: 'Navigation',
    variants: ['simple', 'multi-column', 'minimal', 'inline', 'centered', 'columns', 'newsletter'],
    defaultProps: { logo: 'Brand', copyright: '2026 Brand. All rights reserved.', links: ['Privacy', 'Terms'] },
  },
  {
    type: 'testimonials',
    label: 'Testimonials',
    description: 'Customer testimonials with quotes and ratings',
    category: 'Social Proof',
    variants: ['cards', 'carousel', 'spotlight'],
    defaultProps: { title: 'What our customers say' },
  },
  {
    type: 'stats',
    label: 'Stats',
    description: 'Key metrics and statistics display',
    category: 'Social Proof',
    variants: ['grid', 'bar', 'counter'],
    defaultProps: { title: 'By the numbers' },
  },
  {
    type: 'faq',
    label: 'FAQ',
    description: 'Frequently asked questions accordion',
    category: 'Content',
    variants: ['accordion'],
    defaultProps: { title: 'Frequently Asked Questions' },
  },
  {
    type: 'team',
    label: 'Team',
    description: 'Team member grid with photos and roles',
    category: 'Content',
    variants: ['grid'],
    defaultProps: { title: 'Meet the Team' },
  },
  {
    type: 'contact',
    label: 'Contact',
    description: 'Contact form with name, email, and message',
    category: 'Forms',
    variants: ['form'],
    defaultProps: { title: 'Get in Touch', subtitle: "We'd love to hear from you." },
  },
  {
    type: 'newsletter',
    label: 'Newsletter',
    description: 'Email subscription form with social proof',
    category: 'Conversion',
    variants: ['simple'],
    defaultProps: { title: 'Stay in the loop', subtitle: 'Get updates on new features.', buttonText: 'Subscribe' },
  },
  {
    type: 'logocloud',
    label: 'Logo Cloud',
    description: 'Company logos with hover effects',
    category: 'Social Proof',
    variants: ['default'],
    defaultProps: { title: 'Trusted by leading companies' },
  },
  {
    type: 'content',
    label: 'Content',
    description: 'Rich text content section',
    category: 'Content',
    variants: ['prose', 'columns', 'highlight'],
    defaultProps: { body: '## Getting Started\n\nWrite your content here. Supports **bold**, *italic*, and lists.\n\n- First item\n- Second item\n- Third item' },
  },
  {
    type: 'image',
    label: 'Image',
    description: 'Image with text overlay or side-by-side layout',
    category: 'Media',
    variants: ['hero-image', 'side-by-side', 'grid'],
    defaultProps: {
      title: 'Visual Storytelling',
      subtitle: 'A picture is worth a thousand words.',
      imageSide: 'left',
      // Without a source the widget drew nothing at all, so dragging "Image"
      // onto the page appeared to do nothing.
      src: samplePhoto(samplePhotos.meeting),
      alt: 'People talking across a desk',
    },
  },
  {
    type: 'video',
    label: 'Video',
    description: 'Embedded YouTube or Vimeo video',
    category: 'Media',
    variants: ['youtube', 'vimeo'],
    defaultProps: { url: '', title: 'Watch Our Story' },
  },
  {
    type: 'gallery',
    label: 'Gallery',
    description: 'Image gallery in grid or masonry layout',
    category: 'Media',
    variants: ['grid', 'masonry'],
    defaultProps: { title: 'Gallery' },
  },
  {
    type: 'map',
    label: 'Map',
    description: 'Google map showing where the business is',
    category: 'Contact',
    variants: ['full', 'side-by-side'],
    defaultProps: {
      title: 'Find us',
      address: '',
      timing: 'Mon–Sat, 9 AM – 7 PM',
      height: 360,
    },
  },
  {
    type: 'whatsapp',
    label: 'WhatsApp button',
    description: 'Chat button that opens WhatsApp',
    category: 'Contact',
    variants: ['floating', 'inline'],
    defaultProps: {
      number: '',
      countryCode: '91',
      label: 'Chat with us',
      message: 'Hello! I would like to know more.',
      side: 'right',
    },
  },
  {
    type: 'chart',
    label: 'Chart',
    description: 'Numbers drawn as bars, columns or a donut',
    category: 'Content',
    variants: ['bars', 'columns', 'donut'],
    defaultProps: {
      title: 'Where our work comes from',
      subtitle: 'A breakdown of last year',
      items: [
        { label: 'Repeat customers', value: '62%', color: '' },
        { label: 'Referrals', value: '24%', color: '' },
        { label: 'Online enquiries', value: '14%', color: '' },
      ],
    },
  },
  {
    type: 'slider',
    label: 'Front slider',
    description: 'Photographs cycling across the top, with a heading on each',
    category: 'Media',
    variants: ['fade'],
    defaultProps: {
      autoplay: true,
      interval: 6,
      height: 520,
      slides: [
        {
          image: '',
          heading: 'Welcome to our business',
          text: 'A line about what you do and why people come to you.',
          buttonText: 'Get in touch',
          buttonUrl: '#',
        },
      ],
    },
  },
  {
    type: 'products',
    label: 'Products & prices',
    description: 'What you sell, with a photo and a price',
    category: 'Content',
    variants: ['cards', 'list'],
    defaultProps: {
      title: 'What we offer',
      subtitle: '',
      items: [
        { image: '', name: 'First item', description: 'A line about it.', price: '', badge: '' },
      ],
    },
  },
  {
    type: 'hours',
    label: 'Opening hours',
    description: 'A row per day, with today marked',
    category: 'Contact',
    variants: ['table'],
    defaultProps: {
      title: 'Opening hours',
      note: 'Closed on public holidays.',
      highlightToday: true,
      rows: defaultHours,
    },
  },
  {
    type: 'divider',
    label: 'Divider',
    description: 'Visual separator between sections',
    category: 'Layout',
    variants: ['line', 'space', 'dots'],
    defaultProps: { height: 60, width: 'full' },
  },
  {
    type: 'banner',
    label: 'Banner',
    description: 'Announcement bar or ribbon',
    category: 'Content',
    variants: ['ribbon', 'bar'],
    defaultProps: { text: 'New: We just launched v2.0!', linkText: 'Learn more' },
  },
  {
    type: 'container',
    label: 'Container',
    description: 'Holds other widgets in a row, column or grid',
    category: 'Layout',
    variants: ['flex', 'grid'],
    defaultProps: {
      direction: 'row',
      gap: 24,
      align: 'stretch',
      justify: 'start',
      columns: 2,
      wrap: true,
    },
  },
  ...functionalWidgets.map(widget => ({ ...widget, type: widget.type as BlockType })),
  ...additionalWidgets.map(({ type, label, description, category, variants, defaultProps }) => ({
    type,
    label,
    description,
    category,
    variants,
    defaultProps,
  })),
]

export const categories = ['Basic','Layout','Navigation','Media','Forms','Interactive','Marketing','Business','Education','Blog','Ecommerce','Social','Data','Advanced']
const categoryAliases: Record<string,string> = {Hero:'Marketing',Content:'Basic',Commerce:'Marketing',Conversion:'Marketing','Social Proof':'Business',Contact:'Business'}
const typeCategories: Partial<Record<BlockType,string>> = {features:'Marketing',pricing:'Marketing',cta:'Marketing',testimonials:'Business',stats:'Business',faq:'Interactive',team:'Business',newsletter:'Forms',logocloud:'Business',products:'Ecommerce',chart:'Data',table:'Data',tabs:'Interactive',accordion:'Interactive','social-icons':'Social',whatsapp:'Social',steps:'Business',banner:'Marketing'}
for (const widget of blockMetadata) widget.category = typeCategories[widget.type] ?? categoryAliases[widget.category] ?? widget.category

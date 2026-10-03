import type { SiteTypeDef, SiteTypeId } from '../types'

/**
 * The twelve kinds of website, each with the pages it starts with and the
 * widgets that suit it best. `fit` keys are `<layout>.<row>.<slot>`.
 */
export const siteTypes: SiteTypeDef[] = [
  { id: 'landing', label: 'Landing Page', description: 'One focused page that sells a single offer.', icon: 'Rocket',
    pages: ['home', 'contact', '404'], footer: 'footer:minimal',
    fit: { 'home.hero.widget': 'hero:gradient', 'home.features.widget': 'features:grid', 'home.cta.widget': 'cta' } },
  { id: 'portfolio', label: 'Portfolio', description: 'Show your best work in a gallery.', icon: 'Palette',
    pages: ['home', 'portfolio', 'about', 'contact', '404'], footer: 'footer:minimal',
    fit: { 'home.hero.widget': 'hero:minimal', 'home.services.widget': 'gallery', 'portfolio.gallery.widget': 'masonry-gallery' } },
  { id: 'business', label: 'Business / Company', description: 'A professional site for a company or practice.', icon: 'Building2',
    pages: ['home', 'about', 'services', 'team', 'contact', '404'], footer: 'footer:multi-column',
    fit: { 'home.hero.widget': 'hero:split' } },
  { id: 'ecommerce', label: 'E-commerce', description: 'An online shop with products and product pages.', icon: 'ShoppingBag',
    pages: ['home', 'product-list', 'product-detail', 'contact', '404'], footer: 'footer:multi-column',
    fit: { 'home.hero.widget': 'hero:photo', 'home.services.widget': 'products', 'home.features.widget': 'trust-badges', 'contact.main.left': 'contact' } },
  { id: 'blog', label: 'Blog / News', description: 'Articles, categories and a newsletter.', icon: 'Newspaper',
    pages: ['home', 'blog-list', 'blog-detail', 'about', 'contact', '404'], footer: 'footer:simple',
    fit: { 'home.hero.widget': 'hero:minimal', 'home.services.widget': 'blog-grid', 'home.cta.widget': 'newsletter' } },
  { id: 'restaurant', label: 'Restaurant / Cafe', description: 'Menu, opening hours and reservations.', icon: 'UtensilsCrossed',
    pages: ['home', 'portfolio', 'about', 'contact', '404'], footer: 'footer:multi-column',
    fit: { 'home.hero.widget': 'hero:photo', 'home.services.widget': 'service-price-list', 'contact.main.right': 'hours', 'portfolio.heading.widget': 'heading' } },
  { id: 'education', label: 'Education / Course', description: 'Courses, teachers and enrolment.', icon: 'GraduationCap',
    pages: ['home', 'about', 'services', 'pricing', 'faq', 'contact', '404'], footer: 'footer:multi-column',
    fit: { 'home.hero.widget': 'hero:split', 'about.team.widget': 'team' } },
  { id: 'realestate', label: 'Real Estate', description: 'Listings, agents and enquiries.', icon: 'Home',
    pages: ['home', 'portfolio', 'about', 'team', 'contact', '404'], footer: 'footer:multi-column',
    fit: { 'home.hero.widget': 'hero:photo', 'home.services.widget': 'product-grid', 'portfolio.gallery.widget': 'gallery' } },
  { id: 'agency', label: 'Agency / Services', description: 'Sell your services and show case studies.', icon: 'Briefcase',
    pages: ['home', 'services', 'portfolio', 'pricing', 'team', 'contact', '404'], footer: 'footer:multi-column',
    fit: { 'home.hero.widget': 'hero:gradient' } },
  { id: 'event', label: 'Event / Wedding', description: 'Date, schedule, gallery and RSVP.', icon: 'PartyPopper',
    pages: ['home', 'about', 'portfolio', 'faq', 'contact', '404'], footer: 'footer:minimal',
    fit: { 'home.hero.widget': 'hero:photo', 'home.services.widget': 'upcoming-events', 'contact.main.left': 'rsvp-form' } },
  { id: 'ngo', label: 'NGO / Charity', description: 'Tell your story and collect donations.', icon: 'HeartHandshake',
    pages: ['home', 'about', 'team', 'faq', 'contact', '404'], footer: 'footer:multi-column',
    fit: { 'home.hero.widget': 'hero:centered', 'home.services.widget': 'donation-progress', 'home.cta.widget': 'cta' } },
  { id: 'personal', label: 'Personal / Resume', description: 'An online resume or personal profile.', icon: 'User',
    pages: ['home', 'about', 'portfolio', 'contact', '404'], footer: 'footer:minimal',
    fit: { 'home.hero.widget': 'hero:minimal', 'about.story.right': 'image', 'about.stats.widget': 'stats' } },
]

export const siteTypeMap = new Map<SiteTypeId, SiteTypeDef>(siteTypes.map((type) => [type.id, type]))

export const headerChoices = [
  { ref: 'navbar:default', label: 'Classic', description: 'Logo left, links right.' },
  { ref: 'navbar:centered', label: 'Centered', description: 'Logo centred above the links.' },
]
export const footerChoices = [
  { ref: 'footer:simple', label: 'Simple', description: 'One line with links.' },
  { ref: 'footer:multi-column', label: 'Multi-column', description: 'Columns of links and contact.' },
  { ref: 'footer:minimal', label: 'Minimal', description: 'Copyright only.' },
]

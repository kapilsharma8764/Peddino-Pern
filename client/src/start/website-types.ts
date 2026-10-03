import type { BusinessProfile, WebsiteCategory } from '@/onboarding/profile'

/**
 * The kinds of website someone can say they are building.
 *
 * There are more of these than the builder has template categories, so each one
 * is mapped onto the nearest existing category (`category`), which is what the
 * template gallery filters on, and carries its own keywords, which rank the
 * most fitting templates first inside that category.
 */
export interface WebsiteTypeDef {
  id: string
  name: string
  hint: string
  /** lucide-react icon name, resolved where the card is drawn. */
  icon: string
  category: WebsiteCategory
  websiteType?: BusinessProfile['websiteType']
  keywords: string[]
  /** Pages that usually suit this kind of site, ticked by default in "Create a site". */
  pages: string[]
  /** Starting designs that suit it, shown first. */
  designs: string[]
}

const t = (
  id: string, name: string, hint: string, icon: string, category: WebsiteCategory,
  keywords: string[], pages: string[], designs: string[], websiteType?: BusinessProfile['websiteType'],
): WebsiteTypeDef => ({ id, name, hint, icon, category, keywords, pages, designs, ...(websiteType ? { websiteType } : {}) })

const BASIC = ['About', 'Services', 'Contact']

export const websiteTypes: WebsiteTypeDef[] = [
  t('business', 'Business', 'A company, shop or local service', 'Briefcase', 'professional', ['business', 'corporate', 'company'], BASIC, ['modern-business', 'professional-corporate', 'clean-minimal'], 'business'),
  t('agency', 'Agency', 'Design, marketing or digital agency', 'Rocket', 'professional', ['agency', 'creative', 'studio', 'marketing'], ['About', 'Services', 'Portfolio', 'Team', 'Contact'], ['bold-agency', 'creative-portfolio', 'dark-modern'], 'business'),
  t('portfolio', 'Portfolio', 'Show your work and projects', 'Palette', 'professional', ['portfolio', 'creative', 'resume', 'personal'], ['About', 'Portfolio', 'Contact'], ['creative-portfolio', 'clean-minimal', 'dark-modern']),
  t('freelancer', 'Freelancer', 'Offer your skills and services', 'User', 'professional', ['freelance', 'portfolio', 'personal', 'resume'], ['About', 'Services', 'Portfolio', 'Contact'], ['clean-minimal', 'creative-portfolio', 'light-elegant']),
  t('education', 'Education', 'Courses, training, learning', 'GraduationCap', 'education', ['education', 'learn', 'course', 'academy'], ['About', 'Courses', 'Admission', 'Contact'], ['education', 'modern-business', 'light-elegant'], 'education'),
  t('school', 'School', 'Nursery to senior school', 'School', 'education', ['school', 'academy', 'kids', 'education'], ['About', 'Admission', 'Gallery', 'Contact'], ['education', 'light-elegant', 'modern-business'], 'education'),
  t('college', 'College', 'College or university', 'Landmark', 'education', ['college', 'university', 'campus', 'education'], ['About', 'Courses', 'Admission', 'Contact'], ['education', 'professional-corporate', 'modern-business'], 'education'),
  t('coaching', 'Coaching', 'Coaching classes and tutoring', 'Presentation', 'education', ['coaching', 'tutor', 'class', 'education', 'learn'], ['About', 'Courses', 'Contact', 'FAQ'], ['education', 'modern-business', 'clean-minimal'], 'education'),
  t('restaurant', 'Restaurant', 'Dine-in, takeaway or catering', 'UtensilsCrossed', 'food', ['restaurant', 'food', 'dining', 'menu', 'taste'], ['About', 'Menu', 'Gallery', 'Contact'], ['restaurant', 'light-elegant', 'dark-modern']),
  t('cafe', 'Cafe', 'Coffee shop or bakery', 'Coffee', 'food', ['cafe', 'coffee', 'bakery', 'food'], ['About', 'Menu', 'Gallery', 'Contact'], ['restaurant', 'light-elegant', 'clean-minimal']),
  t('hotel', 'Hotel', 'Hotel, resort or stay', 'Hotel', 'other', ['hotel', 'resort', 'stay', 'travel'], ['About', 'Rooms', 'Gallery', 'Contact'], ['light-elegant', 'restaurant', 'modern-business']),
  t('travel', 'Travel', 'Tours and trips', 'Plane', 'other', ['travel', 'tour', 'trip', 'holiday'], ['About', 'Services', 'Gallery', 'Contact'], ['modern-business', 'bold-agency', 'light-elegant']),
  t('realestate', 'Real Estate', 'Properties, builders, rentals', 'Building2', 'realestate', ['real estate', 'property', 'home', 'estate'], ['About', 'Services', 'Gallery', 'Contact'], ['professional-corporate', 'modern-business', 'light-elegant']),
  t('ecommerce', 'E-commerce', 'An online shop', 'ShoppingBag', 'other', ['shop', 'store', 'ecommerce', 'product', 'fashion'], ['About', 'Shop', 'Contact', 'FAQ'], ['ecommerce', 'clean-minimal', 'bold-agency']),
  t('fashion', 'Fashion', 'Clothing, boutique or jewellery', 'Shirt', 'other', ['fashion', 'boutique', 'style', 'shop', 'store'], ['About', 'Shop', 'Gallery', 'Contact'], ['ecommerce', 'light-elegant', 'dark-modern']),
  t('beauty', 'Beauty / Salon', 'Salon, spa, barber', 'Scissors', 'beauty', ['beauty', 'salon', 'spa', 'barber'], ['About', 'Services', 'Gallery', 'Contact'], ['light-elegant', 'clean-minimal', 'bold-agency']),
  t('healthcare', 'Healthcare', 'Hospitals, diagnostics, wellness', 'HeartPulse', 'health', ['health', 'medical', 'hospital', 'care'], ['About', 'Services', 'Team', 'Contact'], ['professional-corporate', 'modern-business', 'clean-minimal']),
  t('doctor', 'Doctor / Clinic', 'A doctor or dental clinic', 'Stethoscope', 'health', ['doctor', 'clinic', 'dental', 'medical', 'health'], ['About', 'Services', 'Contact', 'FAQ'], ['professional-corporate', 'clean-minimal', 'modern-business']),
  t('fitness', 'Fitness / Gym', 'Gym, yoga or sports', 'Dumbbell', 'fitness', ['fitness', 'gym', 'yoga', 'sport'], ['About', 'Services', 'Pricing', 'Contact'], ['dark-modern', 'bold-agency', 'modern-business']),
  t('construction', 'Construction', 'Builders and contractors', 'Hammer', 'home-services', ['construction', 'builder', 'contractor', 'repair'], ['About', 'Services', 'Gallery', 'Contact'], ['professional-corporate', 'bold-agency', 'modern-business']),
  t('architecture', 'Architecture', 'Architects and interior design', 'Ruler', 'home-services', ['architecture', 'interior', 'design', 'home'], ['About', 'Portfolio', 'Services', 'Contact'], ['clean-minimal', 'light-elegant', 'creative-portfolio']),
  t('photography', 'Photography', 'Photographers and studios', 'Camera', 'other', ['photo', 'photography', 'studio', 'wedding'], ['About', 'Gallery', 'Pricing', 'Contact'], ['creative-portfolio', 'dark-modern', 'light-elegant']),
  t('event', 'Event', 'Events, weddings and planners', 'PartyPopper', 'other', ['event', 'wedding', 'party', 'celebration'], ['About', 'Gallery', 'FAQ', 'Contact'], ['light-elegant', 'bold-agency', 'creative-portfolio']),
  t('ngo', 'NGO', 'Charity or non-profit', 'HeartHandshake', 'other', ['ngo', 'charity', 'non-profit', 'foundation'], ['About', 'Services', 'Team', 'Contact'], ['modern-business', 'education', 'light-elegant']),
  t('finance', 'Finance', 'Accounting, tax or consulting', 'Landmark', 'professional', ['finance', 'accounting', 'consult', 'legal', 'law'], ['About', 'Services', 'Team', 'Contact'], ['professional-corporate', 'modern-business', 'clean-minimal'], 'business'),
  t('technology', 'Technology / SaaS', 'Software, apps and IT', 'Cpu', 'professional', ['tech', 'software', 'saas', 'app', 'startup'], ['Features', 'Pricing', 'About', 'Contact'], ['startup-saas', 'dark-modern', 'modern-business'], 'technology'),
  t('blog', 'Blog', 'Articles and news', 'BookOpen', 'other', ['blog', 'news', 'magazine', 'article'], ['About', 'Blog', 'Contact'], ['clean-minimal', 'light-elegant', 'creative-portfolio']),
  t('personal', 'Personal', 'A personal site or resume', 'User', 'other', ['personal', 'resume', 'portfolio', 'profile'], ['About', 'Portfolio', 'Contact'], ['clean-minimal', 'creative-portfolio', 'light-elegant']),
  t('other', 'Other', 'Anything not listed here', 'LayoutGrid', 'other', [], BASIC, ['modern-business', 'clean-minimal', 'light-elegant']),
]

export const websiteTypeMap = new Map(websiteTypes.map((type) => [type.id, type]))

export function matchesTypeSearch(type: WebsiteTypeDef, query: string): boolean {
  const q = query.trim().toLowerCase()
  return !q || `${type.name} ${type.hint} ${type.keywords.join(' ')}`.toLowerCase().includes(q)
}

/** How well a template's text fits the chosen type. Higher sorts earlier; 0 means no keyword matched. */
export function typeScore(type: WebsiteTypeDef | undefined, text: string): number {
  if (!type) return 0
  const lower = text.toLowerCase()
  return type.keywords.reduce((score, keyword, i) => (lower.includes(keyword) ? score + (type.keywords.length - i) : score), 0)
}

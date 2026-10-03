/**
 * Everything the builder asks a business before it shows them a template.
 *
 * These answers are collected once and then pushed into the site — the phone
 * number reaches the footer and the contact section, the logo reaches the
 * header, the business name reaches every heading that mentions it. Asking
 * twice is the fastest way to make the flow feel long, so nothing here is
 * asked again later.
 */

/**
 * The trades this builder actually has a design for, named the way the
 * market names them rather than lumped into one catch-all "Business" bucket.
 *
 * The four-choice version this replaced hid a restaurant, a salon, a gym, a
 * clinic, a solar installer and a property dealer all behind a single
 * "Business" card, so a shop owner had no way to tell the builder what they
 * actually ran. Each of these instead maps to its own content and its own
 * designs, so picking one is picking a real starting point, not a guess.
 */
export type WebsiteCategory =
  | 'education'
  | 'food'
  | 'beauty'
  | 'fitness'
  | 'health'
  | 'home-services'
  | 'realestate'
  | 'professional'
  | 'other'

/** Every category but education sells either a product or a service. */
export type OfferKind = 'product' | 'services' | 'both'

export interface ContactDetails {
  mobile: string
  /** Whether the mobile number also takes WhatsApp — drives the chat button. */
  whatsapp: boolean
  altMobile: string
  email: string
  address: string
  /** A Google Maps share link or embed URL. */
  mapUrl: string
  officeTiming: string
}

export interface BusinessProfile {
  websiteType?: 'education' | 'business' | 'technology'

  category: WebsiteCategory | null
  offer: OfferKind | null

  name: string
  /** Wide logo shown in the header. */
  logo: string
  /** Square mark, used for the browser tab icon and small placements. */
  logoSquare: string
  slogan: string
  about: string
  /** Services or product details shown in the chosen template. */
  services: string
  /** Optional: joined onto the address wherever the site shows one. */
  city?: string
  country?: string
  /** Social profile links, one per line. */
  social?: string
  /** Wording of the main button, e.g. "Apply for admission". */
  ctaText?: string

  /**
   * Which of the template's pages to keep, matched loosely against each
   * page's name (so "About" also keeps a page titled "About Us"). Empty
   * means "keep everything the template ships with" — this is a trim, not a
   * requirement, so an empty answer never produces a site with no pages.
   */
  pages: string[]
  /** A `themePresets` id from `lib/theme-presets.ts`, or null to keep the template's own palette. */
  themePresetId: string | null

  contact: ContactDetails
}

export const emptyProfile: BusinessProfile = {
  category: null,
  offer: null,
  name: '',
  logo: '',
  logoSquare: '',
  slogan: '',
  about: '',
  pages: [],
  themePresetId: null,
  services: '',
  contact: {
    mobile: '',
    whatsapp: true,
    altMobile: '',
    email: '',
    address: '',
    mapUrl: '',
    officeTiming: '',
  },
}

/** The page choices offered in the setup wizard. "Home" is always included and not offered as a toggle. */
export const pageOptions = ['About', 'Services', 'Courses', 'Admission', 'Gallery', 'Contact', 'FAQ'] as const

/**
 * `icon` is a lucide-react component name, resolved where the option is
 * drawn rather than here — this file stays free of anything React so it can
 * be imported by plain logic like `from-description.ts` without pulling in
 * a UI library.
 */
export const categoryOptions: { value: WebsiteCategory; label: string; hint: string; icon: string }[] = [
  { value: 'education', label: 'Education', hint: 'School, coaching, training, courses', icon: 'GraduationCap' },
  { value: 'food', label: 'Food & Dining', hint: 'Restaurant, cafe, catering, cloud kitchen', icon: 'ChefHat' },
  { value: 'beauty', label: 'Beauty & Salon', hint: 'Salon, spa, barber, parlour', icon: 'Scissors' },
  { value: 'fitness', label: 'Fitness & Sports', hint: 'Gym, yoga studio, sports academy', icon: 'Dumbbell' },
  { value: 'health', label: 'Health & Clinic', hint: 'Clinic, dental, doctor, diagnostics', icon: 'Stethoscope' },
  { value: 'realestate', label: 'Real Estate', hint: 'Property dealer, builder, rentals', icon: 'Building2' },
  { value: 'home-services', label: 'Home & Construction', hint: 'Interior, construction, solar, cleaning', icon: 'Wrench' },
  { value: 'professional', label: 'Professional Services', hint: 'Agency, consulting, software, IT, CA, legal', icon: 'Briefcase' },
  { value: 'other', label: 'Something else', hint: 'Anything not listed here', icon: 'LayoutGrid' },
]

export const offerOptions: { value: OfferKind; label: string; hint: string }[] = [
  { value: 'product', label: 'Products', hint: 'You sell things people buy' },
  { value: 'services', label: 'Services', hint: 'You do work for people' },
  { value: 'both', label: 'Both', hint: 'Products and services' },
]

/**
 * True once the wizard has enough to build a site.
 *
 * Only the choices that change what gets built are required. A business with
 * no logo file to hand should still reach a template, so everything else is
 * optional and can be filled in later from the editor.
 */
export function isProfileComplete(profile: BusinessProfile): boolean {
  return Boolean(profile.category && profile.name.trim())
}

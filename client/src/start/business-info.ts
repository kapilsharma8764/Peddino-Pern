import type { BusinessProfile } from '@/onboarding/profile'

/** What is missing before the business-details screen can continue. */
export function businessInfoErrors(profile: BusinessProfile): { name?: string; about?: string } {
  const errors: { name?: string; about?: string } = {}
  if (!profile.name.trim()) errors.name = 'Enter your website or business name'
  if (!profile.about.trim()) errors.about = 'Add a short description'
  return errors
}

import { useEffect, useState } from 'react'
import seed from '@/data/seed/pricing_plans.json'
import { getJson, isObject, isStringList } from './http'

/**
 * Pricing plans from `/api/pricing`. There is no payment or subscription behind
 * them: each plan is a card (name, price text, features, a button that goes
 * somewhere). The bundled copy (the seed file) shows first and stays if the API
 * cannot answer, so the pricing page is never empty.
 */

export interface PricingPlan {
  slug: string
  name: string
  price: number | null
  currency: string
  /** What the card prints: "₹0", "Coming soon", "Let’s talk". */
  priceLabel: string
  billingPeriod: string | null
  description: string
  note: string
  features: string[]
  ctaLabel: string
  ctaTo: string
  featured: boolean
  comingSoon: boolean
  sortOrder: number
}

const isPlan = (item: unknown): item is PricingPlan =>
  isObject(item) && typeof item.slug === 'string' && typeof item.name === 'string' && typeof item.priceLabel === 'string' && isStringList(item.features) && typeof item.ctaTo === 'string' && typeof item.ctaLabel === 'string'

export const fallbackPlans: PricingPlan[] = (seed as unknown as PricingPlan[]).filter(isPlan)

export async function fetchPlans(signal?: AbortSignal): Promise<PricingPlan[]> {
  const body = await getJson<{ plans?: unknown }>('/api/pricing', { signal })
  if (!Array.isArray(body.plans) || !body.plans.every(isPlan)) throw new Error('Unexpected pricing')
  return body.plans
}

let known: PricingPlan[] | null = null

export function usePricing(): { plans: PricingPlan[]; status: 'loading' | 'ready' | 'fallback' } {
  const [state, setState] = useState<{ plans: PricingPlan[]; status: 'loading' | 'ready' | 'fallback' }>(() => (known ? { plans: known, status: 'ready' } : { plans: fallbackPlans, status: 'loading' }))
  useEffect(() => {
    if (known) return
    const controller = new AbortController()
    fetchPlans(controller.signal).then(
      (plans) => { known = plans; setState({ plans, status: 'ready' }) },
      () => { if (!controller.signal.aborted) setState((current) => ({ ...current, status: 'fallback' })) },
    )
    return () => controller.abort()
  }, [])
  return state
}

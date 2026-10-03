import type { ReactNode } from 'react'
import {
  Check, Download, Globe2, Heart, Inbox, LayoutGrid, LayoutTemplate, Layers3, MessageSquare, MonitorSmartphone,
  MousePointer2, Palette, PanelsTopLeft, Rocket, ShieldCheck, Sparkles, Type, Wand2, type LucideIcon,
} from 'lucide-react'
import { BRAND } from '@/brand'
import { listOf, textOf, type ContentSection } from '@/services/contentApi'

/** Small helpers for drawing database-managed marketing content. */

const ICONS: Record<string, LucideIcon> = {
  Check, Download, Globe2, Heart, Inbox, LayoutGrid, LayoutTemplate, Layers3, MessageSquare, MonitorSmartphone,
  MousePointer2, Palette, PanelsTopLeft, Rocket, ShieldCheck, Sparkles, Type, Wand2,
}

/** The icon names content may use (checked against the seed file by a test). */
export const iconNames = Object.keys(ICONS)

/** An icon by its name in the content; a spark when the name is not one we know. */
export function iconFor(name: unknown, size = 20): ReactNode {
  const Icon = ICONS[textOf(name)] ?? Sparkles
  return <Icon size={size} />
}

/** Fills the brand tokens content can use: {brand} (full name) and {short}. */
export const fill = (text: string) => text.replaceAll('{brand}', BRAND.name).replaceAll('{short}', BRAND.short)

export interface CardContent { icon?: string; title?: string; text?: string; linkLabel?: string; linkTo?: string }

export const cardItems = (section: ContentSection | undefined) =>
  listOf<CardContent>(section?.content.items).map((item) => ({ icon: iconFor(item.icon), title: textOf(item.title), text: textOf(item.text) }))

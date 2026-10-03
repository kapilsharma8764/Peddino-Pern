import { layoutMap, slotKey } from './registry/layouts'
import { siteTypeMap } from './registry/site-types'
import { defaultOptions, isKnownWidget } from './compile'
import type { LayoutDef, PageSpec, SiteSpec, SiteTypeId, WidgetRef } from './types'

/** The best-fit widget for a slot on a given kind of site. */
export function bestFit(type: SiteTypeId, layout: LayoutDef, rowId: string, slotName: string): WidgetRef {
  const row = layout.rows.find((entry) => entry.id === rowId)
  const slot = row?.slots.find((entry) => entry.name === slotName)
  const fitted = siteTypeMap.get(type)?.fit[`${layout.id}.${rowId}.${slotName}`]
  if (fitted && isKnownWidget(fitted)) return fitted
  return slot?.default ?? ''
}

/** A page with every slot filled by its best-fit widget — what "Quick Generate" does. */
export function quickPage(type: SiteTypeId, layoutId: string, existing?: PageSpec): PageSpec {
  const layout = layoutMap.get(layoutId)
  if (!layout) throw new Error(`Unknown layout: ${layoutId}`)
  const slots: Record<string, WidgetRef> = {}
  for (const row of layout.rows) for (const slot of row.slots) slots[slotKey(row.id, slot.name)] = bestFit(type, layout, row.id, slot.name)
  return {
    name: existing?.name ?? layout.pageName,
    slug: existing?.slug ?? layout.slug,
    layout: layout.id,
    options: existing?.options ?? defaultOptions(layout),
    slots,
    content: existing?.content,
    showInMenu: existing?.showInMenu,
  }
}

/** A complete site for a type: header, footer and every default page, filled in. */
export function quickSite(type: SiteTypeId, name = ''): SiteSpec {
  const def = siteTypeMap.get(type)
  if (!def) throw new Error(`Unknown site type: ${type}`)
  return {
    name,
    type,
    header: 'navbar:default',
    footer: def.footer,
    pages: def.pages.map((layoutId) => quickPage(type, layoutId)),
  }
}

/** Fills only the slots that are empty, leaving any widget the person chose. */
export function fillEmpty(spec: SiteSpec): SiteSpec {
  return {
    ...spec,
    pages: spec.pages.map((page) => {
      const filled = quickPage(spec.type, page.layout, page)
      return { ...page, slots: { ...filled.slots, ...Object.fromEntries(Object.entries(page.slots).filter(([, ref]) => ref)) } }
    }),
  }
}

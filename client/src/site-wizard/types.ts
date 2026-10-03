/**
 * The guided site builder's own data model.
 *
 * A `SiteSpec` is the whole site as the wizard sees it: a type, one header, one
 * footer and a list of pages, each page being a layout with a widget chosen for
 * every slot. `compile()` turns it into the editor's `SiteConfig`, and that one
 * config feeds the preview, the export and the drag-and-drop editor, so there
 * is a single source of truth.
 *
 * Widgets are referenced, never changed: a `WidgetRef` is a widget type, with an
 * optional variant (`"hero:split"`).
 */

export type WidgetRef = string

export type SiteTypeId =
  | 'landing' | 'portfolio' | 'business' | 'ecommerce' | 'blog' | 'restaurant'
  | 'education' | 'realestate' | 'agency' | 'event' | 'ngo' | 'personal'

/** How a row of slots is arranged on the page. */
export type RowKind = 'full' | 'split' | 'grid' | 'sidebar'

export interface SlotDef {
  name: string
  label: string
  /** Widget types that make sense here, shown first in the picker. */
  accepts: string[]
  /** The best-fit widget when nothing else is known. */
  default: WidgetRef
}

export interface RowDef {
  id: string
  label: string
  kind: RowKind
  slots: SlotDef[]
}

export type PageOptions = {
  /** Split rows: swap left and right. */
  reverse: boolean
  /** Grid rows: 2, 3 or 4 columns. */
  columns: 2 | 3 | 4
  /** Sidebar rows. */
  sidebar: 'left' | 'right' | 'none'
  /** Row ids in display order. */
  order: string[]
}

export interface LayoutDef {
  id: string
  label: string
  /** Name of the page created from this layout. */
  pageName: string
  slug: string
  description: string
  rows: RowDef[]
  defaults: Partial<PageOptions>
  /** Which of the options the page actually uses, so the UI can hide the rest. */
  supports: { reverse: boolean; columns: boolean; sidebar: boolean }
}

export interface PageSpec {
  name: string
  slug: string
  layout: string
  options: PageOptions
  /** Slot name (`"<rowId>.<slotName>"`) to the chosen widget. */
  slots: Record<string, WidgetRef>
  /** Text/image values poured into a slot's widget, only for props it already has. */
  content?: Record<string, Record<string, unknown>>
  showInMenu?: boolean
}

export interface SiteSpec {
  name: string
  type: SiteTypeId
  header: WidgetRef
  footer: WidgetRef
  pages: PageSpec[]
}

export interface SiteTypeDef {
  id: SiteTypeId
  label: string
  description: string
  /** lucide-react icon name. */
  icon: string
  /** Layout ids, in menu order. The first is the home page. */
  pages: string[]
  footer: WidgetRef
  /** `"<layoutId>.<rowId>.<slotName>"` to a widget, overriding the layout's own default. */
  fit: Record<string, WidgetRef>
}

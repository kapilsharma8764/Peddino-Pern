import type { BlockConfig } from '@/blocks/types'

/**
 * Header and footer layout presets.
 *
 * A preset only chooses a style (and a couple of settings that style needs).
 * The words stay the owner's: the logo, the menu and the button are never
 * overwritten. The header and footer are shared by every page, so applying a
 * preset changes the one shared block, and every page follows.
 */

export interface PresetDef {
  id: string
  label: string
  description: string
  variant: string
  /** Props the style relies on. Applied only where the block has none of its own. */
  props?: Record<string, unknown>
  /** Forced props, for settings that define the style (a column count). */
  force?: Record<string, unknown>
}

export const headerPresets: PresetDef[] = [
  { id: 'h1', label: 'Logo left, menu right', description: 'Logo, menu links and a button in one row.', variant: 'default' },
  { id: 'h2', label: 'Logo left, menu centre, button right', description: 'Three parts, evenly balanced.', variant: 'split-center' },
  { id: 'h3', label: 'Logo on top, menu below', description: 'Two rows: logo, then the menu.', variant: 'stacked' },
  { id: 'h4', label: 'Logo in the middle', description: 'Menu split to either side of a centred logo.', variant: 'centered' },
  { id: 'h5', label: 'Centred with dividers', description: 'Centred logo; menu links separated by lines.', variant: 'stacked-pipes' },
  { id: 'h6', label: 'Menu, phone and button', description: 'Adds a phone number beside the button.', variant: 'contact', props: { phone: '+00 000 000 000' } },
  { id: 'h7', label: 'Menu with icons', description: 'Search, account and cart icons at the end.', variant: 'icons' },
  { id: 'h8', label: 'Logo and menu button', description: 'A compact header with a hamburger menu.', variant: 'burger' },
  { id: 'h9', label: 'Top bar and header', description: 'A thin contact strip above the header.', variant: 'topbar', props: { topText: 'Welcome to our website', phone: '+00 000 000 000', email: 'hello@example.com' } },
]

export const footerPresets: PresetDef[] = [
  { id: 'f1', label: '1 column', description: 'Everything centred in one column.', variant: 'centered' },
  { id: 'f2', label: 'Logo and links in a row', description: 'Logo, page links and social links on one line.', variant: 'inline' },
  { id: 'f3', label: '2 columns', description: 'Logo and description beside one link column.', variant: 'columns', force: { columnCount: 1 } },
  { id: 'f4', label: '3 columns', description: 'Logo and description beside two link columns.', variant: 'columns', force: { columnCount: 2 } },
  { id: 'f5', label: 'Logo + 3 columns', description: 'Logo and description beside three link columns.', variant: 'columns', force: { columnCount: 3 } },
  { id: 'f6', label: '4 columns and bottom bar', description: 'Logo and four link columns, then a bottom bar.', variant: 'columns', force: { columnCount: 4 } },
  { id: 'f7', label: 'Newsletter row and columns', description: 'A sign-up row above the link columns.', variant: 'newsletter', force: { columnCount: 3 } },
  { id: 'f8', label: 'Simple', description: 'Logo, links and copyright.', variant: 'simple' },
  { id: 'f9', label: 'Minimal', description: 'Just the copyright line and links.', variant: 'minimal' },
]

/** The preset a block currently matches, if any. */
export function activePreset(presets: PresetDef[], block: BlockConfig | undefined): string | null {
  if (!block) return null
  const matches = presets.filter((preset) => preset.variant === block.variant)
  if (matches.length <= 1) return matches[0]?.id ?? null
  const count = Number(block.props.columnCount) || 3
  return matches.find((preset) => Number(preset.force?.columnCount) === count)?.id ?? matches[0].id
}

/** What a block's `variant` and props become when a preset is applied. */
export function presetPatch(preset: PresetDef, block: BlockConfig): { variant: string; props: Record<string, unknown> } {
  const props: Record<string, unknown> = { ...block.props }
  for (const [key, value] of Object.entries(preset.props ?? {})) {
    if (props[key] === undefined || props[key] === '') props[key] = value
  }
  Object.assign(props, preset.force ?? {})
  return { variant: preset.variant, props }
}

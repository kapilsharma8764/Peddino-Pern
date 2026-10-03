import { Monitor, RotateCcw, Smartphone, Tablet } from 'lucide-react'
import type { BlockConfig, BlockStyle, Breakpoint, StyleValues } from '@/blocks/types'
import { effectiveStyle, hasOverrides, isEmptyStyle } from '@/blocks/block-style'
import { useConfigStore } from '@/store/configStore'
import { useEditorStore } from '@/store/editorStore'
import { FieldRenderer } from './fields/FieldRenderer'
import { SectionColorsPanel } from './SectionColorsPanel'
import type { Field } from '@/widgets/field-types'

/**
 * Size, spacing and styling for whichever section is selected.
 *
 * This is the brief's "resize, reposition, style, font", built the way
 * Elementor builds it — controls that apply to the selected section, rather
 * than free dragging on a canvas. Sections still stack in order; what changes
 * here is how wide each one runs, how much air it has, and how it is coloured
 * and set.
 *
 * Every control starts blank, meaning "use the design's own value". That is
 * what keeps a template looking designed until someone deliberately changes
 * something.
 */

const fields: Record<string, Field> = {
  ...Object.fromEntries(['paddingLeft','paddingRight','marginTop','marginBottom','marginLeft','marginRight','minHeight','maxWidth','borderWidth','top','left','zIndex'].map(key => [key,{kind:'number',label:key.replace(/([A-Z])/g,' $1').replace(/^./,c=>c.toUpperCase()),min: key.startsWith('margin') || ['top','left','zIndex'].includes(key) ? -1000 : 0,max:4000}])),
  borderColor: {kind:'color',label:'Border colour'},
  opacity: {kind:'number',label:'Opacity (%)',min:0,max:100},
  shadow: {kind:'select',label:'Shadow',options:['none','soft','strong'].map(value=>({value,label:value}))},
  position: {kind:'select',label:'Position',options:['static','relative','sticky','absolute','fixed'].map(value=>({value,label:value}))},
  overflow: {kind:'select',label:'Overflow',options:['visible','hidden','auto'].map(value=>({value,label:value}))},
  width: {
    kind: 'select',
    label: 'Content width',
    options: [
      { value: 'full', label: 'Full width' },
      { value: 'centered', label: 'Centred column' },
      { value: 'narrow', label: 'Narrow column' },
    ],
  },
  paddingTop: { kind: 'number', label: 'Space above', min: 0, max: 240, step: 4, unit: 'px' },
  paddingBottom: { kind: 'number', label: 'Space below', min: 0, max: 240, step: 4, unit: 'px' },
  background: { kind: 'color', label: 'Background colour' },
  backgroundImage: { kind: 'image', label: 'Background photo' },
  radius: { kind: 'number', label: 'Corner rounding', min: 0, max: 48, step: 2, unit: 'px' },
  textAlign: {
    kind: 'select',
    label: 'Text alignment',
    options: [
      { value: 'left', label: 'Left' },
      { value: 'center', label: 'Centre' },
      { value: 'right', label: 'Right' },
    ],
  },
  textColor: { kind: 'color', label: 'Text colour' },
  fontFamily: {
    kind: 'select',
    label: 'Font',
    help: 'Leave on Design font to follow the site’s own typeface.',
    options: [
      { value: '', label: 'Design font' },
      { value: 'Inter', label: 'Inter' },
      { value: 'DM Sans', label: 'DM Sans' },
      { value: 'Poppins', label: 'Poppins' },
      { value: 'Playfair Display', label: 'Playfair Display' },
      { value: 'Space Grotesk', label: 'Space Grotesk' },
      { value: 'Bebas Neue', label: 'Bebas Neue' },
    ],
  },
  fontScale: {
    kind: 'number',
    label: 'Text size',
    min: 60,
    max: 160,
    step: 5,
    unit: '%',
    help: '100% is the size the design intends.',
  },
  animation: {
    kind: 'select',
    label: 'Entrance animation',
    help: 'Plays once when the section appears. Skipped for visitors who prefer less motion.',
    options: [
      { value: '', label: 'None' },
      { value: 'fade', label: 'Fade in' },
      { value: 'slide-up', label: 'Slide up' },
      { value: 'slide-left', label: 'Slide in from the right' },
      { value: 'zoom', label: 'Zoom in' },
    ],
  },
  hidden: {
    kind: 'switch',
    label: 'Hide this section',
    help: 'Kept in the page so you can bring it back.',
  },
}

const DEVICES: { value: Breakpoint; label: string; icon: typeof Monitor }[] = [
  { value: 'desktop', label: 'Desktop', icon: Monitor },
  { value: 'tablet', label: 'Tablet', icon: Tablet },
  { value: 'mobile', label: 'Phone', icon: Smartphone },
]

type Group = { title: string; keys: (keyof StyleValues)[] }

/** How it looks: colour, text, border, corners, shadow. */
const STYLE_GROUPS: Group[] = [
  { title: 'Text', keys: ['textAlign', 'fontFamily', 'fontScale'] },
  { title: 'Exact colour (overrides Section colours)', keys: ['background', 'backgroundImage', 'textColor'] },
  { title: 'Border and effects', keys: ['borderWidth', 'borderColor', 'radius', 'shadow', 'opacity'] },
]

/** How it is placed: size, spacing, position, animation, visibility. */
const ADVANCED_GROUPS: Group[] = [
  { title: 'Width and height', keys: ['width', 'maxWidth', 'minHeight'] },
  { title: 'Padding', keys: ['paddingTop', 'paddingBottom', 'paddingLeft', 'paddingRight'] },
  { title: 'Margin', keys: ['marginTop', 'marginBottom', 'marginLeft', 'marginRight'] },
  { title: 'Position', keys: ['position', 'top', 'left', 'zIndex', 'overflow'] },
  { title: 'Animation', keys: ['animation'] },
  { title: 'Visibility', keys: ['hidden'] },
]

/**
 * The Style tab (mode "style") and the Advanced tab (mode "advanced") share one
 * panel: both edit the same per-device values, so the Desktop / Tablet / Phone
 * switch is the same in each.
 */
export function StylePanel({ block, mode = 'style' }: { block: BlockConfig | undefined; mode?: 'style' | 'advanced' }) {
  const updateBlock = useConfigStore((s) => s.updateBlock)
  // Tied to the canvas's own device switch, so the preview always shows the
  // width being edited. Changing it here changes the canvas too.
  const device = useEditorStore((s) => s.viewport)
  const setDevice = useEditorStore((s) => s.setViewport)

  if (!block) {
    return (
      <div className="px-4 py-8 text-center">
        <p className="text-[11.5px] text-text-2">Nothing selected</p>
        <p className="mt-1 text-[10.5px] text-text-3 leading-relaxed">
          Click a section to change its width, spacing and colours.
        </p>
      </div>
    )
  }

  const style = block.style ?? {}
  // What this device actually shows, including anything inherited from wider
  // screens — so a control is never blank when the section clearly has a value.
  const shown = effectiveStyle(style, device)

  function set(key: keyof StyleValues, value: unknown) {
    // An emptied control removes the override rather than storing a blank,
    // so the section goes back to the design's own value.
    const cleaned = value === '' ? undefined : value

    const next: BlockStyle =
      device === 'desktop'
        ? { ...style, [key]: cleaned }
        : { ...style, [device]: { ...(style[device] ?? {}), [key]: cleaned } }

    updateBlock(block!.id, { style: next })
  }

  function clearDevice() {
    if (device === 'desktop') {
      updateBlock(block!.id, { style: undefined })
      return
    }
    updateBlock(block!.id, { style: { ...style, [device]: undefined } })
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="px-3 py-2.5 border-b border-border-default">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11.5px] font-semibold text-text-0">{mode === 'style' ? 'Section style' : 'Advanced settings'}</p>
          {(device === 'desktop' ? !isEmptyStyle(block.style) : hasOverrides(block.style, device)) && (
            <button
              type="button"
              onClick={clearDevice}
              className="flex items-center gap-1 text-[10.5px] text-text-3 hover:text-text-0 transition-colors"
            >
              <RotateCcw size={10} />
              {device === 'desktop' ? 'Reset all' : 'Clear this size'}
            </button>
          )}
        </div>

        <div className="mt-2 flex rounded-lg border border-border-default overflow-hidden">
          {DEVICES.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => setDevice(value)}
              title={`Style for ${label.toLowerCase()}`}
              className={`relative flex-1 flex items-center justify-center gap-1 py-1.5 text-[10.5px] transition-colors ${
                device === value
                  ? 'bg-bg-3 text-text-0'
                  : 'text-text-3 hover:text-text-1 hover:bg-bg-2'
              }`}
            >
              <Icon size={11} />
              {label}
              {/* A dot marks a size that has changes of its own, so overrides
                  are not hidden behind a tab nobody opens. */}
              {hasOverrides(block.style, value) && (
                <span className="absolute top-1 right-1.5 w-1 h-1 rounded-full bg-brand" />
              )}
            </button>
          ))}
        </div>

        {device !== 'desktop' && (
          <p className="mt-1.5 text-[10px] text-text-3 leading-snug">
            Changes here apply to {device === 'tablet' ? 'tablets' : 'phones'} only. Anything
            left alone follows the wider screen.
          </p>
        )}
      </div>

      {/* Imported HTML designs carry their own stylesheet, which theme colours cannot repaint. */}
      {mode === 'style' && !block.props.originalTemplate && <SectionColorsPanel block={block} />}

      {(mode === 'style' ? STYLE_GROUPS : ADVANCED_GROUPS).map((group) => (
        <div key={group.title} className="px-3 py-3 border-b border-border-subtle last:border-b-0">
          <p className="mb-2 text-[11px] font-semibold tracking-wide uppercase text-text-2">
            {group.title}
          </p>
          {group.keys.map((key) => (
            <FieldRenderer
              key={key}
              field={fields[key]}
              value={shown[key] ?? ''}
              onChange={(value) => set(key, value)}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

import type { Field, RepeaterItemField, WidgetSchema } from './field-types'
import { expandedWidgets, type ExpandedWidgetType } from './expanded'

export const text = (label: string): Field => ({ kind: 'text', label })
export const area = (label: string): Field => ({ kind: 'textarea', label, rows: 4 })
export const num = (label: string, min = 0, max = 1000000): Field => ({ kind: 'number', label, min, max })
export const toggle = (label: string): Field => ({ kind: 'switch', label })
export const choice = (label: string, values: string[]): Field => ({ kind: 'select', label, options: values.map(value => ({ value, label: value })) })
export const imageField = (label: string): Field => ({ kind: 'image', label })
export const entries = (label: string, fields: Record<string, RepeaterItemField>): Field => ({ kind: 'repeater', label, fields, titleKey: Object.keys(fields)[0], addLabel: 'Add item' })

export interface FunctionalDefinition {
  type: string; label: string; description: string; category: string; family: string
  variants: string[]; defaultProps: Record<string, unknown>; fields: Record<string, Field>
}
export function define<T extends string>(type: T, label: string, category: string, family: string, description: string, defaultProps: Record<string, unknown>, fields: Record<string, Field>) {
  return { type, label, category, family, description, defaultProps, fields, variants: ['default'] } as FunctionalDefinition & { type: T }
}
export const representativeWidgets = [
  define('modal', 'Modal', 'Interactive', 'disclosure', 'Open an accessible dialog, dismiss with Escape or close.', { title: 'More information', body: 'Tell visitors more about your service.', label: 'Open dialog' }, { title: text('Dialog title'), body: area('Dialog content'), label: text('Trigger text') }),
  define('carousel', 'Carousel', 'Media', 'carousel', 'Previous/next slides with keyboard controls and optional autoplay.', { title: 'Highlights', autoplay: false, interval: 5, items: [{ title: 'Discover', body: 'Explore our services.', image: '', url: '#' }, { title: 'Connect', body: 'Meet our team.', image: '', url: '#' }] }, { title: text('Carousel title'), autoplay: toggle('Automatic playback'), interval: num('Seconds per slide', 1, 60), items: entries('Slides', { title: {kind:'text',label:'Slide title'}, body:{kind:'textarea',label:'Slide content'}, image:{kind:'image',label:'Slide image'}, url:{kind:'text',label:'Slide address'} }) }),
  define('countdown', 'Countdown', 'Interactive', 'clock', 'Counts down to an editable date and displays an expiry message.', { title: 'Launch countdown', deadline: '2027-01-01T00:00:00Z', expired: 'We are live!' }, { title: text('Countdown title'), deadline: text('Target date (ISO with timezone)'), expired: text('Expired message') }),
  define('counter', 'Counter', 'Basic', 'metric', 'A formatted numeric statistic with prefix and suffix.', { title: 'Customers served', value: 1250, prefix: '', suffix: '+' }, { title:text('Metric label'), value:num('Metric value',-1000000), prefix:text('Before value'), suffix:text('After value') }),
] as const

export const functionalWidgets: FunctionalDefinition[] = [...representativeWidgets, ...expandedWidgets]
export type FunctionalWidgetType = typeof representativeWidgets[number]['type'] | ExpandedWidgetType
export const functionalMap = new Map(functionalWidgets.map(widget => [widget.type, widget]))
export const isFunctionalWidget = (type: string) => functionalMap.has(type)
export const functionalSchemas = Object.fromEntries(functionalWidgets.map(widget => [widget.type, { groups: [{ title: 'Content', fields: widget.fields }] }])) as Record<FunctionalWidgetType, WidgetSchema>

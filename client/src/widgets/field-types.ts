/**
 * The vocabulary a widget uses to describe its own settings.
 *
 * A widget declares which fields it has; the properties panel reads that
 * declaration and builds the form. Nothing in the panel knows about any
 * particular widget, so adding a widget never means editing the panel.
 *
 * Keep this list small on purpose. Every field type is a control someone has
 * to understand, and a builder aimed at non-technical people gets worse with
 * each extra kind of input. Ten cover every widget we ship.
 */

interface FieldBase {
  /** Shown above the control. Write it the way a shop owner would say it —
   *  "Heading", not "headline"; "Phone number", not "tel". */
  label: string
  /** Optional one-line hint under the control, for anything non-obvious. */
  help?: string
}

export interface TextField extends FieldBase {
  kind: 'text'
  placeholder?: string
}

export interface TextareaField extends FieldBase {
  kind: 'textarea'
  rows?: number
  placeholder?: string
}

/** A formatted-text field. It currently uses the same safe Markdown editor as
 * a textarea, but has its own name so richer editing can be introduced later
 * without changing saved widget data. */
export interface RichtextField extends FieldBase {
  kind: 'richtext'
  rows?: number
  placeholder?: string
}

export interface NumberField extends FieldBase {
  kind: 'number'
  min?: number
  max?: number
  step?: number
  /** Suffix rendered inside the control, e.g. "px". */
  unit?: string
}

export interface ImageField extends FieldBase {
  kind: 'image'
}

export interface ColorField extends FieldBase {
  kind: 'color'
}

export interface SelectField extends FieldBase {
  kind: 'select'
  /**
   * `value` is what gets stored, `label` is what the user reads. These are
   * deliberately separate: the stored value can stay a code word like
   * `side-by-side` while the dropdown says "Photo beside text".
   */
  options: { value: string; label: string }[]
}

export interface SwitchField extends FieldBase {
  kind: 'switch'
}

export interface LinkField extends FieldBase {
  kind: 'link'
}

/** A plain list of strings — navigation links, footer links, logo names. */
export interface StringsField extends FieldBase {
  kind: 'strings'
  /** Label for the add button, e.g. "Add link". */
  addLabel?: string
  placeholder?: string
}

/** A list of records — stats, testimonials, FAQ entries, team members. */
export interface RepeaterField extends FieldBase {
  kind: 'repeater'
  addLabel?: string
  /** Fields of a single entry. A repeater cannot nest another repeater. */
  fields: Record<string, RepeaterItemField>
  /** Property whose value titles each row in the panel, e.g. `name`. */
  titleKey?: string
}

export type RepeaterItemField =
  | TextField
  | TextareaField
  | RichtextField
  | NumberField
  | ImageField
  | ColorField
  | SelectField
  | SwitchField
  | LinkField
  | StringsField

export type Field = RepeaterItemField | StringsField | RepeaterField

/** The value stored for a `link` field. */
export interface LinkValue {
  href: string
  newTab?: boolean
}

/**
 * A widget's settings, grouped into collapsible sections.
 *
 * Order matters — the first group is open when the panel appears, so put what
 * people change most (the words on screen) first and styling later.
 */
export interface FieldGroup {
  title: string
  fields: Record<string, Field>
}

export interface WidgetSchema {
  groups: FieldGroup[]
}

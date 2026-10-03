import { Loader2 } from 'lucide-react'
import { HexColorField } from '@/builder/fields/HexColorField'
import { beginHistoryGroup, endHistoryGroup } from '@/store/configStore'
import { summarizeSection, type DetectedColour, type SectionProbe } from '@/lib/section-colour-probe'
import './section-colours.css'

/** What the editor hands the panel: the detected colours of the selection and how to change them. */
export interface SectionColoursApi {
  /** Name of what is being edited, shown under the heading. */
  label: string
  /** The colours read from the open page; null while they are being read. */
  probe: SectionProbe | null
  /** True when the selection is part of a bigger section that can be edited as a whole instead. */
  canWholeSection: boolean
  wholeSection: boolean
  setWholeSection: (value: boolean) => void
  /** Gives every use of `from` inside the selection the colour `to`. */
  onRecolor: (from: string, to: string) => void
  /** Gives the selection a background of its own. */
  onBackground: (to: string) => void
}

function Row({ name, colour, onChange }: { name: string; colour: DetectedColour; onChange: (to: string) => void }) {
  return (
    <li className="section-colours-row">
      <span title={`${colour.count} place${colour.count === 1 ? '' : 's'} in this selection`}>{name}</span>
      <HexColorField compact label={name} value={colour.hex} onChange={onChange} />
    </li>
  )
}

/**
 * The colours this part of the page really uses: its background, its accent, and the rest under
 * "More colours". Changing one changes it everywhere in the selection (and only there).
 */
export function SectionColourPanel({ api }: { api: SectionColoursApi }) {
  const { probe } = api
  const found = probe ? summarizeSection(probe) : null
  const background = found?.background
  const backgroundHex = background?.hex ?? undefined

  return (
    <section className="section-colours" aria-label="Section colours" data-testid="section-colours" onFocusCapture={beginHistoryGroup} onBlurCapture={endHistoryGroup}>
      <h3>Section colours</h3>
      <p className="section-colours-editing">Editing: <strong>{api.label || 'this section'}</strong></p>
      {api.canWholeSection && (
        <label className="section-colours-whole">
          <input type="checkbox" checked={api.wholeSection} onChange={(event) => api.setWholeSection(event.target.checked)} />
          Use the whole section
        </label>
      )}
      {!found ? (
        <p className="section-colours-note" role="status"><Loader2 size={13} className="animate-spin" /> Reading the colours…</p>
      ) : (
        <>
          <ul className="section-colours-list">
            <li className="section-colours-row">
              <span>Background</span>
              <HexColorField
                compact
                label="Background"
                value={backgroundHex}
                fallback="#ffffff"
                placeholder={background?.transparent ? 'Not set' : undefined}
                onChange={(to) => (backgroundHex && !background?.gradient ? api.onRecolor(backgroundHex, to) : api.onBackground(to))}
              />
            </li>
            {found.accent && <Row name="Accent" colour={found.accent} onChange={(to) => api.onRecolor(found.accent!.hex, to)} />}
          </ul>
          {background?.transparent && <p className="section-colours-note">This section has no background of its own. Pick a colour to give it one.</p>}
          {background?.gradient && <p className="section-colours-note">This section uses a gradient. Picking a background colour replaces it with that solid colour; Undo brings it back.</p>}
          {background?.image && !background.gradient && <p className="section-colours-note">The background image stays. This colour shows behind it.</p>}
          {found.more.length > 0 && (
            <details className="section-colours-more">
              <summary>More colours ({found.more.length})</summary>
              <ul className="section-colours-list">
                {found.more.map((colour, index) => <Row key={`${index}-${colour.label}`} name={colour.label} colour={colour} onChange={(to) => api.onRecolor(colour.hex, to)} />)}
              </ul>
            </details>
          )}
        </>
      )}
      <p className="section-colours-note">Only this selection changes. Other sections, pages, the header and the footer stay as they are. Undo (Ctrl+Z) brings a colour back.</p>
    </section>
  )
}

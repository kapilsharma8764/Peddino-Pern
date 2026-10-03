import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Loader2, Wand2 } from 'lucide-react'
import { toast } from 'sonner'
import { useBusinessStore } from '@/store/businessStore'
import { useConfigStore } from '@/store/configStore'
import { profileFromDescription } from '@/onboarding/from-description'
import { buildTemplate } from '@/templates/library/types'
import { loadStartingTemplate } from '@/services/templateApi'
import { usePublishStore } from '@/store/publishStore'

/**
 * The second way in: describe the business in a sentence or two.
 *
 * What it does is honest about itself. It reads the trade and the name out of
 * the description, matches the closest of the forty designs, and opens it in
 * the editor with those details filled in. No claim is made that anything was
 * written from scratch — the point is to skip the form, not to replace the
 * person's judgement about their own business.
 */

const EXAMPLES = [
  'A coaching centre in Jaipur called Sharma Classes, teaching maths and science for board exams',
  'A barber shop named Craft & Blade — haircuts, beard trims and hot shaves, open seven days',
  'A dental clinic offering check-ups, whitening and same-day emergency appointments',
  'A solar installation company that fits rooftop panels for homes and small factories',
]

export function Describe() {
  const navigate = useNavigate()
  const setProfile = useBusinessStore((s) => s.update)
  const complete = useBusinessStore((s) => s.complete)
  const reset = useBusinessStore((s) => s.reset)
  const setConfig = useConfigStore((s) => s.setConfig)

  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)

  async function build() {
    const description = text.trim()
    if (!description) return

    setBusy(true)
    try {
      const profile = profileFromDescription(description)
      const config = buildTemplate(await loadStartingTemplate(profile.category), profile)

      reset()
      setProfile(profile)
      complete()
      usePublishStore.getState().clear()
      setConfig(config)

      toast(`${config.name} is ready to edit`)
      navigate('/editor')
    } finally {
      setBusy(false)
    }
  }

  return (
<div className="workspace-tool-page h-full overflow-y-auto">
<div className="workspace-tool-panel relative max-w-2xl mx-auto px-6 py-12">
        <div className="hero-backdrop" aria-hidden="true">
          <div className="hero-dots" />
          <div className="hero-orb hero-orb-1" />
          <div className="hero-orb hero-orb-2" />
        </div>

        <button
          type="button"
          onClick={() => navigate('/')}
          className="hero-in relative z-10 flex items-center gap-1.5 text-[12.5px] text-text-2 hover:text-text-0 transition-colors"
          style={{ '--hero-delay': '0ms' } as React.CSSProperties}
        >
          <ArrowLeft size={14} />
          Back
        </button>

        <h1
          className="hero-in relative z-10 mt-5 text-2xl font-bold tracking-tight text-text-0 font-display"
          style={{ '--hero-delay': '60ms' } as React.CSSProperties}
        >
          Describe your business
        </h1>
        <p
          className="hero-in relative z-10 mt-2 text-[13px] text-text-2 leading-relaxed"
          style={{ '--hero-delay': '110ms' } as React.CSSProperties}
        >
          A sentence or two is enough. We pick the design that fits and fill in what we can —
          you change the rest in the editor.
        </p>

        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          rows={5}
          placeholder="A coaching centre called…"
          aria-label="Describe your business"
          className="hero-in relative z-10 mt-6 w-full px-3.5 py-3 rounded-xl border border-border-default bg-bg-2 text-text-0 text-[13px] leading-relaxed outline-none focus:border-brand placeholder:text-text-3 resize-y"
          style={{ '--hero-delay': '170ms' } as React.CSSProperties}
        />

        <div
          className="hero-in relative z-10 mt-4"
          style={{ '--hero-delay': '220ms' } as React.CSSProperties}
        >
          <p className="text-[11px] font-semibold uppercase tracking-wide text-text-3 mb-2">
            Or start from one of these
          </p>
          <div className="flex flex-col gap-1.5">
            {EXAMPLES.map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => setText(example)}
                className="text-left px-3 py-2 rounded-lg border border-border-default bg-bg-2 text-[12px] text-text-2 hover:text-text-0 hover:border-border-hover transition-colors"
              >
                {example}
              </button>
            ))}
          </div>
        </div>

        <div className="relative z-10 mt-8 flex items-center justify-between gap-4">
          <p className="text-[11.5px] text-text-3 leading-snug max-w-xs">
            Prefer to answer a few questions instead?{' '}
            <button
              type="button"
              onClick={() => navigate('/create')}
              className="text-brand hover:text-brand-dim transition-colors"
            >
              Use the form
            </button>
          </p>

          <button
            type="button"
            onClick={() => void build()}
            disabled={!text.trim() || busy}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-text-0 text-bg-0 text-[13px] font-semibold hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed transition-opacity"
          >
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}
            Build my site
            {!busy && <ArrowRight size={14} />}
          </button>
        </div>
      </div>
    </div>
  )
}

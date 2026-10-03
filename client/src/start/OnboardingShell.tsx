import type { ReactNode } from 'react'
import { ArrowLeft, ArrowRight, Check } from 'lucide-react'

/**
 * The frame every setup screen shares: where you are, a title, the content, and
 * Back / Continue. Both paths ("Choose a template" and "Create a site") use it, so
 * they look and behave as one product.
 */
export function OnboardingProgress({ steps, current }: { steps: string[]; current: number }) {
  return (
    <ol className="mx-auto mb-8 flex max-w-3xl flex-wrap items-center justify-center gap-x-2 gap-y-2" aria-label="Setup progress">
      {steps.map((label, index) => {
        const done = index < current
        const active = index === current
        return (
          <li key={label} aria-current={active ? 'step' : undefined} className="flex items-center gap-2">
            <span className={`grid h-6 w-6 place-items-center rounded-full text-[11px] font-bold ${active ? 'bg-[#7C3AED] text-white' : done ? 'bg-[#7C3AED]/15 text-[#7C3AED]' : 'bg-slate-100 text-slate-400'}`}>
              {done ? <Check size={12} /> : index + 1}
            </span>
            <span className={`text-[12.5px] font-medium ${active ? 'text-slate-900' : 'text-slate-400'}`}>{label}</span>
            {index < steps.length - 1 && <span className="mx-1 hidden h-px w-6 bg-slate-200 sm:block" aria-hidden="true" />}
          </li>
        )
      })}
    </ol>
  )
}

export function OnboardingShell({
  steps, current, title, subtitle, onBack, onContinue, continueLabel = 'Continue', canContinue = true, busy = false, children, wide = false,
}: {
  steps: string[]
  current: number
  title: string
  subtitle?: string
  onBack: () => void
  onContinue: () => void
  continueLabel?: string
  canContinue?: boolean
  busy?: boolean
  children: ReactNode
  wide?: boolean
}) {
  return (
    <div className="create-page min-h-full h-full overflow-y-auto bg-bg-0 text-text-0" data-testid="onboarding">
      <div className={`mx-auto px-5 py-10 ${wide ? 'max-w-6xl' : 'max-w-4xl'}`}>
        <OnboardingProgress steps={steps} current={current} />
        <h1 className="create-heading text-center">{title}</h1>
        {subtitle && <p className="create-done-sub mx-auto mt-2 max-w-xl text-center">{subtitle}</p>}
        <div className="mt-8">{children}</div>
        <div className="mt-8 flex items-center justify-between gap-3 border-t border-slate-200 pt-5">
          <button type="button" onClick={onBack} className="create-btn create-btn-skip inline-flex items-center gap-2"><ArrowLeft size={15} />Back</button>
          <button type="button" onClick={onContinue} disabled={!canContinue || busy} className="create-btn create-btn-accent inline-flex items-center gap-2 disabled:opacity-40">
            {continueLabel}<ArrowRight size={15} />
          </button>
        </div>
      </div>
    </div>
  )
}

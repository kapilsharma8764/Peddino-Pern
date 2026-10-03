import { Check } from 'lucide-react'
import { useBusinessStore } from '@/store/businessStore'
import { pageOptions } from '@/onboarding/profile'
import { themePresets } from '@/lib/theme-presets'

/** The named, business-appropriate presets offered here — the rest of `themePresets` are general design-panel palettes. */
const BUSINESS_PRESET_IDS = ['grey-minimal', 'dark-grey', 'blue-corporate', 'green-education', 'orange-creative', 'black-premium']

/**
 * The two choices that only make sense when a ready-made template is used: which of its
 * pages to keep, and whether to recolour it. They live on the template gallery, not in the
 * setup form, because a site built from layouts and widgets has no template to trim.
 */
export function TemplateOptions() {
  const profile = useBusinessStore((s) => s.profile)
  const update = useBusinessStore((s) => s.update)

  return (
    <div className="grid gap-5 rounded-xl border border-border-default bg-bg-1 p-4 mb-5" data-testid="template-options">
      <div>
        <p className="text-[13px] font-semibold text-text-0">Which pages do you need?</p>
        <p className="mt-0.5 mb-2 text-[12px] text-text-3">Home is always included. Pick any others — this only trims the template you choose, nothing here is final.</p>
        <div className="flex flex-wrap gap-2">
          {pageOptions.map((page) => {
            const active = profile.pages.includes(page)
            return (
              <button
                key={page}
                type="button"
                aria-pressed={active}
                onClick={() => update({ pages: active ? profile.pages.filter((p) => p !== page) : [...profile.pages, page] })}
                className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-full border text-xs font-medium transition-colors ${
                  active ? 'border-[#7C3AED] bg-purple-50 text-[#7C3AED]' : 'border-border-default text-text-2 hover:bg-bg-2'
                }`}
              >
                {active && <Check size={12} />}
                {page}
              </button>
            )
          })}
        </div>
      </div>

      <div>
        <p className="text-[13px] font-semibold text-text-0">Colour style</p>
        <p className="mt-0.5 mb-2 text-[12px] text-text-3">Optional — leave unpicked to keep the template's own colours.</p>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {themePresets.filter((preset) => BUSINESS_PRESET_IDS.includes(preset.id)).map((preset) => {
            const active = profile.themePresetId === preset.id
            return (
              <button
                key={preset.id}
                type="button"
                aria-pressed={active}
                onClick={() => update({ themePresetId: active ? null : preset.id })}
                className={`flex flex-col gap-1.5 rounded-lg border p-2 text-left transition-colors ${
                  active ? 'border-[#7C3AED] ring-2 ring-[#7C3AED]/15' : 'border-border-default hover:border-border-hover'
                }`}
              >
                <div className="flex gap-1">
                  <span className="h-3 w-3 rounded-sm" style={{ background: preset.theme.bg0 }} />
                  <span className="h-3 w-3 rounded-sm" style={{ background: preset.theme.accent }} />
                  <span className="h-3 w-3 rounded-sm" style={{ background: preset.theme.text0 }} />
                </div>
                <span className="text-[11px] font-medium text-text-1 truncate">{preset.name}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

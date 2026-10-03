import { useMemo } from 'react'
import { useConfigStore } from '@/store/configStore'
import type { ThemeConfig } from '@/blocks/types'
import { themePresets, resolveTheme, googleFontOptions } from '@/lib/theme-presets'
import { ThemeColorsPanel } from './ThemeColorsPanel'

export function DesignPanel() {
  const theme = useConfigStore((s) => s.config.theme)
  const setTheme = useConfigStore((s) => s.setTheme)
  const updateTheme = useConfigStore((s) => s.updateTheme)
  const resolved = useMemo(() => resolveTheme(theme), [theme])

  const activePresetId = useMemo(() => {
    for (const preset of themePresets) {
      const match = Object.keys(preset.theme).every(
        (k) => resolved[k as keyof ThemeConfig] === preset.theme[k as keyof ThemeConfig]
      )
      if (match) return preset.id
    }
    return null
  }, [resolved])

  return (
    <div className="px-3.5 py-3.5">
      {/* Preset grid */}
      <div className="mb-4">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-text-3 mb-2">Presets</div>
        <div className="grid grid-cols-2 gap-1.5">
          {themePresets.map((preset) => (
            <button
              key={preset.id}
              onClick={() => setTheme(preset.theme)}
              className={`p-2 rounded-lg border transition-all text-left ${
                activePresetId === preset.id
                  ? 'border-brand bg-brand/5'
                  : 'border-border-default bg-bg-2 hover:border-border-hover hover:bg-bg-3'
              }`}
            >
              <div className="flex gap-0.5 mb-1.5">
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: preset.theme.bg0 }} />
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: preset.theme.bg2 }} />
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: preset.theme.accent }} />
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: preset.theme.text0 }} />
              </div>
              <div className="text-[10px] font-medium truncate">{preset.name}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Theme colours: the semantic palette, with every shade behind an expander. */}
      <ThemeColorsPanel />

      {/* Fonts */}
      <div className="mb-4">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-text-3 mb-2">Fonts</div>
        <div className="space-y-2.5">
          {([
            { key: 'fontSans' as const, label: 'Body' },
            { key: 'fontDisplay' as const, label: 'Display' },
            { key: 'fontMono' as const, label: 'Mono' },
          ]).map(({ key, label }) => (
            <div key={key}>
              <label className="block text-[10.5px] text-text-2 mb-1">{label}</label>
              <select
                value={resolved[key]}
                onChange={(e) => updateTheme({ [key]: e.target.value })}
                className="w-full px-2 py-1.5 rounded-lg border border-border-default bg-bg-2 text-text-0 text-[11px] outline-none focus:border-brand cursor-pointer"
                style={{ fontFamily: `"${resolved[key]}", sans-serif` }}
              >
                {googleFontOptions.map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </div>

      {/* Radius */}
      <div>
        <div className="text-[10px] font-semibold uppercase tracking-wider text-text-3 mb-2">Radius</div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[10.5px] text-text-2 mb-1">Default</label>
            <input
              type="number"
              min={0}
              max={24}
              value={resolved.radius}
              onChange={(e) => updateTheme({ radius: Number(e.target.value) })}
              className="w-full px-2 py-1.5 rounded-lg border border-border-default bg-bg-2 text-text-0 text-[11px] outline-none focus:border-brand"
            />
          </div>
          <div>
            <label className="block text-[10.5px] text-text-2 mb-1">Large</label>
            <input
              type="number"
              min={0}
              max={32}
              value={resolved.radiusLg}
              onChange={(e) => updateTheme({ radiusLg: Number(e.target.value) })}
              className="w-full px-2 py-1.5 rounded-lg border border-border-default bg-bg-2 text-text-0 text-[11px] outline-none focus:border-brand"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

import React, { useEffect, useMemo, useState } from 'react'
import { useSiteSettings } from '../context/SiteSettingsContext'
import { ThemePreview } from './components/ThemePreview'
import { NavEditor } from './components/NavEditor'
import { BannerManager } from './components/BannerManager'

const TABS = ['appearance', 'announcement', 'navigation', 'hero', 'css']

export function DesignPanel() {
  const { settings, loading, error, saving, saveSettings } = useSiteSettings()
  const [activeTab, setActiveTab] = useState('appearance')
  const [draft, setDraft] = useState(settings)
  const [localError, setLocalError] = useState(null)

  useEffect(() => {
    setDraft(settings)
  }, [settings])

  const handleThemeChange = (patch) => {
    setDraft((prev) => ({
      ...prev,
      theme: { ...(prev.theme || {}), ...patch },
    }))
  }

  const handleAnnouncementChange = (patch) => {
    setDraft((prev) => ({
      ...prev,
      announcement: { ...(prev.announcement || {}), ...patch },
    }))
  }

  const handleNavChange = (links) => {
    setDraft((prev) => ({
      ...prev,
      navigation: { ...(prev.navigation || {}), links },
    }))
  }

  const handleBannersChange = (banners) => {
    setDraft((prev) => ({
      ...prev,
      hero: { ...(prev.hero || {}), banners },
    }))
  }

  const handleSave = async () => {
    setLocalError(null)
    try {
      await saveSettings(draft)
    } catch (err) {
      setLocalError(err.message)
    }
  }

  const activeBanner = useMemo(
    () =>
      (draft.hero?.banners || []).find((b) => b.active) ||
      draft.hero?.banners?.[0] ||
      null,
    [draft.hero],
  )

  return (
    <section className="min-h-screen bg-slate-950/95 text-slate-50">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-3 py-6 sm:px-4 sm:py-8 md:flex-row">
        <aside className="w-full rounded-2xl border border-slate-800/80 bg-slate-950/90 p-4 shadow-rb-gloss-panel md:w-64 md:flex-shrink-0">
          <h1 className="font-display text-lg font-semibold text-slate-50">
            Design System
          </h1>
          <p className="mt-1 text-[11px] text-slate-400">
            Control the global look and feel of RiddimBase.
          </p>
          <div className="mt-4 space-y-1 text-xs font-medium text-slate-200">
            {TABS.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left transition ${
                  activeTab === tab
                    ? 'bg-red-500/20 text-red-200 border border-red-500/60'
                    : 'border border-transparent hover:border-slate-700/80 hover:bg-slate-900/80'
                }`}
              >
                <span className="uppercase tracking-[0.16em]">
                  {tab === 'css' ? 'Advanced CSS' : tab}
                </span>
              </button>
            ))}
          </div>
          <div className="mt-6 border-t border-slate-800/80 pt-4 text-[11px] text-slate-400">
            <p>
              Changes apply globally once saved. Use Advanced CSS carefully—it is
              injected directly into the site.
            </p>
          </div>
        </aside>

        <div className="flex-1 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Admin · Design
              </p>
              <h2 className="mt-1 text-lg font-semibold text-slate-50">
                Advanced Admin Design System
              </h2>
              {loading && (
                <p className="mt-1 text-[11px] text-slate-500">Loading settings…</p>
              )}
              {!loading && error && (
                <p className="mt-1 text-[11px] text-red-400">
                  Failed to load from server; editing local defaults.
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {saving && (
                <span className="text-[11px] text-slate-400">Saving…</span>
              )}
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || loading}
                className="rounded-full bg-red-500 px-5 py-2 text-xs font-semibold text-slate-50 shadow-rb-gloss-btn hover:bg-red-400 disabled:opacity-60"
              >
                Save changes
              </button>
            </div>
          </div>

          {localError && (
            <div className="rounded-xl border border-red-500/50 bg-red-500/10 px-3 py-2 text-[11px] text-red-200">
              {localError}
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-[minmax(0,1.2fr),minmax(0,0.9fr)]">
            <div className="space-y-4">
              {activeTab === 'appearance' && (
                <AppearancePanel draft={draft} onChange={handleThemeChange} />
              )}
              {activeTab === 'announcement' && (
                <AnnouncementPanel draft={draft} onChange={handleAnnouncementChange} />
              )}
              {activeTab === 'navigation' && (
                <NavEditor
                  links={draft.navigation?.links || []}
                  onChange={handleNavChange}
                />
              )}
              {activeTab === 'hero' && (
                <BannerManager
                  banners={draft.hero?.banners || []}
                  onChange={handleBannersChange}
                />
              )}
              {activeTab === 'css' && (
                <AdvancedCssPanel
                  value={draft.advancedCss || ''}
                  onChange={(css) =>
                    setDraft((prev) => ({
                      ...prev,
                      advancedCss: css,
                    }))
                  }
                />
              )}
            </div>

            <div>
              <ThemePreview settings={draft} activeBanner={activeBanner} />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function AppearancePanel({ draft, onChange }) {
  const theme = draft.theme || {}
  return (
    <div className="rounded-2xl border border-slate-800/80 bg-slate-900/80 p-4 shadow-rb-gloss-panel">
      <h3 className="text-sm font-semibold text-slate-100">Appearance</h3>
      <p className="mt-1 text-[11px] text-slate-400">
        Tweak primary colors and typography for the entire platform.
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label className="text-[11px] font-medium text-slate-200">
            Primary color
          </label>
          <input
            type="color"
            value={theme.primaryColor || '#ef4444'}
            onChange={(e) => onChange({ primaryColor: e.target.value })}
            className="mt-1 h-9 w-full cursor-pointer rounded-md border border-slate-700/80 bg-slate-950/80"
          />
        </div>
        <div>
          <label className="text-[11px] font-medium text-slate-200">
            Accent color
          </label>
          <input
            type="color"
            value={theme.accentColor || '#f97316'}
            onChange={(e) => onChange({ accentColor: e.target.value })}
            className="mt-1 h-9 w-full cursor-pointer rounded-md border border-slate-700/80 bg-slate-950/80"
          />
        </div>
        <div>
          <label className="text-[11px] font-medium text-slate-200">
            Background color
          </label>
          <input
            type="color"
            value={theme.backgroundColor || '#020617'}
            onChange={(e) => onChange({ backgroundColor: e.target.value })}
            className="mt-1 h-9 w-full cursor-pointer rounded-md border border-slate-700/80 bg-slate-950/80"
          />
        </div>
        <div>
          <label className="text-[11px] font-medium text-slate-200">
            Surface color
          </label>
          <input
            type="color"
            value={theme.surfaceColor || '#020617'}
            onChange={(e) => onChange({ surfaceColor: e.target.value })}
            className="mt-1 h-9 w-full cursor-pointer rounded-md border border-slate-700/80 bg-slate-950/80"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="text-[11px] font-medium text-slate-200">
            Font family
          </label>
          <input
            type="text"
            value={
              theme.fontFamily ||
              'Inter, system-ui, -apple-system, BlinkMacSystemFont, sans-serif'
            }
            onChange={(e) => onChange({ fontFamily: e.target.value })}
            className="mt-1 w-full rounded-xl border border-slate-700/80 bg-slate-950/80 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:border-red-400 focus:outline-none"
            placeholder="CSS font-family value"
          />
        </div>
      </div>
    </div>
  )
}

function AnnouncementPanel({ draft, onChange }) {
  const announcement = draft.announcement || {}
  return (
    <div className="rounded-2xl border border-slate-800/80 bg-slate-900/80 p-4 shadow-rb-gloss-panel">
      <h3 className="text-sm font-semibold text-slate-100">Announcement bar</h3>
      <p className="mt-1 text-[11px] text-slate-400">
        Configure the global announcement bar at the top of the site.
      </p>
      <div className="mt-4 space-y-3 text-xs">
        <label className="flex items-center gap-2 text-slate-200">
          <input
            type="checkbox"
            className="h-3 w-3 rounded border-slate-600 bg-slate-900"
            checked={announcement.enabled !== false}
            onChange={(e) => onChange({ enabled: e.target.checked })}
          />
          <span>Show announcement bar</span>
        </label>
        <div>
          <label className="text-[11px] font-medium text-slate-200">Text</label>
          <input
            type="text"
            value={announcement.text || ''}
            onChange={(e) => onChange({ text: e.target.value })}
            className="mt-1 w-full rounded-xl border border-slate-700/80 bg-slate-950/80 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:border-red-400 focus:outline-none"
            placeholder="e.g. New: Boosted beats and soundkits now live!"
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="text-[11px] font-medium text-slate-200">
              Background color
            </label>
            <input
              type="color"
              value={announcement.backgroundColor || '#111827'}
              onChange={(e) => onChange({ backgroundColor: e.target.value })}
              className="mt-1 h-8 w-full cursor-pointer rounded-md border border-slate-700/80 bg-slate-950/80"
            />
          </div>
          <div>
            <label className="text-[11px] font-medium text-slate-200">
              Text color
            </label>
            <input
              type="color"
              value={announcement.textColor || '#e5e7eb'}
              onChange={(e) => onChange({ textColor: e.target.value })}
              className="mt-1 h-8 w-full cursor-pointer rounded-md border border-slate-700/80 bg-slate-950/80"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

function AdvancedCssPanel({ value, onChange }) {
  return (
    <div className="rounded-2xl border border-slate-800/80 bg-slate-900/80 p-4 shadow-rb-gloss-panel">
      <h3 className="text-sm font-semibold text-slate-100">Advanced CSS</h3>
      <p className="mt-1 text-[11px] text-slate-400">
        Custom CSS is injected globally into the site. Use with care.
      </p>
      <textarea
        rows={12}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-4 w-full rounded-xl border border-slate-700/80 bg-slate-950/80 px-3 py-2 text-xs font-mono text-slate-100 placeholder:text-slate-500 focus:border-red-400 focus:outline-none"
        placeholder={`/* Example:
.rb-primary-button {
  border-radius: 9999px;
}
*/`}
      />
    </div>
  )
}

export default DesignPanel


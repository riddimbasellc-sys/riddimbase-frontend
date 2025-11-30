import React from 'react'

export function ThemePreview({ settings, activeBanner }) {
  const theme = settings.theme || {}
  const announcement = settings.announcement || {}
  const banner = activeBanner || (settings.hero?.banners || [])[0]

  return (
    <div className="rounded-2xl border border-slate-800/80 bg-slate-950/90 p-4 shadow-rb-gloss-panel">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
        Live preview
      </p>
      <div className="mt-3 space-y-3 text-[11px] text-slate-200">
        {/* Announcement */}
        {announcement.enabled && (
          <div
            className="rounded-xl px-3 py-2 text-xs font-medium"
            style={{
              backgroundColor: announcement.backgroundColor || '#111827',
              color: announcement.textColor || '#e5e7eb',
            }}
          >
            {announcement.text || 'Announcement text will appear here.'}
          </div>
        )}

        {/* Nav */}
        <div
          className="flex items-center justify-between rounded-xl border px-3 py-2 text-[11px]"
          style={{
            borderColor: 'rgba(148,163,184,0.35)',
            background:
              'linear-gradient(to right, rgba(15,23,42,0.95), rgba(15,23,42,0.8))',
          }}
        >
          <div className="flex items-center gap-2">
            <div
              className="flex h-6 w-6 items-center justify-center rounded-md text-[9px] font-black tracking-[0.16em]"
              style={{
                background: theme.primaryColor || '#ef4444',
                color: '#020617',
              }}
            >
              RB
            </div>
            <span className="text-[11px] font-semibold">
              RiddimBase
            </span>
          </div>
          <div className="flex flex-wrap gap-2 text-[10px] text-slate-300">
            {(settings.navigation?.links || [])
              .filter((l) => l.visible)
              .slice(0, 4)
              .map((l) => (
                <span key={l.id}>{l.label}</span>
              ))}
          </div>
        </div>

        {/* Hero */}
        <div className="rounded-2xl border border-slate-800/80 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 px-4 py-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-red-400">
            Hero preview
          </p>
          <h3 className="mt-2 text-sm font-semibold text-slate-50">
            {banner?.title || 'Your first hit starts here.'}
          </h3>
          <p className="mt-1 text-[11px] text-slate-300 line-clamp-2">
            {banner?.subtitle ||
              'Homepage hero copy will update as you edit your banner content.'}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              className="rounded-full bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-950 shadow-rb-gloss-btn"
              type="button"
            >
              {banner?.ctaText || 'Explore beats'}
            </button>
            <button
              className="rounded-full border border-slate-600/70 bg-slate-900/70 px-3 py-1.5 text-[11px] font-semibold text-slate-200"
              type="button"
            >
              Secondary action
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}


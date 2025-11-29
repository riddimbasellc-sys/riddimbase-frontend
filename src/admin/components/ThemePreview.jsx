import React from 'react'

export function ThemePreview({ settings, activeBanner }) {
  const theme = settings.theme || {}
  const announcement = settings.announcement || {}
  const nav = settings.navigation || {}
  const banner = activeBanner || (settings.hero?.banners || [])[0] || null

  return (
    <div className="rounded-2xl border border-slate-800/80 bg-gradient-to-b from-slate-950 via-slate-950/95 to-black p-4 shadow-rb-gloss-panel">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
        Live Theme Preview
      </p>

      {announcement.enabled !== false && (
        <div
          className="mt-3 rounded-lg px-3 py-1.5 text-[11px] font-medium"
          style={{
            backgroundColor:
              announcement.backgroundColor || 'rgba(15,23,42,0.9)',
            color: announcement.textColor || '#e5e7eb',
          }}
        >
          {announcement.text || 'Your site‑wide announcement appears here.'}
        </div>
      )}

      <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-slate-800/80 bg-slate-950/90 px-3 py-2">
        <div className="flex items-center gap-2">
          <div
            className="flex h-7 w-7 items-center justify-center rounded-md text-[10px] font-black tracking-[0.18em]"
            style={{
              background:
                theme.primaryColor ||
                'linear-gradient(90deg,#ef4444,#f97316,#eab308)',
              color: '#0b1120',
            }}
          >
            RB
          </div>
          <span className="text-xs font-semibold text-slate-100">
            RiddimBase
          </span>
        </div>
        <div className="hidden items-center gap-3 text-[11px] text-slate-400 sm:flex">
          {(nav.links || [])
            .filter((l) => l.visible !== false)
            .slice(0, 4)
            .map((l) => (
              <span key={l.id} className="hover:text-slate-100">
                {l.label}
              </span>
            ))}
        </div>
        <button
          type="button"
          className="rounded-full bg-white/90 px-3 py-1 text-[10px] font-semibold text-slate-900 shadow"
        >
          Sign up
        </button>
      </div>

      <div
        className="mt-4 rounded-2xl border border-slate-800/80 bg-gradient-to-br from-slate-950 via-slate-950 to-slate-900 p-5"
        style={{
          backgroundImage: banner?.backgroundUrl
            ? `linear-gradient(to bottom, rgba(15,23,42,0.95), rgba(15,23,42,0.98)), url(${banner.backgroundUrl})`
            : undefined,
          backgroundSize: banner?.backgroundUrl ? 'cover' : undefined,
          backgroundPosition: 'center',
        }}
      >
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
          Hero Preview
        </p>
        <h3 className="mt-2 text-sm font-bold text-slate-50">
          {banner?.title || 'Your first hit starts here.'}
        </h3>
        <p className="mt-1 text-[11px] text-slate-400">
          {banner?.subtitle ||
            'Showcase your best beats, soundkits and services on the homepage.'}
        </p>
        <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
          <button
            type="button"
            className="rounded-full bg-white px-4 py-1.5 font-semibold text-slate-900 shadow"
          >
            {banner?.ctaText || 'Explore beats'}
          </button>
          <button
            type="button"
            className="rounded-full border border-slate-700/80 bg-slate-900/80 px-4 py-1.5 font-semibold text-slate-100"
          >
            Learn more
          </button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3 text-[10px] text-slate-300">
        <ColorChip label="Primary" value={theme.primaryColor || '#ef4444'} />
        <ColorChip label="Accent" value={theme.accentColor || '#f97316'} />
        <ColorChip label="Background" value={theme.backgroundColor || '#020617'} />
      </div>
    </div>
  )
}

function ColorChip({ label, value }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className="h-5 w-5 rounded-md border border-slate-700/70"
        style={{ backgroundColor: value }}
      />
      <div className="flex flex-col">
        <span className="text-[10px] text-slate-400">{label}</span>
        <span className="font-mono text-[10px] text-slate-200">{value}</span>
      </div>
    </div>
  )
}

export default ThemePreview


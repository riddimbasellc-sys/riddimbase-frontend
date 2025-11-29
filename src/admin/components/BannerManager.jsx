import React from 'react'

export function BannerManager({ banners, onChange }) {
  const handleUpdate = (index, patch) => {
    const next = banners.map((b, i) =>
      i === index ? { ...b, ...patch } : b,
    )
    onChange(next)
  }

  const handleAdd = () => {
    const next = [
      ...banners,
      {
        id: `banner_${Date.now()}`,
        title: 'New homepage banner',
        subtitle: 'Describe what you want to promote.',
        backgroundUrl: '',
        ctaText: 'Explore',
        ctaHref: '/beats',
        active: banners.length === 0,
      },
    ]
    onChange(next)
  }

  const handleRemove = (index) => {
    const next = banners.filter((_, i) => i !== index)
    if (next.length > 0 && !next.some((b) => b.active)) {
      next[0].active = true
    }
    onChange(next)
  }

  const setActive = (index) => {
    const next = banners.map((b, i) => ({ ...b, active: i === index }))
    onChange(next)
  }

  return (
    <div className="rounded-2xl border border-slate-800/80 bg-slate-900/80 p-4 shadow-rb-gloss-panel">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-slate-100">Homepage hero banners</h3>
          <p className="mt-1 text-[11px] text-slate-400">
            Control the rotating hero banners on the RiddimBase homepage.
          </p>
        </div>
        <button
          type="button"
          onClick={handleAdd}
          className="rounded-full bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-900 shadow hover:bg-slate-100"
        >
          + Add banner
        </button>
      </div>
      <div className="mt-4 space-y-3">
        {banners.length === 0 && (
          <p className="text-[11px] text-slate-500">
            No banners configured. Add at least one to feature content on the homepage.
          </p>
        )}
        {banners.map((banner, index) => (
          <div
            key={banner.id || index}
            className="rounded-xl border border-slate-800/80 bg-slate-950/80 p-3 text-xs"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <label className="inline-flex items-center gap-1 text-[10px] text-slate-300">
                  <input
                    type="radio"
                    name="active-banner"
                    checked={!!banner.active}
                    onChange={() => setActive(index)}
                    className="h-3 w-3 border-slate-600 bg-slate-900 text-red-500"
                  />
                  <span>Active</span>
                </label>
                <span className="text-[10px] text-slate-500">
                  ID: {banner.id || 'unnamed'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleRemove(index)}
                className="rounded-full border border-red-500/70 bg-red-500/10 px-2 py-1 text-[10px] text-red-300 hover:bg-red-500/20"
              >
                Remove
              </button>
            </div>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <div>
                <label className="text-[10px] font-medium text-slate-200">
                  Title
                </label>
                <input
                  type="text"
                  value={banner.title || ''}
                  onChange={(e) => handleUpdate(index, { title: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-700/80 bg-slate-900/80 px-2 py-1 text-[11px] text-slate-100 placeholder:text-slate-500 focus:border-red-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] font-medium text-slate-200">
                  Subtitle
                </label>
                <input
                  type="text"
                  value={banner.subtitle || ''}
                  onChange={(e) => handleUpdate(index, { subtitle: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-700/80 bg-slate-900/80 px-2 py-1 text-[11px] text-slate-100 placeholder:text-slate-500 focus:border-red-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] font-medium text-slate-200">
                  Background image URL
                </label>
                <input
                  type="text"
                  value={banner.backgroundUrl || ''}
                  onChange={(e) =>
                    handleUpdate(index, { backgroundUrl: e.target.value })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-700/80 bg-slate-900/80 px-2 py-1 text-[11px] text-slate-100 placeholder:text-slate-500 focus:border-red-400 focus:outline-none"
                  placeholder="https://…"
                />
              </div>
              <div className="grid gap-2 sm:grid-cols-[minmax(0,1.1fr),minmax(0,1fr)]">
                <div>
                  <label className="text-[10px] font-medium text-slate-200">
                    CTA text
                  </label>
                  <input
                    type="text"
                    value={banner.ctaText || ''}
                    onChange={(e) => handleUpdate(index, { ctaText: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-700/80 bg-slate-900/80 px-2 py-1 text-[11px] text-slate-100 placeholder:text-slate-500 focus:border-red-400 focus:outline-none"
                    placeholder="Explore beats"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-medium text-slate-200">
                    CTA link
                  </label>
                  <input
                    type="text"
                    value={banner.ctaHref || ''}
                    onChange={(e) => handleUpdate(index, { ctaHref: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-700/80 bg-slate-900/80 px-2 py-1 text-[11px] text-slate-100 placeholder:text-slate-500 focus:border-red-400 focus:outline-none"
                    placeholder="/beats"
                  />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default BannerManager


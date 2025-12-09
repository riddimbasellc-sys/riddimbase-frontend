import React from 'react'
import { FilePickerButton } from '../../components/FilePickerButton'
import { uploadHeroBackground } from '../../services/storageService'

export function BannerManager({ banners, onChange }) {
  const handleUpdate = (index, patch) => {
    const next = banners.map((b, i) => (i === index ? { ...b, ...patch } : b))
    onChange(next)
  }

  const handleAdd = () => {
    const next = [
      ...banners,
      {
        id: `banner-${Date.now()}`,
        title: 'New hero headline',
        subtitle: 'Describe what this section promotes.',
        backgroundUrl: '',
        ctaText: 'Explore beats',
        ctaHref: '/beats',
        active: !banners.length,
      },
    ]
    onChange(next)
  }

  const handleRemove = (index) => {
    const next = banners.filter((_, i) => i !== index)
    if (next.length && !next.some((b) => b.active)) {
      next[0].active = true
    }
    onChange(next)
  }

  const setActive = (index) => {
    const next = banners.map((b, i) => ({ ...b, active: i === index }))
    onChange(next)
  }

  const handleBackgroundSelect = async (index, file) => {
    if (!file) {
      handleUpdate(index, { backgroundUrl: '' })
      return
    }
    try {
      const { publicUrl } = await uploadHeroBackground(file)
      handleUpdate(index, { backgroundUrl: publicUrl })
    } catch (err) {
      console.warn('[BannerManager] hero background upload failed', err)
    }
  }

  return (
    <div className="rounded-2xl border border-slate-800/80 bg-slate-900/80 p-4 shadow-rb-gloss-panel">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-slate-100">
            Hero banners
          </h3>
          <p className="mt-1 text-[11px] text-slate-400">
            Manage the hero slides shown at the top of your homepage.
          </p>
        </div>
        <button
          type="button"
          onClick={handleAdd}
          className="rounded-full bg-red-500 px-3 py-1.5 text-[11px] font-semibold text-slate-50 hover:bg-red-400"
        >
          Add banner
        </button>
      </div>

      <div className="mt-4 space-y-3 text-[11px]">
        {banners.map((banner, index) => (
          <div
            key={banner.id || index}
            className="rounded-xl border border-slate-800/80 bg-slate-950/80 p-3"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1 space-y-2">
                <div>
                  <label className="text-[10px] font-medium text-slate-400">
                    Title
                  </label>
                  <input
                    className="mt-1 w-full rounded-md border border-slate-700/80 bg-slate-900/80 px-2 py-1 text-[11px] text-slate-100 focus:border-red-400 focus:outline-none"
                    value={banner.title || ''}
                    onChange={(e) =>
                      handleUpdate(index, { title: e.target.value })
                    }
                    placeholder="Hero headline"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-medium text-slate-400">
                    Subtitle
                  </label>
                  <input
                    className="mt-1 w-full rounded-md border border-slate-700/80 bg-slate-900/80 px-2 py-1 text-[11px] text-slate-100 focus:border-red-400 focus:outline-none"
                    value={banner.subtitle || ''}
                    onChange={(e) =>
                      handleUpdate(index, { subtitle: e.target.value })
                    }
                    placeholder="Supporting copy"
                  />
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div>
                    <FilePickerButton
                      label="Background image / video"
                      accept="image/,video/"
                      onSelect={(file) => handleBackgroundSelect(index, file)}
                      progress={0}
                      file={null}
                    />
                    {banner.backgroundUrl && (
                      <p className="mt-1 text-[10px] text-slate-500 truncate">
                        Current: {banner.backgroundUrl}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="text-[10px] font-medium text-slate-400">
                      CTA label & link
                    </label>
                    <div className="mt-1 flex gap-1">
                      <input
                        className="w-24 flex-shrink-0 rounded-md border border-slate-700/80 bg-slate-900/80 px-2 py-1 text-[11px] text-slate-100 focus:border-red-400 focus:outline-none"
                        value={banner.ctaText || ''}
                        onChange={(e) =>
                          handleUpdate(index, { ctaText: e.target.value })
                        }
                        placeholder="Explore"
                      />
                      <input
                        className="flex-1 rounded-md border border-slate-700/80 bg-slate-900/80 px-2 py-1 text-[11px] text-slate-100 focus:border-red-400 focus:outline-none"
                        value={banner.ctaHref || ''}
                        onChange={(e) =>
                          handleUpdate(index, { ctaHref: e.target.value })
                        }
                        placeholder="/beats"
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <button
                  type="button"
                  onClick={() => setActive(index)}
                  className={`rounded-full px-3 py-1 text-[10px] font-semibold ${
                    banner.active
                      ? 'bg-emerald-500 text-slate-950'
                      : 'border border-slate-700/80 text-slate-300 hover:border-emerald-400/80'
                  }`}
                >
                  {banner.active ? 'Active' : 'Set active'}
                </button>
                <button
                  type="button"
                  onClick={() => handleRemove(index)}
                  className="rounded-full border border-red-500/70 px-3 py-1 text-[10px] font-semibold text-red-300 hover:bg-red-500/10"
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        ))}

        {banners.length === 0 && (
          <p className="text-[11px] text-slate-500">
            No hero banners configured yet. Add one to control the top section
            of your homepage.
          </p>
        )}
      </div>
    </div>
  )
}

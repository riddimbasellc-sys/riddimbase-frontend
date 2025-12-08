import React, { useEffect, useState } from 'react'
import {
  fetchAllTestimonials,
  upsertTestimonial,
  deleteTestimonial,
} from '../../services/testimonialsService'
import { FilePickerButton } from '../../components/FilePickerButton'
import { uploadAvatar, uploadTestimonialMedia } from '../../services/storageService'

export function TestimonialsManager() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(null)
  const [error, setError] = useState(null)
  const [avatarProgress, setAvatarProgress] = useState(0)
  const [mediaProgress, setMediaProgress] = useState(0)

  useEffect(() => {
    let active = true
    ;(async () => {
      setLoading(true)
      try {
        const data = await fetchAllTestimonials()
        if (!active) return
        setItems(data)
      } catch (err) {
        if (!active) return
        setError(err.message || 'Failed to load testimonials')
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [])

  const startNew = () => {
    setEditing({
      id: null,
      role: '',
      name: '',
      location: '',
      quote: '',
      avatar_url: '',
      media_url: '',
      media_type: 'image',
      highlight: false,
      order_index: items.length,
      published: true,
    })
  }

  const startEdit = (item) => {
    setEditing({
      ...item,
      media_type: item.media_type || 'image',
    })
  }

  const handleChange = (patch) => {
    setEditing((prev) => ({ ...prev, ...patch }))
  }

  const handleSave = async () => {
    if (!editing || !editing.quote.trim()) return
    setSaving(true)
    setError(null)
    try {
      const payload = {
        id: editing.id || undefined,
        role: editing.role || null,
        name: editing.name || null,
        location: editing.location || null,
        quote: editing.quote,
        avatar_url: editing.avatar_url || null,
        media_url: editing.media_url || null,
        media_type: editing.media_url ? editing.media_type || 'image' : null,
        highlight: !!editing.highlight,
        order_index:
          typeof editing.order_index === 'number'
            ? editing.order_index
            : items.length,
        published: editing.published !== false,
      }
      const saved = await upsertTestimonial(payload)
      setItems((prev) => {
        const existing = prev.find((p) => p.id === saved.id)
        if (existing) {
          return prev.map((p) => (p.id === saved.id ? saved : p))
        }
        return [...prev, saved].sort(
          (a, b) =>
            (a.order_index ?? 0) - (b.order_index ?? 0) ||
            new Date(b.created_at || 0) - new Date(a.created_at || 0),
        )
      })
      setEditing(null)
    } catch (err) {
      setError(err.message || 'Failed to save testimonial')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!id) return
    if (!window.confirm('Delete this testimonial permanently?')) return
    try {
      await deleteTestimonial(id)
      setItems((prev) => prev.filter((p) => p.id !== id))
      if (editing && editing.id === id) setEditing(null)
    } catch (err) {
      setError(err.message || 'Failed to delete testimonial')
    }
  }

  const handleAvatarSelect = async (file) => {
    setAvatarProgress(0)
    if (!file) {
      handleChange({ avatar_url: '' })
      return
    }
    try {
      setAvatarProgress(10)
      const { publicUrl } = await uploadAvatar(file)
      handleChange({ avatar_url: publicUrl })
      setAvatarProgress(100)
    } catch (err) {
      console.warn('[TestimonialsManager] avatar upload error', err)
      setError(err.message || 'Failed to upload avatar image')
      setAvatarProgress(0)
    }
  }

  const handleMediaSelect = async (file) => {
    setMediaProgress(0)
    if (!file) {
      handleChange({ media_url: '', media_type: 'image' })
      return
    }
    try {
      setMediaProgress(10)
      const { publicUrl } = await uploadTestimonialMedia(file)
      const kind = (file.type || '').startsWith('video/') ? 'video' : 'image'
      handleChange({ media_url: publicUrl, media_type: kind })
      setMediaProgress(100)
    } catch (err) {
      console.warn('[TestimonialsManager] media upload error', err)
      setError(err.message || 'Failed to upload media')
      setMediaProgress(0)
    }
  }

  return (
    <div className="rounded-2xl border border-slate-800/80 bg-slate-900/80 p-4 shadow-rb-gloss-panel">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-100">Testimonials</h3>
          <p className="mt-1 text-[11px] text-slate-400">
            Curate creator stories for the landing page. Think BeatStars-style,
            with strong visuals and short quotes.
          </p>
        </div>
        <button
          type="button"
          onClick={startNew}
          className="rounded-full bg-emerald-500 px-4 py-1.5 text-[11px] font-semibold text-slate-950 hover:bg-emerald-400"
        >
          New testimonial
        </button>
      </div>

      {error && (
        <p className="mt-3 rounded-md border border-red-500/60 bg-red-500/10 px-2 py-1 text-[11px] text-red-200">
          {error}
        </p>
      )}

      <div className="mt-4 grid gap-4 md:grid-cols-[minmax(0,1.2fr),minmax(0,0.9fr)] text-[11px]">
        <div className="space-y-3">
          {loading && (
            <p className="text-slate-400">Loading testimonials…</p>
          )}
          {!loading && items.length === 0 && (
            <p className="text-slate-500">
              No testimonials yet. Add 3–6 strong quotes from real producers
              and artists.
            </p>
          )}
          {!loading &&
            items.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => startEdit(t)}
                className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2 text-left transition ${
                  editing && editing.id === t.id
                    ? 'border-emerald-400/70 bg-emerald-500/10'
                    : 'border-slate-800/80 bg-slate-950/80 hover:border-slate-700/80'
                }`}
              >
                <div className="h-9 w-9 flex-shrink-0 overflow-hidden rounded-full bg-slate-800/80">
                  {t.avatar_url ? (
                    <img
                      src={t.avatar_url}
                      alt={t.name || 'Avatar'}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[10px] text-slate-400">
                      {t.name
                        ? t.name
                            .split(' ')
                            .filter(Boolean)
                            .slice(0, 2)
                            .map((p) => p[0])
                            .join('')
                            .toUpperCase()
                        : 'RB'}
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-1 text-[11px] font-semibold text-slate-100">
                    {t.name || 'Untitled'}{' '}
                    {t.role ? (
                      <span className="text-slate-400">· {t.role}</span>
                    ) : null}
                  </p>
                  <p className="line-clamp-2 text-[10px] text-slate-400">
                    {t.quote}
                  </p>
                  {t.media_url && (
                    <p className="mt-0.5 text-[9px] text-slate-500">
                      {t.media_type === 'video' ? 'Video' : 'Image'} attached
                    </p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1 text-[9px] text-slate-400">
                  {t.highlight && (
                    <span className="rounded-full border border-amber-400/70 bg-amber-500/10 px-2 py-[1px] text-amber-200">
                      Highlight
                    </span>
                  )}
                  {!t.published && (
                    <span className="rounded-full border border-slate-600/80 bg-slate-800/80 px-2 py-[1px]">
                      Hidden
                    </span>
                  )}
                </div>
              </button>
            ))}
        </div>

        <div className="rounded-2xl border border-slate-800/80 bg-slate-950/80 p-3">
          <h4 className="text-[12px] font-semibold text-slate-100">
            {editing?.id ? 'Edit testimonial' : 'Create testimonial'}
          </h4>
          <p className="mt-1 text-[10px] text-slate-500">
            Short, specific quotes work best. Link images or videos hosted on
            a CDN (S3, Cloudflare, etc.).
          </p>

          {editing ? (
            <form
              className="mt-3 space-y-2"
              onSubmit={(e) => {
                e.preventDefault()
                if (!saving) handleSave()
              }}
            >
              <div className="grid gap-2 sm:grid-cols-2">
                <div>
                  <label className="text-[10px] font-medium text-slate-300">
                    Name
                  </label>
                  <input
                    className="mt-1 w-full rounded-md border border-slate-700/80 bg-slate-900/80 px-2 py-1.5 text-[11px] text-slate-100 focus:border-emerald-400/70 focus:outline-none"
                    value={editing.name || ''}
                    onChange={(e) => handleChange({ name: e.target.value })}
                    placeholder="e.g. Jahmel Beats"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-medium text-slate-300">
                    Role
                  </label>
                  <input
                    className="mt-1 w-full rounded-md border border-slate-700/80 bg-slate-900/80 px-2 py-1.5 text-[11px] text-slate-100 focus:border-emerald-400/70 focus:outline-none"
                    value={editing.role || ''}
                    onChange={(e) => handleChange({ role: e.target.value })}
                    placeholder="e.g. Dancehall Producer"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-medium text-slate-300">
                  Location
                </label>
                <input
                  className="mt-1 w-full rounded-md border border-slate-700/80 bg-slate-900/80 px-2 py-1.5 text-[11px] text-slate-100 focus:border-emerald-400/70 focus:outline-none"
                  value={editing.location || ''}
                  onChange={(e) =>
                    handleChange({ location: e.target.value })
                  }
                  placeholder="e.g. Kingston, Jamaica"
                />
              </div>
              <div>
                <label className="text-[10px] font-medium text-slate-300">
                  Quote
                </label>
                <textarea
                  className="mt-1 h-20 w-full rounded-md border border-slate-700/80 bg-slate-900/80 px-2 py-1.5 text-[11px] text-slate-100 focus:border-emerald-400/70 focus:outline-none"
                  value={editing.quote || ''}
                  onChange={(e) => handleChange({ quote: e.target.value })}
                  placeholder="Describe how RiddimBase helps their career."
                />
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <div>
                  <FilePickerButton
                    label="Avatar image"
                    accept="image/"
                    onSelect={handleAvatarSelect}
                    progress={avatarProgress}
                    file={null}
                  />
                  {editing.avatar_url && (
                    <p className="mt-1 text-[10px] text-slate-500 truncate">
                      Stored: {editing.avatar_url}
                    </p>
                  )}
                </div>
                <div>
                  <FilePickerButton
                    label="Media (image or video)"
                    accept="image/,video/"
                    onSelect={handleMediaSelect}
                    progress={mediaProgress}
                    file={null}
                  />
                  {editing.media_url && (
                    <p className="mt-1 text-[10px] text-slate-500 truncate">
                      Stored: {editing.media_url}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <label className="inline-flex items-center gap-2 text-[10px] text-slate-300">
                  <input
                    type="checkbox"
                    className="h-3 w-3 rounded border-slate-600 bg-slate-900"
                    checked={!!editing.highlight}
                    onChange={(e) =>
                      handleChange({ highlight: e.target.checked })
                    }
                  />
                  <span>Feature as highlight</span>
                </label>
                <label className="inline-flex items-center gap-2 text-[10px] text-slate-300">
                  <input
                    type="checkbox"
                    className="h-3 w-3 rounded border-slate-600 bg-slate-900"
                    checked={editing.published !== false}
                    onChange={(e) =>
                      handleChange({ published: e.target.checked })
                    }
                  />
                  <span>Published</span>
                </label>
                <div className="ml-auto flex items-center gap-1">
                  <span className="text-[9px] text-slate-500">Order</span>
                  <input
                    type="number"
                    className="h-6 w-14 rounded-md border border-slate-700/80 bg-slate-900/80 px-1 text-[10px] text-slate-100 focus:border-emerald-400/70 focus:outline-none"
                    value={
                      typeof editing.order_index === 'number'
                        ? editing.order_index
                        : 0
                    }
                    onChange={(e) =>
                      handleChange({
                        order_index: Number(e.target.value) || 0,
                      })
                    }
                  />
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setEditing(null)}
                  className="rounded-full border border-slate-700/80 px-4 py-1.5 text-[11px] font-medium text-slate-200 hover:bg-slate-800/80"
                >
                  Cancel
                </button>
                <div className="flex items-center gap-2">
                  {editing.id && (
                    <button
                      type="button"
                      onClick={() => handleDelete(editing.id)}
                      className="rounded-full border border-red-500/70 px-4 py-1.5 text-[11px] font-medium text-red-200 hover:bg-red-500/10"
                    >
                      Delete
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-full bg-emerald-500 px-5 py-1.5 text-[11px] font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-60"
                  >
                    {saving ? 'Saving…' : 'Save testimonial'}
                  </button>
                </div>
              </div>
            </form>
          ) : (
            <p className="mt-3 text-[11px] text-slate-500">
              Select an existing testimonial or click "New testimonial" to
              create one.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

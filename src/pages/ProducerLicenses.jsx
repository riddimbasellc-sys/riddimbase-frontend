import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ProducerLayout from '../components/ProducerLayout'
import useSupabaseUser from '../hooks/useSupabaseUser'
import {
  listProducerLicenses,
  createLicense,
  updateLicense,
  deleteLicense,
} from '../services/licenseService'

function EmptyState({ onCreate }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-800/80 bg-slate-950/80 px-6 py-10 text-center">
      <p className="text-sm font-semibold text-slate-100">
        No licenses yet
      </p>
      <p className="mt-1 max-w-sm text-[11px] text-slate-400">
        Create reusable license templates (Basic Lease, Premium, Exclusive)
        and attach them to your beats during upload.
      </p>
      <button
        type="button"
        onClick={onCreate}
        className="mt-4 rounded-full bg-emerald-500 px-5 py-2 text-[11px] font-semibold text-slate-950 shadow-rb-gloss-btn hover:bg-emerald-400"
      >
        Create License
      </button>
    </div>
  )
}

function LicenseCard({ license, onEdit, onDelete }) {
  const usage = useMemo(() => {
    const items = []
    if (license.distribution_allowed) items.push('🌐 Distribution')
    if (license.radio_allowed) items.push('📻 Radio')
    if (license.music_video_allowed) items.push('🎬 Music Video')
    if (license.stems_included) items.push('🎚 Stems')
    if (license.ownership_transfer) items.push('📜 Ownership Transfer')
    return items
  }, [license])

  return (
    <div className="flex flex-col justify-between rounded-2xl border border-slate-800/80 bg-slate-950/80 p-4 text-[11px] text-slate-200 shadow-rb-gloss-panel">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-slate-100">
              {license.name}
            </h3>
            {license.is_exclusive && (
              <span className="rounded-full border border-amber-400/70 bg-amber-500/15 px-2 py-[2px] text-[10px] font-semibold text-amber-300">
                Exclusive
              </span>
            )}
          </div>
          <p className="mt-1 text-xs font-semibold text-emerald-300">
            ${Number(license.price || 0).toFixed(2)}
          </p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-[10px] text-slate-300">
        {license.streams_allowed != null && (
          <span className="rounded-full bg-slate-900/90 px-2 py-1">
            🎧 {license.streams_allowed.toLocaleString()} streams
          </span>
        )}
        {license.downloads_allowed != null && (
          <span className="rounded-full bg-slate-900/90 px-2 py-1">
           ⬇ {license.downloads_allowed.toLocaleString()} downloads
          </span>
        )}
        {usage.map((u) => (
          <span key={u} className="rounded-full bg-slate-900/90 px-2 py-1">
            {u}
          </span>
        ))}
        {!usage.length && (
          <span className="rounded-full bg-slate-900/90 px-2 py-1 text-slate-500">
            Configure usage rights in edit
          </span>
        )}
      </div>
      {license.notes && (
        <p className="mt-2 line-clamp-2 text-[10px] text-slate-400">
          {license.notes}
        </p>
      )}
      <div className="mt-4 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onEdit}
          className="rounded-full border border-slate-700/80 px-3 py-1 text-[10px] font-semibold text-slate-200 hover:border-emerald-400/70 hover:text-emerald-200"
        >
          Edit
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="rounded-full border border-red-500/70 px-3 py-1 text-[10px] font-semibold text-red-300 hover:bg-red-500/10"
        >
          Delete
        </button>
      </div>
    </div>
  )
}

function LicenseModal({
  open,
  onClose,
  initial,
  onSave,
  saving,
}) {
  const [name, setName] = useState(initial?.name || '')
  const [price, setPrice] = useState(initial?.price ?? 29)
  const [streams, setStreams] = useState(initial?.streams_allowed ?? '')
  const [downloads, setDownloads] = useState(initial?.downloads_allowed ?? '')
  const [isExclusive, setIsExclusive] = useState(!!initial?.is_exclusive)
  const [distribution, setDistribution] = useState(
    initial?.distribution_allowed ?? true,
  )
  const [radio, setRadio] = useState(initial?.radio_allowed ?? false)
  const [video, setVideo] = useState(initial?.music_video_allowed ?? false)
  const [stems, setStems] = useState(initial?.stems_included ?? false)
  const [ownership, setOwnership] = useState(
    initial?.ownership_transfer ?? false,
  )
  const [notes, setNotes] = useState(initial?.notes || '')

  useEffect(() => {
    if (!open) return
    setName(initial?.name || '')
    setPrice(initial?.price ?? 29)
    setStreams(initial?.streams_allowed ?? '')
    setDownloads(initial?.downloads_allowed ?? '')
    setIsExclusive(!!initial?.is_exclusive)
    setDistribution(initial?.distribution_allowed ?? true)
    setRadio(initial?.radio_allowed ?? false)
    setVideo(initial?.music_video_allowed ?? false)
    setStems(initial?.stems_included ?? false)
    setOwnership(initial?.ownership_transfer ?? false)
    setNotes(initial?.notes || '')
  }, [open, initial])

  if (!open) return null

  const handleSubmit = (e) => {
    e.preventDefault()
    const payload = {
      name,
      price,
      streams_allowed: streams,
      downloads_allowed: downloads,
      is_exclusive: isExclusive,
      distribution_allowed: distribution,
      radio_allowed: radio,
      music_video_allowed: video,
      stems_included: stems,
      ownership_transfer: ownership,
      notes,
    }
    onSave(payload)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/80 backdrop-blur-sm sm:items-center">
      <div className="w-full max-w-lg rounded-t-3xl border border-slate-800/80 bg-slate-950/95 p-4 shadow-rb-gloss-panel sm:rounded-3xl sm:p-5">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Licensing
            </p>
            <h2 className="text-sm font-semibold text-slate-100">
              {initial ? 'Edit License' : 'Create License'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-slate-900 px-3 py-1 text-[11px] text-slate-300 hover:bg-slate-800"
          >
            Close
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3 text-[11px]">
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1.4fr),minmax(0,0.9fr)]">
            <div>
              <label className="text-[10px] font-medium text-slate-300">
                License name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Basic Lease, Premium, Exclusive…"
                className="mt-1 w-full rounded-md border border-slate-800/80 bg-slate-950/80 px-2 py-1.5 text-[11px] text-slate-100 focus:border-emerald-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] font-medium text-slate-300">
                Price (USD)
              </label>
              <input
                type="number"
                min="0"
                step="1"
                required
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-800/80 bg-slate-950/80 px-2 py-1.5 text-[11px] text-slate-100 focus:border-emerald-400 focus:outline-none"
              />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-[10px] font-medium text-slate-300">
                Streams limit (optional)
              </label>
              <input
                type="number"
                min="0"
                value={streams}
                onChange={(e) => setStreams(e.target.value)}
                placeholder="e.g. 50000"
                className="mt-1 w-full rounded-md border border-slate-800/80 bg-slate-950/80 px-2 py-1.5 text-[11px] text-slate-100 focus:border-emerald-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] font-medium text-slate-300">
                Downloads limit (optional)
              </label>
              <input
                type="number"
                min="0"
                value={downloads}
                onChange={(e) => setDownloads(e.target.value)}
                placeholder="e.g. 1000"
                className="mt-1 w-full rounded-md border border-slate-800/80 bg-slate-950/80 px-2 py-1.5 text-[11px] text-slate-100 focus:border-emerald-400 focus:outline-none"
              />
            </div>
          </div>
          <div>
            <p className="text-[10px] font-medium text-slate-300">
              Usage rights
            </p>
            <div className="mt-2 grid grid-cols-2 gap-2 text-[10px] text-slate-200 sm:grid-cols-3">
              <label className="inline-flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={distribution}
                  onChange={(e) => setDistribution(e.target.checked)}
                  className="h-3 w-3 rounded border-slate-700 bg-slate-950 text-emerald-400 focus:ring-emerald-500"
                />
                <span>Distribution</span>
              </label>
              <label className="inline-flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={radio}
                  onChange={(e) => setRadio(e.target.checked)}
                  className="h-3 w-3 rounded border-slate-700 bg-slate-950 text-emerald-400 focus:ring-emerald-500"
                />
                <span>Radio</span>
              </label>
              <label className="inline-flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={video}
                  onChange={(e) => setVideo(e.target.checked)}
                  className="h-3 w-3 rounded border-slate-700 bg-slate-950 text-emerald-400 focus:ring-emerald-500"
                />
                <span>Music Video</span>
              </label>
              <label className="inline-flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={stems}
                  onChange={(e) => setStems(e.target.checked)}
                  className="h-3 w-3 rounded border-slate-700 bg-slate-950 text-emerald-400 focus:ring-emerald-500"
                />
                <span>Stems Included</span>
              </label>
              <label className="inline-flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={ownership}
                  onChange={(e) => setOwnership(e.target.checked)}
                  className="h-3 w-3 rounded border-slate-700 bg-slate-950 text-emerald-400 focus:ring-emerald-500"
                />
                <span>Ownership Transfer</span>
              </label>
              <label className="inline-flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={isExclusive}
                  onChange={(e) => setIsExclusive(e.target.checked)}
                  className="h-3 w-3 rounded border-slate-700 bg-slate-950 text-emerald-400 focus:ring-emerald-500"
                />
                <span>Exclusive License</span>
              </label>
            </div>
          </div>
          <div>
            <label className="text-[10px] font-medium text-slate-300">
              Notes (shown to buyers)
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Include any extra terms or notes specific to this license."
              className="mt-1 w-full rounded-md border border-slate-800/80 bg-slate-950/80 px-2 py-1.5 text-[11px] text-slate-100 focus:border-emerald-400 focus:outline-none"
            />
          </div>
          <div className="flex items-center justify-between pt-1 text-[10px] text-slate-500">
            <p>
              These templates are reusable across beats. Future edits only
              affect new purchases.
            </p>
            <button
              type="submit"
              disabled={saving}
              className="rounded-full bg-emerald-500 px-4 py-1.5 text-[11px] font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Save License'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function ProducerLicenses() {
  const navigate = useNavigate()
  const { user, loading } = useSupabaseUser()
  const [licenses, setLicenses] = useState([])
  const [loadingLicenses, setLoadingLicenses] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!loading && !user) navigate('/login')
  }, [loading, user, navigate])

  useEffect(() => {
    let active = true
    if (!user?.id) {
      setLicenses([])
      setLoadingLicenses(false)
      return
    }
    ;(async () => {
      setLoadingLicenses(true)
      const rows = await listProducerLicenses(user.id)
      if (!active) return
      setLicenses(rows)
      setLoadingLicenses(false)
    })()
    return () => {
      active = false
    }
  }, [user?.id])

  const handleCreate = () => {
    setEditing(null)
    setModalOpen(true)
  }

  const handleEdit = (lic) => {
    setEditing(lic)
    setModalOpen(true)
  }

  const handleDelete = async (lic) => {
    if (!user?.id) return
    // eslint-disable-next-line no-alert
    const ok = window.confirm('Delete this license? Beats using it will no longer offer it to buyers.')
    if (!ok) return
    try {
      await deleteLicense(lic.id, user.id)
      setLicenses((prev) => prev.filter((l) => l.id !== lic.id))
    } catch (e) {
      setError(e.message || 'Failed to delete license')
    }
  }

  const handleSave = async (payload) => {
    if (!user?.id) return
    setSaving(true)
    setError('')
    try {
      if (editing) {
        const updated = await updateLicense(editing.id, user.id, payload)
        setLicenses((prev) => prev.map((l) => (l.id === updated.id ? updated : l)))
      } else {
        const created = await createLicense({
          producerId: user.id,
          name: payload.name,
          price: payload.price,
          isExclusive: payload.is_exclusive,
          streamsAllowed: payload.streams_allowed,
          downloadsAllowed: payload.downloads_allowed,
          distributionAllowed: payload.distribution_allowed,
          radioAllowed: payload.radio_allowed,
          musicVideoAllowed: payload.music_video_allowed,
          stemsIncluded: payload.stems_included,
          ownershipTransfer: payload.ownership_transfer,
          notes: payload.notes,
        })
        setLicenses((prev) => [created, ...prev])
      }
      setModalOpen(false)
      setEditing(null)
    } catch (e) {
      setError(e.message || 'Failed to save license')
    } finally {
      setSaving(false)
    }
  }

  return (
    <ProducerLayout
      title="Licenses"
      subtitle="Manage reusable license templates for your beats."
      actions={
        <button
          type="button"
          onClick={handleCreate}
          className="rounded-full bg-emerald-500 px-4 py-1.5 text-[11px] font-semibold text-slate-950 shadow-rb-gloss-btn hover:bg-emerald-400"
        >
          New License
        </button>
      }
    >
      <div className="space-y-4">
        {error && (
          <div className="rounded-xl border border-red-500/60 bg-red-500/10 px-3 py-2 text-[11px] text-red-200">
            {error}
          </div>
        )}
        {loadingLicenses ? (
          <p className="text-[11px] text-slate-400">Loading licenses…</p>
        ) : licenses.length === 0 ? (
          <EmptyState onCreate={handleCreate} />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {licenses.map((lic) => (
              <LicenseCard
                key={lic.id}
                license={lic}
                onEdit={() => handleEdit(lic)}
                onDelete={() => handleDelete(lic)}
              />
            ))}
          </div>
        )}
        <p className="mt-2 text-[10px] text-slate-500">
          Tip: Attach these licenses to beats from the Upload Beat page.
        </p>
      </div>
      <LicenseModal
        open={modalOpen}
        onClose={() => {
          if (!saving) {
            setModalOpen(false)
            setEditing(null)
          }
        }}
        initial={editing}
        onSave={handleSave}
        saving={saving}
      />
    </ProducerLayout>
  )
}

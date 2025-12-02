import { useEffect, useState } from 'react'
import { useAdminRole } from '../hooks/useAdminRole'
import BackButton from '../components/BackButton'
import { listBeats } from '../services/beatsService'
import { fetchBeats } from '../services/beatsRepository'
import {
  adminHideBeat,
  adminDeleteBeat,
  adminFlagBeat,
} from '../services/adminBeatsRepository'

export function AdminBeats() {
  const { isAdmin, loading } = useAdminRole()
  const [items, setItems] = useState([])
  const [dataLoading, setDataLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    async function loadBeats() {
      setError('')
      try {
        const rows = await fetchBeats()
        if (!active) return
        if (rows && rows.length) {
          setItems(
            rows.map((b) => ({
              id: b.id,
              title: b.title,
              producer: b.producer || 'Unknown',
              userId: b.user_id || null,
              genre: b.genre || 'Dancehall',
              bpm: b.bpm || 100,
              price: b.price || 29,
              hidden: b.hidden || false,
              flagged: b.flagged || false,
            })),
          )
        } else {
          setItems(listBeats({ includeHidden: true }))
        }
      } catch (e) {
        setError(e.message || 'Failed to load beats. Showing local test data.')
        setItems(listBeats({ includeHidden: true }))
      } finally {
        if (active) setDataLoading(false)
      }
    }

    loadBeats()

    return () => {
      active = false
    }
  }, [])

  if (loading || dataLoading) {
    return (
      <section className="min-h-screen flex items-center justify-center bg-slate-950/95">
        <p className="text-sm text-slate-400">Loading…</p>
      </section>
    )
  }

  if (!isAdmin) {
    return (
      <section className="min-h-screen flex items-center justify-center bg-slate-950/95">
        <p className="text-sm text-slate-400">Access denied.</p>
      </section>
    )
  }

  const reloadFromServer = async () => {
    setDataLoading(true)
    setError('')
    try {
      const rows = await fetchBeats()
      if (rows && rows.length) {
        setItems(
          rows.map((b) => ({
            id: b.id,
            title: b.title,
            producer: b.producer || 'Unknown',
            userId: b.user_id || null,
            genre: b.genre || 'Dancehall',
            bpm: b.bpm || 100,
            price: b.price || 29,
            hidden: b.hidden || false,
            flagged: b.flagged || false,
          })),
        )
      } else {
        setItems(listBeats({ includeHidden: true }))
      }
    } catch (e) {
      setError(e.message || 'Failed to refresh beats.')
    } finally {
      setDataLoading(false)
    }
  }

  const doHide = async (id) => {
    try {
      await adminHideBeat(id)
      await reloadFromServer()
    } catch (e) {
      // eslint-disable-next-line no-alert
      alert(e.message || 'Failed to hide beat')
    }
  }

  const doDelete = async (id) => {
    // eslint-disable-next-line no-alert
    if (!window.confirm('Delete this beat permanently?')) return
    try {
      await adminDeleteBeat(id)
      await reloadFromServer()
    } catch (e) {
      // eslint-disable-next-line no-alert
      alert(e.message || 'Failed to delete beat')
    }
  }

  const doFlag = async (id) => {
    try {
      await adminFlagBeat(id)
      await reloadFromServer()
    } catch (e) {
      // eslint-disable-next-line no-alert
      alert(e.message || 'Failed to flag beat')
    }
  }

  return (
    <section className="bg-slate-950/95">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="flex items-center gap-3">
          <BackButton />
          <h1 className="font-display text-2xl font-semibold text-slate-50">
            Manage Beats
          </h1>
        </div>
        <p className="mt-1 text-sm text-slate-300">
          Admin tools for moderation. Supabase beats load first; local test beats show if none
          are present.
        </p>
        {error && (
          <p className="mt-2 text-[11px] text-rose-400">
            {error}
          </p>
        )}
        <div className="mt-6 space-y-3">
          {items.map((b) => (
            <div
              key={b.id}
              className="flex flex-col gap-2 rounded-xl border border-slate-800/80 bg-slate-900/80 p-4 md:flex-row md:items-center md:justify-between"
            >
              <div>
                <p className="text-sm font-semibold text-slate-100">
                  {b.title}{' '}
                  {b.hidden && (
                    <span className="ml-1 rounded-full bg-slate-800 px-2 py-0.5 text-[10px]">
                      Hidden
                    </span>
                  )}{' '}
                  {b.flagged && (
                    <span className="ml-1 rounded-full bg-red-600/20 px-2 py-0.5 text-[10px] text-red-400">
                      Flagged
                    </span>
                  )}
                </p>
                <p className="text-[11px] text-slate-400">
                  {b.producer} • {b.genre} • {b.bpm} BPM
                </p>
              </div>
              <div className="flex gap-2 text-[11px]">
                {!b.hidden && (
                  <button
                    onClick={() => doHide(b.id)}
                    className="rounded-full border border-slate-700/70 px-3 py-1 text-slate-300 hover:border-emerald-400/70"
                  >
                    Hide
                  </button>
                )}
                <button
                  onClick={() => doFlag(b.id)}
                  className="rounded-full border border-red-600/40 px-3 py-1 text-red-400 hover:bg-red-600/10"
                >
                  Flag
                </button>
                <button
                  onClick={() => doDelete(b.id)}
                  className="rounded-full border border-slate-700/70 px-3 py-1 text-slate-300 hover:border-red-500/70"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
          {items.length === 0 && (
            <p className="text-sm text-slate-400">No beats.</p>
          )}
        </div>
      </div>
    </section>
  )
}

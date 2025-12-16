import BackButton from '../components/BackButton'
import { useEffect, useState } from 'react'
import { useSales } from '../hooks/useSales'
import { fetchBeat as fetchBeatRemote } from '../services/beatsRepository'

export function ArtistDashboard() {
  const { sales, loading } = useSales()
  const [beatsById, setBeatsById] = useState({})

  useEffect(() => {
    let active = true
    ;(async () => {
      const ids = Array.from(new Set(sales.map((s) => s.beatId).filter(Boolean)))
      if (!ids.length) return
      const map = {}
      for (const id of ids) {
        const b = await fetchBeatRemote(id)
        if (b) map[id] = b
      }
      if (active) setBeatsById(map)
    })()
    return () => {
      active = false
    }
  }, [sales])

  const purchases = sales.map(s => ({ ...s, beat: beatsById[s.beatId] || null }))
  const timeAgoHours = (s) => {
    if (s.createdAt) {
      const diffMs = Date.now() - new Date(s.createdAt).getTime()
      return Math.max(0, Math.round(diffMs / 3600000))
    }
    if (typeof s.minutesAgo === 'number') return Math.round(s.minutesAgo / 60)
    return 0
  }
  return (
    <section className="bg-slate-950/95">
      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="flex items-center gap-3">
          <BackButton />
          <h1 className="font-display text-2xl font-semibold text-slate-50">Artist Dashboard</h1>
        </div>
        <p className="mt-1 text-sm text-slate-300">Your purchased beats and license tiers.</p>
        <div className="mt-6 space-y-3">
          {loading && <p className="text-[11px] text-slate-500">Loading purchases…</p>}
          {purchases.map(p => (
            <div key={p.beatId} className="flex items-center justify-between rounded-2xl border border-slate-800/80 bg-slate-900/80 p-4">
              <div>
                <p className="text-sm font-semibold text-slate-100">{p.beat?.title}</p>
                <p className="text-[11px] text-slate-400">{p.license} • from {p.beat?.producer}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-semibold text-emerald-400">${p.amount}</p>
                <p className="text-[11px] text-slate-500">{timeAgoHours(p)}h ago</p>
              </div>
            </div>
          ))}
          {!loading && purchases.length === 0 && <p className="text-sm text-slate-400">No purchases yet.</p>}
        </div>
      </div>
    </section>
  )
}

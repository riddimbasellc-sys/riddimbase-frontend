import { useEffect, useMemo, useState } from 'react'
import AdminLayout from '../components/AdminLayout'
import { useAdminRole } from '../hooks/useAdminRole'
import { useBeats } from '../hooks/useBeats'
import { getPlayCount, loadPlayCountsForBeats } from '../services/analyticsService'
import { fetchCountsForBeats, followerCount } from '../services/socialService'

const TIER_LABEL = {
  1: 'Tier 1 • 3 days',
  2: 'Tier 2 • 7 days',
  3: 'Tier 3 • 30 days',
}

const TIER_PRICE = {
  1: 5,
  2: 10,
  3: 25,
}

export function AdminAdsManager() {
  const { isAdmin, loading } = useAdminRole()
  const { beats } = useBeats()
  const [boosts, setBoosts] = useState([])
  const [boostLoading, setBoostLoading] = useState(true)
  const [counts, setCounts] = useState({ likeCounts: {}, favoriteCounts: {} })
  const [followers, setFollowers] = useState({})
  const [actionId, setActionId] = useState(null)
  const [error, setError] = useState(null)
  const [playsLoaded, setPlaysLoaded] = useState(false)

  useEffect(() => {
    async function load() {
      setBoostLoading(true)
      setError(null)
      try {
        const res = await fetch('/api/admin/boosts')
        if (!res.ok) throw new Error('Failed to load boosts')
        const payload = await res.json()
        setBoosts(payload.items || [])
      } catch (e) {
        console.error('[AdminAdsManager] load error', e)
        setError('Unable to load boosted ads right now.')
        setBoosts([])
      } finally {
        setBoostLoading(false)
      }
    }
    load()
  }, [])

  // Load play counts for all boosted beats across the platform.
  useEffect(() => {
    const ids = Array.from(new Set(boosts.map((b) => b.beat_id).filter(Boolean)))
    if (!ids.length) {
      setPlaysLoaded(false)
      return
    }
    let active = true
    ;(async () => {
      await loadPlayCountsForBeats(ids)
      if (active) setPlaysLoaded(true)
    })()
    return () => {
      active = false
    }
  }, [boosts])

  useEffect(() => {
    if (!boosts.length) {
      setCounts({ likeCounts: {}, favoriteCounts: {} })
      setFollowers({})
      return
    }
    const beatIds = boosts.map(b => b.beat_id)
    ;(async () => {
      try {
        const { likeCounts, favoriteCounts } = await fetchCountsForBeats(beatIds)
        setCounts({ likeCounts, favoriteCounts })
      } catch {
        setCounts({ likeCounts: {}, favoriteCounts: {} })
      }
      const followerMap = {}
      for (const b of boosts) {
        const producerId = b.producer_id
        if (producerId && followerMap[producerId] == null) {
          try {
            followerMap[producerId] = await followerCount(producerId)
          } catch {
            followerMap[producerId] = 0
          }
        }
      }
      setFollowers(followerMap)
    })()
  }, [boosts])

  const beatById = useMemo(() => {
    const map = new Map()
    beats.forEach(b => { map.set(b.id, b) })
    return map
  }, [beats])

  const totals = useMemo(() => {
    if (!boosts.length) return { plays: 0, revenue: 0 }
    let plays = 0
    let revenue = 0
    boosts.forEach(b => {
      const beatId = b.beat_id
      if (beatId) plays += getPlayCount(beatId)
      revenue += TIER_PRICE[b.tier] || 0
    })
    return { plays, revenue }
  }, [boosts])

  const refresh = async () => {
    try {
      setBoostLoading(true)
      const res = await fetch('/api/admin/boosts')
      if (!res.ok) throw new Error('Failed to load boosts')
      const payload = await res.json()
      setBoosts(payload.items || [])
    } catch {
      setBoosts([])
    } finally {
      setBoostLoading(false)
    }
  }

  const pauseBoost = async (id) => {
    if (!id) return
    setActionId(id)
    try {
      await fetch(`/api/admin/boosts/${id}/pause`, { method: 'POST' })
      await refresh()
    } finally {
      setActionId(null)
    }
  }

  const deleteBoost = async (id) => {
    if (!id) return
    if (!window.confirm('Delete this boosted placement? This cannot be undone.')) return
    setActionId(id)
    try {
      await fetch(`/api/admin/boosts/${id}`, { method: 'DELETE' })
      await refresh()
    } finally {
      setActionId(null)
    }
  }

  if (loading) {
    return (
      <section className="min-h-screen flex items-center justify-center bg-slate-950/95">
        <p className="text-sm text-slate-400">Loading admin access…</p>
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

  return (
    <AdminLayout
      title="Ads Manager"
      subtitle="Monitor boosted beats performance, pause underperformers and keep placements premium."
    >
      <div className="grid gap-6 lg:grid-cols-[1.05fr,0.95fr]">
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-800/80 bg-gradient-to-br from-slate-900/90 to-slate-950/90 p-5 shadow-lg">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-emerald-300">Overview</p>
                <p className="mt-1 text-sm font-semibold text-slate-100">Boosted inventory</p>
              </div>
              <button
                onClick={refresh}
                className="rounded-full border border-slate-700/70 px-3 py-1 text-[11px] text-slate-100 hover:border-emerald-400/70"
              >
                Refresh
              </button>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <MetricCard label="Active boosts" value={boosts.length} />
              <MetricCard label="Estimated boost revenue" value={`$${totals.revenue.toFixed(2)}`} />
              <MetricCard label="Total ad plays" value={totals.plays} />
            </div>
            {error && <p className="mt-3 text-[11px] text-rose-400">{error}</p>}
            <p className="mt-3 text-[11px] text-slate-400">
              Ads rotate across homepage, search and profile placements. Keep this view open while you test campaigns.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/90 p-4 shadow-lg">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-slate-100">Recommended actions</p>
            </div>
            <ul className="mt-3 space-y-1.5 text-[11px] text-slate-300">
              <li>• Pause boosts with low plays and engagement, then re-launch with stronger artwork and titles.</li>
              <li>• Recommend Tier 3 (30 days) to producers whose beats already trend organically.</li>
              <li>• Use playlists + boosted placements together to create flagship “Featured Riddims” strips.</li>
              <li>• Watch follower lift after big campaigns and feature top performers on the homepage.</li>
            </ul>
          </div>
        </div>
        <div className="space-y-3">
          {boostLoading && (
            <div className="rounded-2xl border border-slate-800/80 bg-slate-900/90 p-4 text-[12px] text-slate-400">
              Loading boosted ads…
            </div>
          )}
          {!boostLoading && boosts.length === 0 && (
            <div className="rounded-2xl border border-slate-800/80 bg-slate-900/90 p-4 text-[12px] text-slate-400">
              No active boosted beats yet. Once producers start boosting, you&apos;ll see performance here.
            </div>
          )}
          {!boostLoading && boosts.map(b => {
            const beat = beatById.get(b.beat_id)
            const plays = getPlayCount(b.beat_id)
            const likes = counts.likeCounts[b.beat_id] || 0
            const favorites = counts.favoriteCounts[b.beat_id] || 0
            const tierLabel = TIER_LABEL[b.tier] || 'Custom'
            const price = TIER_PRICE[b.tier] || 0
            const producerFollowers = followers[b.producer_id] || 0
            const starts = b.starts_at ? new Date(b.starts_at).toLocaleDateString() : '—'
            const ends = b.expires_at ? new Date(b.expires_at).toLocaleDateString() : '—'
            return (
              <div
                key={b.id}
                className="rounded-2xl border border-slate-800/80 bg-gradient-to-br from-slate-900/95 via-slate-950 to-slate-900/95 p-4 shadow-[0_18px_60px_rgba(0,0,0,0.55)]"
              >
                <div className="flex items-start gap-3">
                  <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl border border-slate-800/80 bg-slate-900">
                    {beat?.coverUrl ? (
                      <img src={beat.coverUrl} alt={beat.title} className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full bg-gradient-to-br from-yellow-500/30 via-emerald-500/20 to-slate-900" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-100 truncate">
                          {beat?.title || 'Unknown beat'}
                        </p>
                        <p className="text-[11px] text-slate-400 truncate">
                          {beat?.producerName || beat?.userEmail || 'Producer'} • {tierLabel}
                        </p>
                      </div>
                      <div className="text-right text-[11px] text-slate-400">
                        <p>Budget ${price.toFixed(2)}</p>
                        <p>{starts} – {ends}</p>
                      </div>
                    </div>
                    <div className="mt-2 grid gap-2 sm:grid-cols-4 text-[11px] text-slate-300">
                      <span>Plays <span className="font-semibold text-emerald-300">{plays}</span></span>
                      <span>Likes <span className="font-semibold text-emerald-300">{likes}</span></span>
                      <span>Favorites <span className="font-semibold text-emerald-300">{favorites}</span></span>
                      <span>Followers <span className="font-semibold text-emerald-300">{producerFollowers}</span></span>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                      <p className="text-slate-400">
                        This ad runs across homepage and search. Use pause if it underperforms compared to tier.
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => pauseBoost(b.id)}
                          disabled={actionId === b.id}
                          className="rounded-full border border-amber-400/70 bg-amber-500/10 px-3 py-1 text-[11px] font-semibold text-amber-200 hover:bg-amber-500/20 disabled:opacity-60"
                        >
                          {actionId === b.id ? 'Pausing…' : 'Pause'}
                        </button>
                        <button
                          onClick={() => deleteBoost(b.id)}
                          disabled={actionId === b.id}
                          className="rounded-full border border-rose-500/70 bg-rose-500/10 px-3 py-1 text-[11px] font-semibold text-rose-200 hover:bg-rose-500/20 disabled:opacity-60"
                        >
                          {actionId === b.id ? 'Working…' : 'Delete'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </AdminLayout>
  )
}

function MetricCard({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-800/80 bg-slate-950/90 p-3">
      <p className="text-[11px] text-slate-400">{label}</p>
      <p className="mt-1 text-base font-semibold text-slate-50">{value}</p>
    </div>
  )
}

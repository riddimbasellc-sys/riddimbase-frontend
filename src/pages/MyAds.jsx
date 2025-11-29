import { useEffect, useMemo, useState } from 'react'
import useSupabaseUser from '../hooks/useSupabaseUser'
import { useBeats } from '../hooks/useBeats'
import BackButton from '../components/BackButton'
import { getPlayCount } from '../services/analyticsService'
import { fetchCountsForBeats } from '../services/socialService'

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

export function MyAds() {
  const { user } = useSupabaseUser()
  const { beats } = useBeats()
  const [boosts, setBoosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionId, setActionId] = useState(null)
  const [counts, setCounts] = useState({ likeCounts: {}, favoriteCounts: {} })

  useEffect(() => {
    if (!user) return
    async function load() {
      setLoading(true)
      try {
        const res = await fetch('/api/admin/boosts')
        if (!res.ok) throw new Error('Failed to load boosts')
        const payload = await res.json()
        const mine = (payload.items || []).filter(b => b.producer_id === user.id)
        setBoosts(mine)
        const beatIds = mine.map(b => b.beat_id)
        if (beatIds.length) {
          const { likeCounts, favoriteCounts } = await fetchCountsForBeats(beatIds)
          setCounts({ likeCounts, favoriteCounts })
        } else {
          setCounts({ likeCounts: {}, favoriteCounts: {} })
        }
      } catch {
        setBoosts([])
        setCounts({ likeCounts: {}, favoriteCounts: {} })
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user])

  const beatById = useMemo(() => {
    const map = new Map()
    beats.forEach(b => { map.set(b.id, b) })
    return map
  }, [beats])

  const now = Date.now()
  const activeBoosts = boosts.filter(b => new Date(b.expires_at).getTime() > now)
  const pastBoosts = boosts.filter(b => new Date(b.expires_at).getTime() <= now)

  const pauseBoost = async (id) => {
    if (!id) return
    setActionId(id)
    try {
      await fetch(`/api/boosts/${id}/pause`, { method: 'POST' })
      const res = await fetch('/api/admin/boosts')
      const payload = await res.json()
      const mine = (payload.items || []).filter(b => b.producer_id === user.id)
      setBoosts(mine)
    } finally {
      setActionId(null)
    }
  }

  const deleteBoost = async (id) => {
    if (!id) return
    if (!window.confirm('Delete this boost?')) return
    setActionId(id)
    try {
      await fetch(`/api/boosts/${id}`, { method: 'DELETE' })
      setBoosts(prev => prev.filter(b => b.id !== id))
    } finally {
      setActionId(null)
    }
  }

  const runAgain = async (boost) => {
    if (!boost) return
    setActionId(boost.id)
    try {
      await fetch('/api/boosts/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          beatId: boost.beat_id,
          producerId: boost.producer_id,
          tier: boost.tier,
        }),
      })
      const res = await fetch('/api/admin/boosts')
      const payload = await res.json()
      const mine = (payload.items || []).filter(b => b.producer_id === user.id)
      setBoosts(mine)
    } finally {
      setActionId(null)
    }
  }

  if (!user) {
    return (
      <section className="min-h-screen flex items-center justify-center bg-slate-950/95">
        <p className="text-sm text-slate-400">Sign in to manage your ads.</p>
      </section>
    )
  }

  return (
    <section className="bg-slate-950/95">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <BackButton />
            <h1 className="mt-2 font-display text-2xl font-semibold text-slate-50">My Ads</h1>
            <p className="mt-1 text-sm text-slate-300">See your boosted beats, pause campaigns or run them again.</p>
          </div>
        </div>
        {loading && (
          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/90 p-4 text-sm text-slate-400">
            Loading your ads…
          </div>
        )}
        {!loading && boosts.length === 0 && (
          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/90 p-4 text-sm text-slate-400">
            You haven&apos;t boosted any beats yet. Use the Boost button from your dashboard to start a campaign.
          </div>
        )}
        {!loading && boosts.length > 0 && (
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-slate-100">Active campaigns</h2>
              {activeBoosts.length === 0 && (
                <p className="text-[12px] text-slate-400">No active ads right now.</p>
              )}
              {activeBoosts.map(b => {
                const beat = beatById.get(b.beat_id)
                const plays = getPlayCount(b.beat_id)
                const likes = counts.likeCounts[b.beat_id] || 0
                const favorites = counts.favoriteCounts[b.beat_id] || 0
                const tierLabel = TIER_LABEL[b.tier] || 'Custom'
                const budget = TIER_PRICE[b.tier] || 0
                const ends = b.expires_at ? new Date(b.expires_at).toLocaleDateString() : '—'
                return (
                  <div key={b.id} className="rounded-2xl border border-yellow-500/50 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 p-4 shadow-[0_20px_70px_rgba(0,0,0,0.6)]">
                    <div className="flex items-start gap-3">
                      <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-xl border border-slate-800/80 bg-slate-900">
                        {beat?.coverUrl ? (
                          <img src={beat.coverUrl} alt={beat.title} className="h-full w-full object-cover" />
                        ) : (
                          <div className="h-full w-full bg-gradient-to-br from-yellow-500/40 via-emerald-500/20 to-slate-900" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-100 truncate">{beat?.title || 'Beat removed'}</p>
                            <p className="text-[11px] text-slate-400 truncate">{tierLabel} • Budget ${budget.toFixed(2)}</p>
                          </div>
                          <span className="rounded-full border border-yellow-400/70 bg-yellow-500/10 px-2 py-[2px] text-[10px] font-semibold text-yellow-200">
                            Ends {ends}
                          </span>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-slate-300">
                          <span>Plays <span className="font-semibold text-emerald-300">{plays}</span></span>
                          <span>Likes <span className="font-semibold text-emerald-300">{likes}</span></span>
                          <span>Favorites <span className="font-semibold text-emerald-300">{favorites}</span></span>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                          <button
                            onClick={() => pauseBoost(b.id)}
                            disabled={actionId === b.id}
                            className="rounded-full border border-amber-400/70 bg-amber-500/10 px-3 py-1 text-amber-200 hover:bg-amber-500/20 disabled:opacity-60"
                          >
                            {actionId === b.id ? 'Pausing…' : 'Pause'}
                          </button>
                          <button
                            onClick={() => deleteBoost(b.id)}
                            disabled={actionId === b.id}
                            className="rounded-full border border-rose-500/70 bg-rose-500/10 px-3 py-1 text-rose-200 hover:bg-rose-500/20 disabled:opacity-60"
                          >
                            {actionId === b.id ? 'Working…' : 'Delete'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-slate-100">Past campaigns</h2>
              {pastBoosts.length === 0 && (
                <p className="text-[12px] text-slate-400">Finished ads will show here so you can re-run them.</p>
              )}
              {pastBoosts.map(b => {
                const beat = beatById.get(b.beat_id)
                const plays = getPlayCount(b.beat_id)
                const likes = counts.likeCounts[b.beat_id] || 0
                const favorites = counts.favoriteCounts[b.beat_id] || 0
                const tierLabel = TIER_LABEL[b.tier] || 'Custom'
                const budget = TIER_PRICE[b.tier] || 0
                const ended = b.expires_at ? new Date(b.expires_at).toLocaleDateString() : '—'
                return (
                  <div key={b.id} className="rounded-2xl border border-slate-800/80 bg-slate-900/95 p-4 shadow-lg">
                    <div className="flex items-start gap-3">
                      <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-xl border border-slate-800/80 bg-slate-900">
                        {beat?.coverUrl ? (
                          <img src={beat.coverUrl} alt={beat.title} className="h-full w-full object-cover" />
                        ) : (
                          <div className="h-full w-full bg-gradient-to-br from-slate-700/40 to-slate-900" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-100 truncate">{beat?.title || 'Beat removed'}</p>
                            <p className="text-[11px] text-slate-400 truncate">{tierLabel} • Budget ${budget.toFixed(2)}</p>
                          </div>
                          <span className="rounded-full border border-slate-700/80 bg-slate-800/80 px-2 py-[2px] text-[10px] text-slate-300">
                            Ended {ended}
                          </span>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-slate-300">
                          <span>Plays <span className="font-semibold text-emerald-300">{plays}</span></span>
                          <span>Likes <span className="font-semibold text-emerald-300">{likes}</span></span>
                          <span>Favorites <span className="font-semibold text-emerald-300">{favorites}</span></span>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                          <button
                            onClick={() => runAgain(b)}
                            disabled={actionId === b.id}
                            className="rounded-full border border-emerald-400/70 bg-emerald-500/10 px-3 py-1 text-emerald-200 hover:bg-emerald-500/20 disabled:opacity-60"
                          >
                            {actionId === b.id ? 'Launching…' : 'Run again'}
                          </button>
                          <button
                            onClick={() => deleteBoost(b.id)}
                            disabled={actionId === b.id}
                            className="rounded-full border border-slate-700/80 bg-slate-800/80 px-3 py-1 text-slate-200 hover:bg-slate-700/80 disabled:opacity-60"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

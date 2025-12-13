import { useEffect, useMemo, useState } from 'react'
import { BeatCard } from '../components/BeatCard'
import useSupabaseUser from '../hooks/useSupabaseUser'
import { useBeats } from '../hooks/useBeats'
import {
  fetchRepostedBeatIdsForUser,
  fetchProfilesByIds,
} from '../services/socialService'
import { listProviders } from '../services/serviceProvidersService'
import { topBeatsByPlays } from '../services/analyticsService'

function timeAgo(ts) {
  if (!ts) return ''
  const date = typeof ts === 'string' ? new Date(ts) : ts
  const diff = Date.now() - date.getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  const d = Math.floor(h / 24)
  return `${d}d`
}

export default function Feed() {
  const { user } = useSupabaseUser()
  const { beats, loading } = useBeats()

  const [repostFeed, setRepostFeed] = useState([])
  const [suggested, setSuggested] = useState([])
  const [mode, setMode] = useState('following') // 'following' | 'recommended'
  const [repostProfiles, setRepostProfiles] = useState({})

  // Build a quick map of beats by id for lookups
  const beatsById = useMemo(() => {
    const map = new Map()
    beats.forEach((b) => map.set(b.id, b))
    return map
  }, [beats])

  // Load reposted beats from followed producers
  useEffect(() => {
    let active = true
    if (!user) {
      setRepostFeed([])
      setRepostProfiles({})
      return
    }
    ;(async () => {
      try {
        const rows = await fetchRepostedBeatIdsForUser(user.id, { limit: 32 })
        if (!active) return
        const mapped = rows
          .map((r) => {
            const beat = beatsById.get(r.beat_id)
            if (!beat) return null
            return { beat, repostedAt: r.created_at, byUserId: r.user_id }
          })
          .filter(Boolean)

        if (!active) return
        setRepostFeed(mapped)

        const ids = Array.from(
          new Set(mapped.map((m) => m.byUserId).filter(Boolean)),
        )
        if (ids.length) {
          const profRows = await fetchProfilesByIds(ids)
          if (!active) return
          const map = {}
          ;(profRows || []).forEach((p) => {
            map[p.id] = p.display_name || p.email || 'Producer'
          })
          setRepostProfiles(map)
        } else {
          setRepostProfiles({})
        }
      } catch {
        if (active) {
          setRepostFeed([])
          setRepostProfiles({})
        }
      }
    })()
    return () => {
      active = false
    }
  }, [user, beatsById])

  // Simple "who to follow" suggestions based on static providers
  useEffect(() => {
    if (!user) {
      setSuggested([])
      return
    }
    const providers = listProviders()
    const sample = providers.slice(0, 6)
    setSuggested(sample)
  }, [user])

  const hasFeed = repostFeed.length > 0

  const recommendedBeats = useMemo(() => {
    if (!beats.length) return []
    const ids = beats.map((b) => b.id)
    const ranked = topBeatsByPlays(ids, 24)
    const byId = new Map(beats.map((b) => [b.id, b]))
    return ranked.map((r) => byId.get(r.id)).filter(Boolean)
  }, [beats])

  return (
    <section className="bg-slate-950/95 min-h-screen">
      <div className="mx-auto max-w-6xl px-3 py-6 sm:px-4 sm:py-8">
        {/* Hero / header */}
        <div className="rounded-3xl border border-slate-800/80 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.75)]">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-emerald-300">
                My Feed
              </p>
              <h1 className="mt-1 text-2xl font-semibold text-slate-50 sm:text-3xl">
                Stay close to the producers you follow.
              </h1>
              <p className="mt-2 max-w-2xl text-[11px] text-slate-300 sm:text-xs">
                See reposts, featured beats and activity from your circle. Switch to recommended to
                discover trending Caribbean beats tailored to you.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 md:justify-end">
              <button
                type="button"
                onClick={() => setMode('following')}
                className={`rounded-full px-4 py-1.5 text-[11px] font-semibold transition ${
                  mode === 'following'
                    ? 'bg-emerald-500 text-slate-950 shadow-[0_0_30px_rgba(16,185,129,0.6)]'
                    : 'border border-slate-700/80 bg-slate-900/80 text-slate-200 hover:border-emerald-400/70'
                }`}
              >
                Following
              </button>
              <button
                type="button"
                onClick={() => setMode('recommended')}
                className={`rounded-full px-4 py-1.5 text-[11px] font-semibold transition ${
                  mode === 'recommended'
                    ? 'bg-red-500 text-slate-50 shadow-[0_0_30px_rgba(248,113,113,0.6)]'
                    : 'border border-slate-700/80 bg-slate-900/80 text-slate-200 hover:border-red-400/70'
                }`}
              >
                Recommended
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-6 md:flex-row">
          <div className="min-w-0 flex-1 space-y-4">
            {!user && (
              <p className="text-sm text-slate-400">
                Log in to see a personalized feed from producers you follow.
              </p>
            )}

            {user && mode === 'following' && !hasFeed && !loading && (
              <div className="rounded-2xl border border-slate-800/80 bg-slate-900/80 p-4 text-sm text-slate-300">
                <p>
                  Once you follow producers and they repost beats, their activity will appear here.
                </p>
                <p className="mt-2 text-[11px] text-slate-400">
                  Start by browsing{' '}
                  <a href="/beats" className="text-red-300 hover:text-red-200">
                    Beats
                  </a>{' '}
                  or{' '}
                  <a href="/producers" className="text-red-300 hover:text-red-200">
                    Producers
                  </a>{' '}
                  and tapping Follow.
                </p>
              </div>
            )}

            {user && mode === 'following' && hasFeed && (
              <div className="space-y-3">
                <h2 className="text-sm font-semibold text-slate-100">
                  From producers you follow
                </h2>
                <div className="grid grid-cols-1 gap-3 xs:grid-cols-2 lg:grid-cols-3">
                  {repostFeed.map(({ beat, byUserId, repostedAt }) => {
                    const name =
                      repostProfiles[byUserId] || 'Producer you follow'
                    return (
                      <div key={`${beat.id}-${byUserId || 'self'}`} className="space-y-1.5">
                        <p className="text-[10px] text-slate-400">
                          Reposted by{' '}
                          <span className="font-semibold text-slate-100">
                            {name}
                          </span>
                          {repostedAt && (
                            <>
                              {' · '}
                              <span>{timeAgo(repostedAt)}</span>
                            </>
                          )}
                        </p>
                        <BeatCard {...beat} square />
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {mode === 'recommended' && (
              <div className="space-y-3">
                <h2 className="text-sm font-semibold text-slate-100">Recommended for you</h2>
                {recommendedBeats.length === 0 && (
                  <p className="text-xs text-slate-400">
                    We&apos;ll show trending beats here once more activity is detected.
                  </p>
                )}
                {recommendedBeats.length > 0 && (
                  <div className="grid grid-cols-1 gap-3 xs:grid-cols-2 lg:grid-cols-3">
                    {recommendedBeats.map((beat) => (
                      <BeatCard key={beat.id} {...beat} square />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <aside className="w-full space-y-4 md:w-72 md:flex-shrink-0">
            <div className="rounded-2xl border border-slate-800/80 bg-slate-900/80 p-4">
              <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Suggested producers
              </h2>
              <p className="mt-1 text-[11px] text-slate-400">
                Follow a few creators to build your feed.
              </p>
              <div className="mt-3 space-y-2 text-[11px]">
                {suggested.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between gap-2 rounded-xl border border-slate-800/80 bg-slate-950/80 px-3 py-2"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-800 text-[10px] font-semibold text-slate-100">
                        {(p.name || 'RB')
                          .split(' ')
                          .filter(Boolean)
                          .slice(0, 2)
                          .map((x) => x[0])
                          .join('')
                          .toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-slate-100">
                          {p.name}
                        </p>
                        <p className="truncate text-[10px] text-slate-500">
                          {p.location || 'Producer / Service'}
                        </p>
                      </div>
                    </div>
                    <a
                      href={`/producer/${p.id}`}
                      className="rounded-full bg-red-500 px-3 py-1 text-[10px] font-semibold text-slate-50 hover:bg-red-400"
                    >
                      View
                    </a>
                  </div>
                ))}
                {suggested.length === 0 && (
                  <p className="text-[11px] text-slate-500">
                    Browse the Producers page to find new creators.
                  </p>
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </section>
  )
}

import { useEffect, useMemo, useState } from 'react'
import { BeatCard } from '../components/BeatCard'
import useSupabaseUser from '../hooks/useSupabaseUser'
import { useBeats } from '../hooks/useBeats'
import {
  fetchRepostedBeatIdsForUser,
  fetchFollowers,
  fetchFollowerProfiles,
} from '../services/socialService'
import { listProviders } from '../services/serviceProvidersService'

export default function Feed() {
  const { user } = useSupabaseUser()
  const { beats, loading } = useBeats()

  const [repostFeed, setRepostFeed] = useState([])
  const [suggested, setSuggested] = useState([])

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
        setRepostFeed(mapped)
      } catch {
        if (active) setRepostFeed([])
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

  return (
    <section className="bg-slate-950/95 min-h-screen">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-3 py-6 sm:px-4 sm:py-8 md:flex-row">
        <div className="min-w-0 flex-1 space-y-4">
          <header className="border-b border-slate-800/80 pb-3">
            <h1 className="text-lg font-semibold text-slate-50">Your Feed</h1>
            <p className="mt-1 text-[11px] text-slate-400">
              Beats and reposts from producers you follow. This keeps your Home
              page lighter and focused on discovery.
            </p>
          </header>

          {!user && (
            <p className="text-sm text-slate-400">
              Log in to see a personalized feed from producers you follow.
            </p>
          )}

          {user && !hasFeed && !loading && (
            <div className="rounded-2xl border border-slate-800/80 bg-slate-900/80 p-4 text-sm text-slate-300">
              <p>Once you follow producers and they repost beats, their activity will appear here.</p>
              <p className="mt-2 text-[11px] text-slate-400">
                Start by browsing <a href="/beats" className="text-red-300 hover:text-red-200">Beats</a> or{' '}
                <a href="/producers" className="text-red-300 hover:text-red-200">Producers</a> and tapping Follow.
              </p>
            </div>
          )}

          {user && hasFeed && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-slate-100">
                From producers you follow
              </h2>
              <div className="grid grid-cols-1 gap-3 xs:grid-cols-2 lg:grid-cols-3">
                {repostFeed.map(({ beat }) => (
                  <BeatCard key={beat.id} {...beat} square />
                ))}
              </div>
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
    </section>
  )
}

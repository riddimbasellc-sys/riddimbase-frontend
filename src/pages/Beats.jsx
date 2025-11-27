import { useEffect, useMemo, useState } from 'react'
import { BeatCard } from '../components/BeatCard'
import { useBeats } from '../hooks/useBeats'
import BackButton from '../components/BackButton'
import useSupabaseUser from '../hooks/useSupabaseUser'
import ProfileShareModal from '../components/ProfileShareModal'
import { fetchCountsForBeats, followerCount } from '../services/socialService'
import { useBoostedBeats } from '../hooks/useBoostedBeats'

export function Beats() {
  const { beats, loading } = useBeats()
  const { user } = useSupabaseUser()
  const [metrics, setMetrics] = useState({
    likeCounts: {},
    favoriteCounts: {},
    followerCounts: {},
  })
  const [shareTarget, setShareTarget] = useState(null)
  const { boosts: boostedBeatsRaw } = useBoostedBeats()

  const openShare = (beat) => setShareTarget(beat)
  const closeShare = () => setShareTarget(null)

  useEffect(() => {
    ;(async () => {
      if (!beats.length) return
      const ids = beats.map((b) => b.id)
      const { likeCounts, favoriteCounts } = await fetchCountsForBeats(ids)
      const followerCounts = {}
      for (const b of beats) {
        if (b.userId) followerCounts[b.userId] = await followerCount(b.userId)
      }
      setMetrics({ likeCounts, favoriteCounts, followerCounts })
    })()
  }, [beats])

  const boostedMap = useMemo(() => {
    const byId = new Map()
    boostedBeatsRaw.forEach((b) => {
      byId.set(b.beat_id || b.beatId, b)
    })
    return byId
  }, [boostedBeatsRaw])

  const boostedBeats = useMemo(
    () => beats.filter((b) => boostedMap.has(b.id)),
    [beats, boostedMap],
  )

  return (
    <section className="bg-slate-950/95">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="mb-6">
          <BackButton />
          <h1 className="font-display text-2xl font-semibold text-slate-50">
            Browse Beats
          </h1>
          <p className="mt-1 text-sm text-slate-300">
            Discover curated Caribbean beats, riddims and instrumentals across genres.
          </p>
        </div>
        <div className="grid gap-8 md:grid-cols-[240px,1fr]">
          <aside className="space-y-6 rounded-2xl border border-slate-800/80 bg-slate-950/90 bg-rb-gloss-stripes bg-blend-soft-light p-4 h-fit shadow-rb-gloss-panel">
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-rb-sun-gold">
                Search
              </h2>
              <input
                className="mt-2 w-full rounded-lg border border-slate-700/80 bg-slate-950/80 px-3 py-2 text-[12px] text-slate-100 placeholder:text-slate-500 focus:border-rb-trop-cyan focus:outline-none"
                placeholder="Keywords or producer"
              />
            </div>
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-rb-sun-gold">
                Sort
              </h2>
              <select className="mt-2 w-full rounded-lg border border-slate-700/80 bg-slate-950/80 px-3 py-2 text-[12px] text-slate-100 focus:border-rb-trop-cyan focus:outline-none">
                <option>Trending</option>
                <option>Newest</option>
                <option>Price: Low → High</option>
                <option>Price: High → Low</option>
              </select>
            </div>
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-rb-sun-gold">
                Genres
              </h2>
              <div className="mt-2 flex flex-wrap gap-2 text-[10px]">
                {['Dancehall', 'TrapHall', 'Reggae', 'Afrobeats', 'Soca', 'Drill'].map(
                  (g) => (
                    <button
                      key={g}
                      className="rounded-full border border-slate-700/70 px-2 py-1 text-[10px] text-slate-300 hover:border-rb-trop-cyan hover:text-rb-trop-cyan transition"
                    >
                      {g}
                    </button>
                  ),
                )}
              </div>
            </div>
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-rb-sun-gold">
                License Tier
              </h2>
              <div className="mt-2 flex flex-wrap gap-2 text-[10px]">
                {['Basic', 'Premium', 'Unlimited', 'Exclusive'].map((l) => (
                  <span
                    key={l}
                    className="rounded-full bg-slate-950/70 px-2 py-1 text-[10px] text-slate-400"
                  >
                    {l}
                  </span>
                ))}
              </div>
            </div>
            <p className="text-[10px] text-slate-500 leading-relaxed">
              Refine your search to find the perfect riddim. Advanced filters coming
              soon.
            </p>
          </aside>
          <div className="min-w-0">
            {loading && <p className="text-sm text-slate-400">Loading beats…</p>}
            {!loading && boostedBeats.length > 0 && (
              <div className="mb-6 rounded-2xl border border-yellow-500/40 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 shadow-rb-gloss-panel">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h2 className="text-sm font-semibold text-slate-100">
                      Sponsored beats
                    </h2>
                    <p className="text-[11px] text-slate-400">
                      Boosted listings appear above search results.
                    </p>
                  </div>
                  <span className="rounded-full border border-yellow-400/60 bg-yellow-500/10 px-3 py-1 text-[10px] font-semibold text-yellow-200">
                    {boostedBeats.length} active
                  </span>
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {boostedBeats.map((b) => (
                    <BeatCard
                      key={b.id}
                      {...b}
                      coverUrl={b.coverUrl || null}
                      audioUrl={b.audioUrl}
                      initialLikes={metrics.likeCounts[b.id] || 0}
                      initialFavs={metrics.favoriteCounts[b.id] || 0}
                      initialFollowers={
                        b.userId ? metrics.followerCounts[b.userId] || 0 : 0
                      }
                      onShare={openShare}
                      sponsored={true}
                    />
                  ))}
                </div>
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {!loading &&
                beats.map((b) => (
                  <BeatCard
                    key={b.id}
                    {...b}
                    coverUrl={b.coverUrl || null}
                    audioUrl={b.audioUrl}
                    initialLikes={metrics.likeCounts[b.id] || 0}
                    initialFavs={metrics.favoriteCounts[b.id] || 0}
                    initialFollowers={
                      b.userId ? metrics.followerCounts[b.userId] || 0 : 0
                    }
                    onShare={openShare}
                    sponsored={boostedMap.has(b.id)}
                  />
                ))}
            </div>
            <ProfileShareModal
              open={!!shareTarget}
              onClose={closeShare}
              profileType="beat"
              profileId={shareTarget?.id}
              displayName={shareTarget?.title}
            />
          </div>
        </div>
      </div>
    </section>
  )
}

export default Beats


import { useEffect, useMemo, useState } from 'react'
import { BeatCard } from '../components/BeatCard'
import { useBeats } from '../hooks/useBeats'
import BackButton from '../components/BackButton'
import useSupabaseUser from '../hooks/useSupabaseUser'
import ProfileShareModal from '../components/ProfileShareModal'
import { fetchCountsForBeats, followerCount } from '../services/socialService'
import { useBoostedBeats } from '../hooks/useBoostedBeats'
import { useLocation } from 'react-router-dom'

export function Beats() {
  const { beats, loading } = useBeats()
  const { user } = useSupabaseUser()
  const [metrics, setMetrics] = useState({
    likeCounts: {},
    favoriteCounts: {},
    followerCounts: {},
  })
  const [shareTarget, setShareTarget] = useState(null)
  const location = useLocation()
  const params = new URLSearchParams(location.search)
  const initialSearch = params.get('search') || ''
  const [search, setSearch] = useState(initialSearch)
  const [suggestions, setSuggestions] = useState([])
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

  const normalizedSearch = search.trim().toLowerCase()

  const filteredBeats = useMemo(() => {
    if (!normalizedSearch) return beats
    return beats.filter((b) => {
      const title = (b.title || '').toLowerCase()
      const producer = (b.producer || '').toLowerCase()
      return title.includes(normalizedSearch) || producer.includes(normalizedSearch)
    })
  }, [beats, normalizedSearch])

  const boostedBeats = useMemo(
    () => beats.filter((b) => boostedMap.has(b.id)),
    [beats, boostedMap],
  )

  const boostedFilteredBeats = useMemo(
    () => filteredBeats.filter((b) => boostedMap.has(b.id)),
    [filteredBeats, boostedMap],
  )

  useEffect(() => {
    if (!normalizedSearch) {
      setSuggestions([])
      return
    }
    const matches = beats.filter((b) => {
      const title = (b.title || '').toLowerCase()
      const producer = (b.producer || '').toLowerCase()
      return title.includes(normalizedSearch) || producer.includes(normalizedSearch)
    })
    setSuggestions(matches.slice(0, 8))
  }, [beats, normalizedSearch])

  const handleSearchChange = (e) => {
    setSearch(e.target.value)
  }

  const handleSuggestionClick = (beat) => {
    setSearch(beat.title || '')
    setSuggestions([])
  }

  return (
    <section className="bg-slate-950/95">
      <div className="mx-auto max-w-6xl px-3 py-6 sm:px-4 sm:py-10">
        <div className="mb-5 flex flex-col gap-2 sm:mb-6">
          <div className="flex items-center gap-3">
            <BackButton />
            <h1 className="font-display text-xl font-semibold text-slate-50 sm:text-2xl">
              Browse Beats
            </h1>
          </div>
          <p className="text-xs text-slate-300 sm:text-sm">
            Discover curated Caribbean beats, riddims and instrumentals across genres.
          </p>
        </div>
        <div className="flex flex-col gap-6 md:grid md:grid-cols-[260px,1fr] md:gap-8">
          <aside className="order-0 space-y-6 rounded-2xl border border-slate-800/80 bg-slate-950/90 bg-rb-gloss-stripes bg-blend-soft-light p-4 shadow-rb-gloss-panel md:order-none md:h-fit">
            <div className="relative">
              <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-rb-sun-gold">
                Search
              </h2>
              <input
                value={search}
                onChange={handleSearchChange}
                className="mt-2 w-full rounded-lg border border-slate-700/80 bg-slate-950/80 px-3 py-2 text-[12px] text-slate-100 placeholder:text-slate-500 focus:border-rb-trop-cyan focus:outline-none"
                placeholder="Keywords or producer"
              />
              {suggestions.length > 0 && (
                <div className="absolute z-20 mt-1 w-full max-h-60 overflow-auto rounded-xl border border-slate-800/80 bg-slate-950/95 text-[11px] text-slate-100 shadow-lg">
                  {suggestions.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => handleSuggestionClick(b)}
                      className="flex w-full flex-col items-start px-3 py-2 text-left hover:bg-slate-900/90"
                    >
                      <span className="w-full truncate font-semibold">
                        {b.title || 'Untitled beat'}
                      </span>
                      <span className="mt-0.5 w-full truncate text-[10px] text-slate-400">
                        {b.producer || 'Producer'}
                      </span>
                    </button>
                  ))}
                </div>
              )}
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
              Refine your search to find the perfect riddim.
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
                <div className="mt-3 grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {boostedFilteredBeats.map((b) => (
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
                      square
                    />
                  ))}
                </div>
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {!loading &&
                filteredBeats.map((b) => (
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
                    square
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

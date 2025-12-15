import { useEffect, useMemo, useState } from 'react'
import { TrendingBeatCard } from '../components/BeatCarousel'
import ScrollableGrid from '../components/ScrollableGrid'
import { useBeats } from '../hooks/useBeats'
import BackButton from '../components/BackButton'
import useSupabaseUser from '../hooks/useSupabaseUser'
import ProfileShareModal from '../components/ProfileShareModal'
import { fetchCountsForBeats, followerCount } from '../services/socialService'
import { useBoostedBeats } from '../hooks/useBoostedBeats'
import { Link, useLocation } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { slugify } from '../utils/slugify'

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
  const [viewMode, setViewMode] = useState('grid')
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)
  const [genreFilter, setGenreFilter] = useState('')
  const [sortKey, setSortKey] = useState('trending')

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
  const normalizedGenre = genreFilter.trim().toLowerCase()

  const filteredBeats = useMemo(() => {
    if (!beats.length) return []
    return beats.filter((b) => {
      const title = (b.title || '').toLowerCase()
      const producerName = (b.producer || '').toLowerCase()
      const genre = (b.genre || '').toLowerCase()

      const matchesSearch =
        !normalizedSearch ||
        title.includes(normalizedSearch) ||
        producerName.includes(normalizedSearch)

      const matchesGenre =
        !normalizedGenre || genre === normalizedGenre

      return matchesSearch && matchesGenre
    })
  }, [beats, normalizedSearch, normalizedGenre])

  const sortedBeats = useMemo(() => {
    const list = [...filteredBeats]
    if (!list.length) return list

    if (sortKey === 'newest') {
      return list.sort((a, b) => {
        const at = a.createdAt ? new Date(a.createdAt).getTime() : 0
        const bt = b.createdAt ? new Date(b.createdAt).getTime() : 0
        return bt - at
      })
    }

    if (sortKey === 'price-low') {
      return list.sort(
        (a, b) => Number(a.price || 0) - Number(b.price || 0),
      )
    }

    if (sortKey === 'price-high') {
      return list.sort(
        (a, b) => Number(b.price || 0) - Number(a.price || 0),
      )
    }

    // Default: trending by favorites and likes
    return list.sort((a, b) => {
      const likesA = metrics.likeCounts[a.id] || 0
      const favA = metrics.favoriteCounts[a.id] || 0
      const likesB = metrics.likeCounts[b.id] || 0
      const favB = metrics.favoriteCounts[b.id] || 0
      const scoreA = favA * 3 + likesA
      const scoreB = favB * 3 + likesB
      return scoreB - scoreA
    })
  }, [filteredBeats, sortKey, metrics])

  const boostedBeats = useMemo(
    () => beats.filter((b) => boostedMap.has(b.id)),
    [beats, boostedMap],
  )

  const boostedFilteredBeats = useMemo(
    () => sortedBeats.filter((b) => boostedMap.has(b.id)),
    [sortedBeats, boostedMap],
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

  const mainGridClasses =
    viewMode === 'grid'
      ? 'grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4'
      : 'grid grid-cols-1 gap-3'

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
          {/* Desktop filters sidebar */}
          <aside className="order-0 hidden space-y-6 rounded-2xl border border-slate-800/80 bg-slate-950/90 bg-rb-gloss-stripes bg-blend-soft-light p-4 shadow-rb-gloss-panel md:order-none md:block md:h-fit">
            <div className="relative">
              <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-rb-sun-gold">
                Search
              </h2>
              <input
                value={search}
                onChange={handleSearchChange}
                className="mt-2 w-full rounded-lg border border-slate-700/80 bg-slate-950/80 px-3 py-2 text-[12px] text-slate-100 placeholder:text-slate-500 focus:border-red-500 focus:outline-none"
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
              <select
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value)}
                className="mt-2 w-full rounded-lg border border-slate-700/80 bg-slate-950/80 px-3 py-2 text-[12px] text-slate-100 focus:border-red-500 focus:outline-none">
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
                {['Dancehall', 'Trap Dancehall', 'Reggae', 'Afrobeat', 'Soca', 'Trap', 'Hip Hop', 'Drill'].map(
                  (g) => {
                    const active = genreFilter === g
                    return (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setGenreFilter(active ? '' : g)}
                        className={`rounded-full px-2 py-1 text-[10px] transition ${
                          active
                            ? 'border-red-500 bg-red-500/10 text-red-300'
                            : 'border border-slate-700/70 text-slate-300 hover:border-red-400 hover:text-red-300'
                        }`}
                      >
                        {g}
                      </button>
                    )
                  },
                )}
                {genreFilter && (
                  <button
                    type="button"
                    onClick={() => setGenreFilter('')}
                    className="ml-1 text-[10px] text-slate-400 underline underline-offset-2"
                  >
                    Clear
                  </button>
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
            {/* Mobile filter + view toggle bar */}
            <div className="mb-4 flex items-center justify-between md:hidden">
              <button
                type="button"
                onClick={() => setMobileFiltersOpen(true)}
                className="inline-flex items-center rounded-full bg-slate-900 px-4 py-2 text-[11px] font-semibold text-slate-100 shadow-md border border-slate-700"
              >
                <span className="mr-2 flex h-4 w-4 items-center justify-center rounded-full bg-slate-800">
                  <span className="block h-2 w-2 border-b-2 border-r-2 border-slate-300 rotate-45 translate-y-[1px]" />
                </span>
                More Filters
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-700 bg-slate-900 text-[13px] text-slate-200"
                  aria-label="Favorites"
                >
                  ♥
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className={`flex h-8 w-8 items-center justify-center rounded-full border text-[12px] ${
                    viewMode === 'list'
                      ? 'border-emerald-400 bg-slate-900 text-emerald-300'
                      : 'border-slate-700 bg-slate-900 text-slate-300'
                  }`}
                  aria-label="List view"
                >
                  <span className="flex flex-col gap-[2px]">
                    <span className="h-[2px] w-4 rounded bg-current" />
                    <span className="h-[2px] w-4 rounded bg-current" />
                    <span className="h-[2px] w-4 rounded bg-current" />
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className={`flex h-8 w-8 items-center justify-center rounded-full border text-[12px] ${
                    viewMode === 'grid'
                      ? 'border-emerald-400 bg-slate-900 text-emerald-300'
                      : 'border-slate-700 bg-slate-900 text-slate-300'
                  }`}
                  aria-label="Grid view"
                >
                  <span className="grid h-3 w-3 grid-cols-2 gap-[2px]">
                    <span className="rounded bg-current" />
                    <span className="rounded bg-current" />
                    <span className="rounded bg-current" />
                    <span className="rounded bg-current" />
                  </span>
                </button>
              </div>
            </div>

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
                <div className="mt-3">
                  {viewMode === 'grid' ? (
                    <ScrollableGrid gridClassName="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                      {boostedFilteredBeats.map((b) => (
                        <TrendingBeatCard key={b.id} beat={b} />
                      ))}
                    </ScrollableGrid>
                  ) : (
                    <ScrollableGrid gridClassName="space-y-2">
                      {boostedFilteredBeats.map((b) => (
                        <BeatListRow key={b.id} beat={b} />
                      ))}
                    </ScrollableGrid>
                  )}
                </div>
              </div>
            )}

            {viewMode === 'grid' ? (
              <ScrollableGrid gridClassName={mainGridClasses}>
                {!loading &&
                  sortedBeats.map((b) => (
                    <TrendingBeatCard key={b.id} beat={b} />
                  ))}
              </ScrollableGrid>
            ) : (
              <ScrollableGrid gridClassName="space-y-2">
                {!loading && sortedBeats.map((b) => <BeatListRow key={b.id} beat={b} />)}
              </ScrollableGrid>
            )}

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

      {/* Mobile filters sheet */}
      {mobileFiltersOpen && (
        <div className="fixed inset-0 z-40 flex items-end bg-black/60 md:hidden">
          <div className="w-full max-h-[80vh] rounded-t-3xl border-t border-slate-800 bg-slate-950 p-4 shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-100">Filters</h2>
              <button
                type="button"
                onClick={() => setMobileFiltersOpen(false)}
                className="rounded-full border border-slate-700 px-3 py-1 text-[11px] text-slate-200"
              >
                Close
              </button>
            </div>
            <div className="space-y-4 overflow-y-auto text-[12px]">
              <div>
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-rb-sun-gold">
                  Search
                </h3>
                <input
                  value={search}
                  onChange={handleSearchChange}
                  className="mt-2 w-full rounded-lg border border-slate-700/80 bg-slate-950/80 px-3 py-2 text-[12px] text-slate-100 placeholder:text-slate-500 focus:border-red-500 focus:outline-none"
                  placeholder="Keywords or producer"
                />
              </div>
              <div>
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-rb-sun-gold">
                  Sort
                </h3>
                  <select
                    value={sortKey}
                    onChange={(e) => setSortKey(e.target.value)}
                    className="mt-2 w-full rounded-lg border border-slate-700/80 bg-slate-950/80 px-3 py-2 text-[12px] text-slate-100 focus:border-red-500 focus:outline-none">
                  <option>Trending</option>
                  <option>Newest</option>
                  <option>Price: Low → High</option>
                  <option>Price: High → Low</option>
                </select>
              </div>
              <div>
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-rb-sun-gold">
                  Genres
                </h3>
                  <div className="mt-2 flex flex-wrap gap-2 text-[10px]">
                    {['Dancehall', 'Trap Dancehall', 'Reggae', 'Afrobeat', 'Soca', 'Trap', 'Hip Hop', 'Drill'].map(
                      (g) => {
                        const active = genreFilter === g
                        return (
                          <button
                            key={g}
                            type="button"
                            onClick={() => setGenreFilter(active ? '' : g)}
                            className={`rounded-full px-2 py-1 text-[10px] transition ${
                              active
                                ? 'border-red-500 bg-red-500/10 text-red-300'
                                : 'border border-slate-700/70 text-slate-300 hover:border-red-400 hover:text-red-300'
                            }`}
                          >
                            {g}
                          </button>
                        )
                      },
                    )}
                  {genreFilter && (
                    <button
                      type="button"
                      onClick={() => setGenreFilter('')}
                      className="ml-1 text-[10px] text-slate-400 underline underline-offset-2"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
              <div>
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-rb-sun-gold">
                  License Tier
                </h3>
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
              <button
                type="button"
                onClick={() => setMobileFiltersOpen(false)}
                className="mt-2 w-full rounded-full bg-emerald-500 px-4 py-2 text-center text-[11px] font-semibold text-slate-950"
              >
                Apply filters
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

export default Beats

function BeatListRow({ beat }) {
  const { addBeat } = useCart() || {}
  const slug = slugify(beat?.title || '')
  const to = slug ? `/beat/${slug}` : `/beat/${beat.id}`

  const coverUrl = beat?.coverUrl || beat?.cover_url || null
  const title = beat?.title || 'Untitled Beat'
  const producer = beat?.producer || 'Unknown'
  const free = !!beat?.freeDownload
  const price =
    typeof beat?.price === 'number' ? beat.price : Number(beat?.price || 0)

  const handleAdd = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (addBeat) addBeat(beat.id, 'Basic')
  }

  return (
    <Link
      to={to}
      state={{ beat }}
      className="group flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-900/60 px-3 py-2 shadow-[0_10px_30px_rgba(0,0,0,0.55)] backdrop-blur transition hover:border-red-500/60 hover:bg-slate-900/80"
    >
      <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-xl bg-slate-800">
        {coverUrl ? (
          <img
            src={coverUrl}
            alt={title}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="min-w-0 truncate text-[12px] font-semibold text-slate-50">
            {title}
          </p>
          {free ? (
            <span className="flex-shrink-0 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-200">
              FREE
            </span>
          ) : (
            <span className="flex-shrink-0 rounded-full bg-slate-950/60 px-2 py-0.5 text-[10px] font-semibold text-slate-200">
              ${Number.isFinite(price) ? price.toFixed(2) : '0.00'}
            </span>
          )}
        </div>
        <p className="mt-0.5 truncate text-[11px] text-slate-400">{producer}</p>
      </div>

      <button
        type="button"
        onClick={handleAdd}
        className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-sky-500/90 text-[14px] text-white shadow-[0_0_24px_rgba(56,189,248,0.35)] transition hover:bg-sky-400"
        aria-label="Add to cart"
        title="Add to cart"
      >
        🛍
      </button>
    </Link>
  )
}

import { useEffect, useMemo, useState } from 'react'
import { Hero } from '../components/Hero'
import { BeatCard } from '../components/BeatCard'
import { useBeats } from '../hooks/useBeats'
import FeaturedCarousel from '../components/FeaturedCarousel'
import GenreFilters from '../components/GenreFilters'
import TrendingProducers from '../components/TrendingProducers'
import SpotlightBanner from '../components/SpotlightBanner'
import { getActiveBanner } from '../services/bannerService'
import { getBannerContent, DEFAULT_BANNER_CONTENT } from '../services/bannerContentService'
import useSupabaseUser from '../hooks/useSupabaseUser'
import { listPlaylists, togglePlaylistLike, togglePlaylistFavorite, addCommentToPlaylist, recordPlaylistPlay, getTrendingPlaylists } from '../services/playlistsService'
import { useBoostedBeats } from '../hooks/useBoostedBeats'
import { topBeatsByPlays } from '../services/analyticsService'
import { slugify } from '../utils/slugify'

export function Home() {
  const { user } = useSupabaseUser()
  const { beats, loading } = useBeats()
  const [playlists, setPlaylists] = useState([])
  const [commentDrafts, setCommentDrafts] = useState({})
  const testimonials = [
    {
      role: 'Dancehall Producer',
      name: 'Jahmel Beats �?� Kingston, Jamaica',
      quote:
        '“RiddimBase finally feels like a real home for Caribbean riddims. My beats are getting plays from artists in London and New York I never knew before.”',
    },
    {
      role: 'Afro-Caribbean Artist',
      name: 'Naila Vibes �?� Port of Spain, Trinidad',
      quote:
        '“Licensing a beat here is as easy as adding it to cart. Contracts, stems and delivery are instant, so I can focus on writing and recording.”',
    },
    {
      role: 'Beat Maker & Mix Engineer',
      name: 'Kruz Fyah �?� Montego Bay, Jamaica',
      quote:
        '“Between the jobs board and boosted beats, most of my online clients now come straight through RiddimBase.”',
    },
  ]
  const trending = useMemo(() => {
    if (!beats.length) return []
    const ids = beats.map(b => b.id)
    const ranked = topBeatsByPlays(ids, 9)
    const byId = new Map(beats.map(b => [b.id, b]))
    return ranked.map(r => byId.get(r.id)).filter(Boolean)
  }, [beats])
  const [activeBanner, setActiveBannerState] = useState(null)
  const [bannerContent, setBannerContentState] = useState(null)
  const userId = user?.id || 'guest'
  const userLabel = user?.user_metadata?.display_name || user?.email || 'Listener'
  const trendingIds = useMemo(
    () => new Set((playlists || []).slice(0, 3).map((p) => p.id)),
    [playlists],
  )
  const { boosts: boostedBeats } = useBoostedBeats()
  const boostedMap = useMemo(() => {
    const byId = new Map()
    boostedBeats.forEach(b => { byId.set(b.beat_id || b.beatId, b) })
    return byId
  }, [boostedBeats])
  const handleGenre = (g) => {
    // Placeholder: filter could be implemented via state; currently no-op
    console.log('Genre filter click', g)
  }
  useEffect(() => {
    ;(async () => {
      const data = await listPlaylists()
      const trending = await getTrendingPlaylists(3)
      // ensure trending first
      const trendingIdsLocal = new Set(trending.map((p) => p.id))
      const merged = [...trending, ...data.filter((p) => !trendingIdsLocal.has(p.id))]
      setPlaylists(merged)
    })()
  }, [])
  useEffect(() => {
    ;(async () => {
      const [banner, content] = await Promise.all([
        getActiveBanner(),
        getBannerContent(),
      ])
      setActiveBannerState(banner)
      setBannerContentState(content)
    })()
  }, [])
  const refresh = async () => {
    const data = await listPlaylists()
    setPlaylists(data)
  }
  const handleLike = async (id) => {
    await togglePlaylistLike(id, userId)
    refresh()
  }
  const handleFav = async (id) => {
    await togglePlaylistFavorite(id, userId)
    refresh()
  }
  const handlePlay = async (id) => {
    await recordPlaylistPlay(id)
    refresh()
  }
  const handleComment = async (id) => {
    const text = (commentDrafts[id] || '').trim()
    if (!text) return
    await addCommentToPlaylist(id, { user: userLabel, text, userId })
    refresh()
    setCommentDrafts(prev => ({ ...prev, [id]: '' }))
  }
  const heroContent = bannerContent || DEFAULT_BANNER_CONTENT
  return (
    <>
      <Hero />
      <section className="bg-slate-950/95">
        <div className="mx-auto max-w-6xl px-3 py-6 space-y-8 sm:px-4 sm:py-10">
          {activeBanner ? (
            <div className="relative overflow-hidden rounded-3xl border border-rb-sun-gold/40 bg-slate-950/90 shadow-rb-gloss-panel">
              {(activeBanner.kind === 'video' || (activeBanner.contentType && activeBanner.contentType.startsWith('video'))) ? (
                <video
                  src={activeBanner.dataUrl}
                  className="h-64 w-full object-cover"
                  autoPlay
                  loop
                  muted
                  playsInline
                />
              ) : (
                <img src={activeBanner.dataUrl} alt="Homepage Banner" className="h-64 w-full object-cover" />
              )}
              <div className="absolute inset-0 bg-gradient-to-r from-slate-950/80 via-slate-900/40 to-slate-950/90 flex items-center">
                <div className="p-6 md:p-10">
                  <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-rb-sun-gold drop-shadow-rb-glow">Featured</p>
                  <h2 className={`mt-2 leading-tight text-slate-50 ${heroContent.headlineFont} ${heroContent.headlineSize} ${heroContent.headlineBold? 'font-bold':'font-medium'} ${heroContent.headlineItalic? 'italic':''}`}>{heroContent.headline}</h2>
                  <p className={`mt-2 max-w-md text-slate-200 ${heroContent.bodyFont} ${heroContent.bodySize} ${heroContent.bodyBold? 'font-semibold':''} ${heroContent.bodyItalic? 'italic':''}`}>{heroContent.body}</p>
                  <a href="/beats" className="mt-4 inline-block rounded-full bg-rb-trop-sunrise px-5 py-2 text-xs font-semibold text-slate-950 shadow-rb-gloss-btn hover:brightness-110">Explore Beats</a>
                </div>
              </div>
            </div>
          ) : <SpotlightBanner />}
          {beats.length > 0 && boostedMap.size > 0 && (
            <section className="rounded-3xl border border-yellow-500/40 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 shadow-rb-gloss-panel sm:p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-yellow-300">Boosted Beats</p>
                  <h2 className="font-display text-xl font-semibold text-slate-50">Sponsored placements from producers</h2>
                  <p className="text-sm text-slate-400">Handy surfacing for producers investing in reach.</p>
                </div>
                <div className="flex items-center gap-2 rounded-full border border-yellow-400/70 bg-yellow-500/10 px-3 py-1.5 text-[11px] text-yellow-200">
                  <span className="h-2 w-2 rounded-full bg-yellow-400 animate-pulse" />
                  <span>Sponsored • rotates frequently</span>
                </div>
              </div>
              <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {beats
                  .filter(b => boostedMap.has(b.id))
                  .slice(0,4)
                  .map(b => (
                    <BeatCard
                      key={b.id}
                      {...b}
                      coverUrl={b.coverUrl || null}
                      audioUrl={b.audioUrl}
                      sponsored={true}
                    />
                  ))}
              </div>
            </section>
          )}
          <div className="rounded-3xl border border-slate-900/80 bg-gradient-to-br from-slate-950 to-slate-900/80 p-6 shadow-[0_30px_120px_rgba(0,0,0,0.35)]">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-emerald-300">Featured Curation</p>
                <h2 className="font-display text-xl font-semibold text-slate-50">Playlists to spark ideas</h2>
                <p className="text-sm text-slate-400">Modern, BeatStars-inspired cards with engagement on-platform.</p>
              </div>
              {/* Removed prototype text/badge so users only see the curated playlists */}
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {playlists.map(p => (
                <PlaylistCard
                  key={p.id}
                  playlist={p}
                  trending={trendingIds.has(p.id)}
                  commentValue={commentDrafts[p.id] || ''}
                  onChangeComment={(v)=>setCommentDrafts(prev=>({...prev, [p.id]: v}))}
                  onLike={()=>handleLike(p.id)}
                  onFav={()=>handleFav(p.id)}
                  onPlay={()=>handlePlay(p.id)}
                  onComment={()=>handleComment(p.id)}
                />
              ))}
              {playlists.length === 0 && <p className="text-sm text-slate-400">Playlists will appear here once created in the admin panel.</p>}
            </div>
          </div>
          <div className="grid gap-10 md:grid-cols-[1.2fr,0.9fr]">
            <div className="space-y-8">
              {/* Featured beats section removed per request */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-base font-semibold text-slate-50 sm:text-lg">Beats you should check out</h2>
                  <a href="/beats" className="text-[11px] font-medium text-emerald-300 hover:text-emerald-200 sm:text-xs">View all</a>
                </div>
                {loading && <p className="text-sm text-slate-400">Loading…</p>}
                <div className="grid gap-3 grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 lg:grid-cols-3">
                  {!loading &&
                    trending.map((b) => (
                      <BeatCard
                        key={b.id}
                        {...b}
                        coverUrl={b.coverUrl || null}
                        audioUrl={b.audioUrl}
                        square
                      />
                    ))}
                </div>
              </div>
            </div>
            <div className="space-y-8">
              {/* Genre filter, testimonials, and platform benefits removed per request */}
              <TrendingProducers />
            </div>
          </div>
        </div>
      </section>
    </>
  )
}

function PlaylistCard({ playlist, trending=false, commentValue, onChangeComment, onLike, onFav, onPlay, onComment }) {
  const recentComment = (playlist.comments || [])[0]
  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-800/70 bg-slate-900/80 p-4 shadow-[0_12px_40px_rgba(0,0,0,0.25)]">
      {trending && <div className="absolute right-3 top-3 text-2xl animate-bounce drop-shadow-[0_0_12px_rgba(248,113,113,0.65)]">🔥</div>}
      <div className="h-36 w-full overflow-hidden rounded-xl border border-slate-800/70 bg-slate-950/70 cursor-pointer" onClick={onPlay}>
        {playlist.coverUrl ? <img src={playlist.coverUrl} alt={playlist.title} className="h-full w-full object-cover transition duration-300 hover:scale-[1.03]" /> : <div className="h-full w-full bg-gradient-to-br from-emerald-600/30 via-slate-900 to-slate-950" />}
      </div>
      <div className="mt-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-100 truncate">{playlist.title}</p>
          <p className="text-[11px] text-slate-400 line-clamp-2">{playlist.description}</p>
        </div>
        <button onClick={onPlay} className="rounded-full border border-emerald-400/70 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold text-emerald-200 hover:bg-emerald-500/20">Play</button>
      </div>
      <div className="mt-2 flex flex-wrap gap-1">
        {(playlist.moods || []).map(m => <span key={m} className="rounded-full border border-slate-700/70 px-2 py-[3px] text-[10px] text-slate-200">{m}</span>)}
        {(!playlist.moods || playlist.moods.length === 0) && <span className="text-[10px] text-slate-500">No moods</span>}
      </div>
      <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-slate-400">
        <span>Plays {playlist.plays || 0}</span>
        <span>Likes {playlist.likes || 0}</span>
        <span>Favs {playlist.favorites || 0}</span>
        <span>Comments {(playlist.comments || []).length}</span>
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-[12px]">
        <button onClick={onLike} className="rounded-full border border-slate-700/70 px-3 py-1 text-slate-200 hover:border-emerald-400/70">Like</button>
        <button onClick={onFav} className="rounded-full border border-slate-700/70 px-3 py-1 text-slate-200 hover:border-emerald-400/70">Favorite</button>
        <button onClick={onPlay} className="rounded-full border border-emerald-500/70 px-3 py-1 text-emerald-200 hover:bg-emerald-500/10">Play again</button>
      </div>
      <div className="mt-3 rounded-xl border border-slate-800/70 bg-slate-950/70 p-3">
        <p className="text-[11px] font-semibold text-slate-200 mb-2">Drop a comment</p>
        <div className="flex gap-2">
          <input value={commentValue} onChange={e=>onChangeComment(e.target.value)} className="flex-1 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-emerald-400/70 focus:outline-none" placeholder="Show love or feedback" />
          <button onClick={onComment} className="rounded-lg border border-emerald-400/70 bg-emerald-500/10 px-3 text-[12px] font-semibold text-emerald-200 hover:bg-emerald-500/20">Post</button>
        </div>
        {recentComment && (
          <p className="mt-2 text-[11px] text-slate-400 truncate"><span className="text-emerald-300 font-medium">{recentComment.user}</span>: {recentComment.text}</p>
        )}
      </div>
    </div>
  )
}




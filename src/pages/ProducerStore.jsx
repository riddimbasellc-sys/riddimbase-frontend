import { useParams, Link, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useMemo, useRef, useState } from 'react'
import BackButton from '../components/BackButton'
import { BeatCard } from '../components/BeatCard'
import { fetchBeatsByProducerId } from '../services/beatsRepository'
import { getProducerProfile } from '../services/producerProfileService'
import { supabase } from '../lib/supabaseClient'
import { slugify } from '../utils/slugify'

export default function ProducerStore() {
  const { producerId: producerIdParam } = useParams()
  const [producerId, setProducerId] = useState(() => {
    const raw = producerIdParam ? String(producerIdParam) : ''
    const candidate = raw.substring(0, 36)
    const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/
    return uuidRegex.test(candidate) ? candidate : null
  })
  const location = useLocation()
  const navigate = useNavigate()
  const [beats, setBeats] = useState([])
  const [loading, setLoading] = useState(true)
  const [layout, setLayout] = useState('grid') // 'grid' or 'list'
  const [genre, setGenre] = useState('')
  const [sort, setSort] = useState('newest') // 'newest' | 'oldest' | 'price_low' | 'price_high' | 'bpm_low' | 'bpm_high'
  const [query, setQuery] = useState('')
  const [profile, setProfile] = useState(null)
  const [page, setPage] = useState(1)
  const pageSize = 24
  const loadMoreRef = useRef(null)
  const [priceMax, setPriceMax] = useState(999)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [chips, setChips] = useState([])

  // Resolve non-UUID route params (slugs) to actual producer ID
  useEffect(() => {
    let active = true
    ;(async () => {
      if (producerId || !producerIdParam) return
      const raw = String(producerIdParam)
      const candidate = raw.substring(0, 36)
      const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/
      if (uuidRegex.test(candidate)) {
        if (active) setProducerId(candidate)
        return
      }
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, display_name')
        if (error || !data) return
        const targetSlug = slugify(raw || '')
        const match = data.find((row) => slugify(row.display_name || row.id) === targetSlug)
        if (match && active) setProducerId(match.id)
      } catch {
        // ignore resolution errors
      }
    })()
    return () => { active = false }
  }, [producerId, producerIdParam])

  useEffect(() => {
    // Initialize from URL or localStorage
    const params = new URLSearchParams(location.search)
    const ls = (k, d) => {
      try { const v = localStorage.getItem(k); return v !== null ? v : d } catch { return d }
    }
    const initLayout = params.get('layout') || ls('ps_layout','grid')
    const initGenre = params.get('genre') || ls('ps_genre','')
    const initSort = params.get('sort') || ls('ps_sort','newest')
    const initQuery = params.get('q') || ls('ps_q','')
    const initPrice = Number(params.get('priceMax') || ls('ps_priceMax','999'))
    setLayout(initLayout === 'list' ? 'list' : 'grid')
    setGenre(initGenre)
    setSort(initSort)
    setQuery(initQuery)
    setPriceMax(isNaN(initPrice) ? 999 : initPrice)
    let active = true
    ;(async () => {
      try {
        const list = await fetchBeatsByProducerId(producerId, { limit: pageSize, offset: 0, genre, maxPrice: priceMax, query })
        if (!active) return
        setBeats(Array.isArray(list) ? list : [])
      } catch {
        setBeats([])
      } finally {
        setLoading(false)
      }
    })()
    return () => { active = false }
  }, [producerId, location.search])

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const p = await getProducerProfile(producerId)
        if (active) setProfile(p || null)
      } catch { setProfile(null) }
    })()
    return () => { active = false }
  }, [producerId])

  const filteredSorted = useMemo(() => {
    let list = beats.slice()
    const q = query.trim().toLowerCase()
    if (q) {
      list = list.filter(b => (b.title || '').toLowerCase().includes(q) || (b.genre || '').toLowerCase().includes(q))
    }
    if (genre) {
      list = list.filter(b => (b.genre || '').toLowerCase() === genre.toLowerCase())
    }
    list = list.filter(b => Number(b.price || 0) <= Number(priceMax || 999))
    switch (sort) {
      case 'oldest':
        list.sort((a,b)=> new Date(a.created_at||0) - new Date(b.created_at||0)); break
      case 'price_low':
        list.sort((a,b)=> (a.price||0) - (b.price||0)); break
      case 'price_high':
        list.sort((a,b)=> (b.price||0) - (a.price||0)); break
      case 'bpm_low':
        list.sort((a,b)=> (a.bpm||0) - (b.bpm||0)); break
      case 'bpm_high':
        list.sort((a,b)=> (b.bpm||0) - (a.bpm||0)); break
      default:
        list.sort((a,b)=> new Date(b.created_at||0) - new Date(a.created_at||0)); break
    }
    return list
  }, [beats, genre, sort, query])

  const paged = useMemo(() => filteredSorted.slice(0, page * pageSize), [filteredSorted, page])

  useEffect(() => {
    const el = loadMoreRef.current
    if (!el) return
    const io = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          setPage(async p => {
            const nextCount = (p + 1) * pageSize
            if (nextCount <= filteredSorted.length) return p + 1
            try {
              const more = await fetchBeatsByProducerId(producerId, { limit: pageSize, offset: beats.length, genre, maxPrice: priceMax, query })
              if (Array.isArray(more) && more.length > 0) {
                setBeats(prev => [...prev, ...more])
                return p + 1
              }
            } catch {}
            return p
          })
        }
      }
    }, { rootMargin: '1200px' })
    io.observe(el)
    return () => io.disconnect()
  }, [filteredSorted.length, genre, priceMax, query])

  // Persist controls to URL + localStorage
  useEffect(() => {
    const params = new URLSearchParams()
    if (layout) params.set('layout', layout)
    if (genre) params.set('genre', genre)
    if (sort) params.set('sort', sort)
    if (query) params.set('q', query)
    if (priceMax !== 999) params.set('priceMax', String(priceMax))
    const qs = params.toString()
    navigate({ pathname: location.pathname, search: qs ? `?${qs}` : '' }, { replace: true })
    try {
      localStorage.setItem('ps_layout', layout)
      localStorage.setItem('ps_genre', genre)
      localStorage.setItem('ps_sort', sort)
      localStorage.setItem('ps_q', query)
      localStorage.setItem('ps_priceMax', String(priceMax))
    } catch {}
  }, [layout, genre, sort, query, priceMax, navigate, location.pathname])

  const GridToggle = () => (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => setLayout('list')}
        title="List view"
        className={`flex h-8 w-8 items-center justify-center rounded-full border text-[12px] ${layout==='list' ? 'border-emerald-400/80 bg-emerald-500/20 text-emerald-200' : 'border-slate-700/80 bg-slate-900/60 text-slate-300 hover:border-emerald-400/70 hover:text-emerald-200'}`}
      >
        ☰
      </button>
      <button
        type="button"
        onClick={() => setLayout('grid')}
        title="Grid view"
        className={`flex h-8 w-8 items-center justify-center rounded-full border text-[12px] ${layout==='grid' ? 'border-emerald-400/80 bg-emerald-500/20 text-emerald-200' : 'border-slate-700/80 bg-slate-900/60 text-slate-300 hover:border-emerald-400/70 hover:text-emerald-200'}`}
      >
        ▣
      </button>
    </div>
  )

  return (
    <section className="bg-slate-950/95 min-h-screen">
      <div className="mx-auto max-w-6xl px-3 py-6 sm:px-4 sm:py-8">
        <div className="flex items-center justify-between gap-3 sticky top-0 z-10 bg-slate-950/95 py-2">
          <div className="flex items-center gap-3">
            <BackButton />
            <div>
              <h1 className="font-display text-xl font-semibold text-slate-50 sm:text-2xl">
                Producer Beat Store
              </h1>
              <p className="mt-1 text-xs text-slate-400 sm:text-sm">
                Browse all beats from this producer.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              value={query}
              onChange={e=>setQuery(e.target.value)}
              placeholder="Search titles or genres"
              className="hidden sm:block rounded-full border border-slate-700/70 bg-slate-900/80 px-3 py-1.5 text-[12px] text-slate-100"
            />
            <select value={genre} onChange={e=>setGenre(e.target.value)} className="rounded-full border border-slate-700/70 bg-slate-900/80 px-3 py-1.5 text-[12px] text-slate-100">
              <option value="">All genres</option>
              {['Dancehall','Trap Dancehall','Reggae','Afrobeat','Soca','Trap','Hip Hop','Drill'].map(g=> <option key={g}>{g}</option>)}
            </select>
            <select value={sort} onChange={e=>setSort(e.target.value)} className="rounded-full border border-slate-700/70 bg-slate-900/80 px-3 py[1.5] text-[12px] text-slate-100">
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="price_low">Price: Low → High</option>
              <option value="price_high">Price: High → Low</option>
              <option value="bpm_low">BPM: Low → High</option>
              <option value="bpm_high">BPM: High → Low</option>
            </select>
            <div className="hidden md:flex items-center gap-2">
              <label className="text-[10px] text-slate-400">Max Price</label>
              <input type="range" min="0" max="999" value={priceMax} onChange={e=>setPriceMax(Number(e.target.value))} />
              <span className="text-[11px] font-semibold text-slate-200">${priceMax}</span>
            </div>
            <GridToggle />
            <button type="button" onClick={()=>setDrawerOpen(true)} className="md:hidden rounded-full border border-slate-700/70 bg-slate-800/70 px-3 py-1.5 text-[11px] text-slate-200">Filters</button>
          </div>
        </div>

        {profile && (
          <div className="mt-4 rounded-2xl border border-slate-800/70 bg-slate-900/80 p-4 flex items-center gap-3">
            <div className="h-12 w-12 overflow-hidden rounded-xl bg-gradient-to-br from-emerald-500 via-emerald-400 to-orange-500">
              {profile.avatarUrl && <img src={profile.avatarUrl} alt={profile.displayName||'Producer'} className="h-full w-full object-cover" />}
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-slate-50">{profile.displayName || 'Producer'}</p>
              <p className="text-[11px] text-slate-400 truncate">{profile.bio || 'Browse the full catalog from this producer.'}</p>
            </div>
            <a href={`/producer/${producerId || producerIdParam}`} className="rounded-full border border-slate-700/70 bg-slate-800/70 px-3 py-1.5 text-[11px] text-slate-200 hover:bg-slate-700/70">View Profile</a>
          </div>
        )}

        {loading && (
          <p className="mt-6 text-[11px] text-slate-500">Loading beats…</p>
        )}

        {!loading && beats.length === 0 && (
          <div className="mt-6 rounded-xl border border-slate-800/70 bg-slate-900/70 p-6 text-center text-sm text-slate-400">
            No beats found. <Link to="/beats" className="underline">Browse marketplace</Link>.
          </div>
        )}

        {!loading && filteredSorted.length > 0 && (
          <div className={`${layout==='grid' ? 'mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'mt-6 space-y-4'} overflow-y-auto max-h-[70vh] pr-1`}>
            {/* Filter chips */}
            <div className="col-span-full -mt-2 mb-1 flex flex-wrap gap-2 text-[10px]">
              {query && (
                <button onClick={()=>setQuery('')} className="inline-flex items-center gap-1 rounded-full border border-slate-700/70 bg-slate-900/80 px-2 py-1 text-slate-200">
                  <span>Search: {query}</span><span className="text-slate-400">×</span>
                </button>
              )}
              {genre && (
                <button onClick={()=>setGenre('')} className="inline-flex items-center gap-1 rounded-full border border-slate-700/70 bg-slate-900/80 px-2 py-1 text-slate-200">
                  <span>Genre: {genre}</span><span className="text-slate-400">×</span>
                </button>
              )}
              {priceMax !== 999 && (
                <button onClick={()=>setPriceMax(999)} className="inline-flex items-center gap-1 rounded-full border border-slate-700/70 bg-slate-900/80 px-2 py-1 text-slate-200">
                  <span>Max Price: ${priceMax}</span><span className="text-slate-400">×</span>
                </button>
              )}
            </div>
            {paged.map((b) => (
              <BeatCard
                key={b.id}
                id={b.id}
                title={b.title}
                producer={b.producer || 'Unknown'}
                collaborator={b.collaborator || null}
                userId={b.user_id || b.userId}
                genre={b.genre}
                bpm={b.bpm}
                musicalKey={b.key}
                price={b.price}
                coverUrl={b.cover_url || b.coverUrl}
                audioUrl={b.audio_url || b.audioUrl}
                description={b.description}
                licensePrices={b.license_prices || b.licensePrices}
                freeDownload={!!(b.free_download || b.freeDownload)}
                square={layout==='grid'}
                compact={layout==='grid'}
              />
            ))}
            <div ref={loadMoreRef} className="col-span-full h-10" />
          </div>
        )}

        {/* Mobile filter drawer */}
        {drawerOpen && (
          <div className="fixed inset-0 z-20">
            <button className="absolute inset-0 bg-black/60" onClick={()=>setDrawerOpen(false)} aria-label="Close filters" />
            <div className="absolute bottom-0 left-0 right-0 rounded-t-2xl border border-slate-800/80 bg-slate-900/95 p-4">
              <p className="text-sm font-semibold text-slate-100">Filters</p>
              <div className="mt-3 space-y-3">
                <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search titles or genres" className="w-full rounded-lg border border-slate-700/70 bg-slate-950/70 px-3 py-2 text-[12px] text-slate-100" />
                <select value={genre} onChange={e=>setGenre(e.target.value)} className="w-full rounded-lg border border-slate-700/70 bg-slate-950/70 px-3 py-2 text-[12px] text-slate-100">
                  <option value="">All genres</option>
                  {['Dancehall','Trap Dancehall','Reggae','Afrobeat','Soca','Trap','Hip Hop','Drill'].map(g=> <option key={g}>{g}</option>)}
                </select>
                <div className="flex items-center gap-2">
                  <label className="text-[10px] text-slate-400">Max Price</label>
                  <input className="flex-1" type="range" min="0" max="999" value={priceMax} onChange={e=>setPriceMax(Number(e.target.value))} />
                  <span className="text-[11px] font-semibold text-slate-200">${priceMax}</span>
                </div>
                <select value={sort} onChange={e=>setSort(e.target.value)} className="w-full rounded-lg border border-slate-700/70 bg-slate-950/70 px-3 py-2 text-[12px] text-slate-100">
                  <option value="newest">Newest</option>
                  <option value="oldest">Oldest</option>
                  <option value="price_low">Price: Low → High</option>
                  <option value="price_high">Price: High → Low</option>
                  <option value="bpm_low">BPM: Low → High</option>
                  <option value="bpm_high">BPM: High → Low</option>
                </select>
                <button type="button" onClick={()=>setDrawerOpen(false)} className="w-full rounded-full bg-emerald-500 px-4 py-2 text-[11px] font-semibold text-slate-950">Apply</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

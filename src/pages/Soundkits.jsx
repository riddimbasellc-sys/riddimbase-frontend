import { useEffect, useState } from 'react'
import BackButton from '../components/BackButton'
import { listSoundkits } from '../services/soundkitsRepository'

export function Soundkits() {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [genre, setGenre] = useState('all')
  const [sort, setSort] = useState('trending')
  const [kits, setKits] = useState([])
  const [loading, setLoading] = useState(false)

  const categoryOptions = ['all', 'drum-kit', 'melody-pack', '808s-bass', 'fx-textures', 'multi-genre-bundle']
  const genreOptions = ['all', 'dancehall', 'reggae', 'afrobeats', 'trap', 'rnb']

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      const data = await listSoundkits({ search, category, genre, sort })
      if (active) {
        setKits(data)
        setLoading(false)
      }
    }
    load()
    return () => {
      active = false
    }
  }, [search, category, genre, sort])

  return (
    <section className="bg-slate-950/95">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="flex items-center gap-3 mb-5">
          <BackButton />
          <div>
            <h1 className="font-display text-2xl font-semibold text-slate-50">
              Soundkits
            </h1>
            <p className="mt-1 text-sm text-slate-300">
              Discover drum kits, loop packs and sample folders from Caribbean and global producers.
            </p>
          </div>
        </div>

        {/* Filters / search */}
        <div className="grid gap-4 rounded-2xl border border-white/10 bg-black/70 bg-rb-gloss-stripes bg-blend-soft-light p-4 shadow-rb-gloss-panel md:grid-cols-3">
          <div className="space-y-3">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              Search
            </div>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search kits or producers"
              className="w-full rounded-xl border border-slate-700/80 bg-slate-950/80 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:border-red-400 focus:outline-none"
            />
          </div>
          <div className="space-y-3">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              Category
            </div>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-xl border border-slate-700/80 bg-slate-950/80 px-3 py-2 text-xs text-slate-100 focus:border-red-400 focus:outline-none"
            >
              {categoryOptions.map((c) => (
                <option key={c} value={c}>
                  {c === 'all' ? 'All types' : c.replace('-', ' ')}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-3">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              Genre & sort
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <select
                value={genre}
                onChange={(e) => setGenre(e.target.value)}
                className="w-full rounded-xl border border-slate-700/80 bg-slate-950/80 px-3 py-2 text-xs text-slate-100 focus:border-red-400 focus:outline-none"
              >
                {genreOptions.map((g) => (
                  <option key={g} value={g}>
                    {g === 'all' ? 'All genres' : g.toUpperCase()}
                  </option>
                ))}
              </select>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="w-full rounded-xl border border-slate-700/80 bg-slate-950/80 px-3 py-2 text-xs text-slate-100 focus:border-red-400 focus:outline-none"
              >
                <option value="trending">Trending</option>
                <option value="newest">Newest</option>
                <option value="price-low">Price: Low → High</option>
                <option value="price-high">Price: High → Low</option>
              </select>
            </div>
          </div>
        </div>
        <div className="mt-8 rounded-2xl border border-slate-800/80 bg-slate-900/80 p-6 shadow-rb-gloss-panel">
          {loading ? (
            <p className="text-xs text-slate-300">Loading soundkits…</p>
          ) : kits.length === 0 ? (
            <p className="text-xs text-slate-300">
              No soundkits found yet. As producers start uploading packs, they will appear here and can be
              filtered by title, category, genre and price.
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {kits.map((kit) => (
                <article
                  key={kit.id}
                  className="group rounded-2xl border border-slate-800/80 bg-slate-950/80 p-4 flex flex-col gap-3 hover:border-red-500/70 transition"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-xl bg-slate-900/80 border border-slate-800/80 overflow-hidden flex items-center justify-center text-[11px] text-slate-400">
                      {kit.cover_url ? (
                        <img
                          src={kit.cover_url}
                          alt={kit.title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span>Kit</span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-semibold text-slate-50">{kit.title}</h3>
                      {kit.genre && (
                        <p className="truncate text-[11px] text-slate-400">{kit.genre}</p>
                      )}
                    </div>
                  </div>
                  {kit.description && (
                    <p className="line-clamp-2 text-[11px] text-slate-300">{kit.description}</p>
                  )}
                  <div className="mt-auto flex items-center justify-between text-[11px]">
                    <div className="flex flex-wrap gap-1">
                      {kit.category && (
                        <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-slate-400">
                          {kit.category.replace('-', ' ')}
                        </span>
                      )}
                      {Array.isArray(kit.tags) && kit.tags.length > 0 && (
                        <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[10px] text-slate-400">
                          {kit.tags.slice(0, 3).join(', ')}
                          {kit.tags.length > 3 ? '…' : ''}
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      {kit.is_free ? (
                        <p className="text-[11px] font-semibold text-emerald-300">Free</p>
                      ) : (
                        <p className="text-[11px] font-semibold text-slate-50">${'{'}kit.price?.toFixed ? kit.price.toFixed(2) : kit.price || 0{'}'}</p>
                      )}
                      <p className="text-[10px] text-slate-500">
                        {new Date(kit.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

export default Soundkits


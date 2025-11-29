import { useState } from 'react'
import BackButton from '../components/BackButton'

export function Soundkits() {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [genre, setGenre] = useState('all')
  const [sort, setSort] = useState('trending')

  const categoryOptions = ['all', 'drum-kit', 'melody-pack', '808s-bass', 'fx-textures']
  const genreOptions = ['all', 'dancehall', 'reggae', 'afrobeats', 'trap', 'rnb']

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

        {/* Results placeholder */}
        <div className="mt-8 rounded-2xl border border-slate-800/80 bg-slate-900/80 p-6 shadow-rb-gloss-panel">
          <p className="text-xs text-slate-300">
            The Soundkits marketplace is being wired up. Once producers start uploading kits, you’ll be able
            to filter by title, category, genre and price using the controls above.
          </p>
        </div>
      </div>
    </section>
  )
}

export default Soundkits


const GENRES = [
  'Dancehall',
  'Reggae',
  'Soca',
  'Afrobeats',
  'TrapHall',
  'Lovers Rock',
  'Dub',
]

export function GenreChips() {
  return (
    <div className="mt-6 flex flex-wrap gap-2">
      {GENRES.map((g) => (
        <button
          key={g}
          className="rounded-full border border-slate-700/70 bg-slate-900/70 px-3 py-1 text-xs font-medium text-slate-200 shadow-sm hover:border-emerald-400/70 hover:text-emerald-300 transition"
        >
          {g}
        </button>
      ))}
    </div>
  )
}

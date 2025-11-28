export default function GenreFilters({ genres = [], onSelect }) {
  const list = genres.length ? genres : ['Dancehall','TrapHall','Reggae','Afrobeats','Soca','Drill']
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-slate-100">Filter by Genre</h3>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {list.map(g => (
          <button
            key={g}
            onClick={()=>onSelect && onSelect(g)}
            className="flex-shrink-0 whitespace-nowrap rounded-full border border-slate-700/70 px-3 py-1 text-[11px] text-slate-300 hover:border-emerald-400/70 hover:text-emerald-300"
          >
            {g}
          </button>
        ))}
      </div>
    </div>
  )
}

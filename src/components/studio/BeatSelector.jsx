import { useMemo, useState } from 'react'
import { useBeats } from '../../hooks/useBeats'

export default function BeatSelector({ selectedBeat, onSelectBeat, isPlaying, onTogglePlay, volume, onVolumeChange }) {
  const { beats, loading } = useBeats()
  const [query, setQuery] = useState('')

  const filteredBeats = useMemo(() => {
    if (!beats || !beats.length) return []
    const term = query.trim().toLowerCase()
    if (!term) return beats
    return beats.filter((b) => {
      const title = (b.title || '').toLowerCase()
      const producer = (b.producer || '').toLowerCase()
      const bpm = b.bpm != null ? String(b.bpm) : ''
      return (
        title.includes(term) ||
        producer.includes(term) ||
        bpm.includes(term)
      )
    })
  }, [beats, query])

  const suggestions = useMemo(() => {
    const term = query.trim()
    if (!term) return []
    return filteredBeats.slice(0, 6)
  }, [filteredBeats, query])

  return (
    <div className="studio-panel flex h-full min-h-0 flex-col rounded-2xl border border-slate-800/80 p-3 text-[12px] text-slate-200">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Track</p>
          <h2 className="mt-1 text-sm font-semibold text-slate-50">Selected Beat</h2>
        </div>
        <span className="rounded-full border border-slate-700/70 px-2 py-0.5 text-[10px] text-slate-400">Recording Lab</span>
      </div>

      <div className="mt-3 flex gap-3 rounded-xl border border-slate-800/80 bg-slate-950/70 p-2.5">
        <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg bg-slate-900/80">
          {selectedBeat?.coverUrl ? (
            <img src={selectedBeat.coverUrl} alt={selectedBeat.title} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[10px] text-slate-500">No cover</div>
          )}
        </div>
        <div className="flex flex-1 flex-col justify-between">
          <div>
            <p className="text-[12px] font-semibold text-slate-50 truncate">{selectedBeat?.title || 'Choose a beat'}</p>
            <p className="text-[11px] text-slate-400 truncate">
              {selectedBeat ? `${selectedBeat.producer || 'Unknown'} • ${selectedBeat.bpm || '--'} BPM` : 'Select a beat from the list'}
            </p>
          </div>
          <div className="mt-1 flex items-center gap-2">
            <button
              type="button"
              onClick={onTogglePlay}
              disabled={!selectedBeat}
              title={isPlaying ? 'Pause beat' : 'Play beat'}
              className={`flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-semibold transition ${
                selectedBeat
                  ? 'bg-red-500 text-slate-950 hover:bg-red-400'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              {isPlaying ? '❚❚' : '▶'}
            </button>
            <div className="ml-auto flex items-center gap-2">
              <span className="text-[10px] text-slate-400">Vol</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={volume}
                onChange={(e) => onVolumeChange(Number(e.target.value))}
                disabled={!selectedBeat}
                title="Beat volume"
                className="h-1 w-20 cursor-pointer appearance-none rounded-full bg-slate-800 accent-red-500"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 flex min-h-0 flex-1 flex-col">
        <div className="mb-2 flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Beats</p>
            {beats && beats.length > 0 && (
              <span className="text-[10px] text-slate-500">{filteredBeats.length} of {beats.length}</span>
            )}
          </div>
          <div className="relative">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by title, producer, or BPM"
              className="w-full rounded-lg border border-slate-800/80 bg-slate-950/80 px-2.5 py-1.5 text-[11px] text-slate-200 placeholder:text-slate-500 focus:border-red-500/70 focus:outline-none focus:ring-1 focus:ring-red-500/40"
            />
            {suggestions.length > 0 && (
              <div className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-slate-800/90 bg-slate-950/98 shadow-xl">
                {suggestions.map((b) => {
                  const active = selectedBeat && selectedBeat.id === b.id
                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => {
                        onSelectBeat(b)
                        setQuery('')
                      }}
                      className={`flex w-full items-center gap-2 px-2 py-1 text-left text-[11px] transition hover:bg-slate-900 ${
                        active ? 'text-red-200' : 'text-slate-200'
                      }`}
                    >
                      <span className="truncate flex-1">{b.title}</span>
                      <span className="ml-2 text-[10px] text-slate-500 truncate">
                        {b.producer || 'Unknown'} · {b.bpm || '--'} BPM
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>
        <div className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
          {loading && <p className="text-[11px] text-slate-500">Loading beats…</p>}
          {!loading && filteredBeats.length === 0 && (
            <p className="text-[11px] text-slate-500">No beats match your search.</p>
          )}
          {filteredBeats.map((b) => {
            const active = selectedBeat && selectedBeat.id === b.id
            return (
              <button
                key={b.id}
                type="button"
                onClick={() => onSelectBeat(b)}
                className={`group flex w-full items-center gap-2 rounded-lg border px-2 py-1 text-left text-[11px] transition focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500/40 ${
                  active
                    ? 'border-red-500/60 bg-red-500/5 text-red-100 ring-1 ring-red-500/25'
                    : 'border-slate-800/80 bg-slate-950/60 text-slate-300 hover:border-red-500/50 hover:bg-slate-900 hover:ring-1 hover:ring-red-500/20'
                }`}
              >
                <div className="h-7 w-7 flex-shrink-0 overflow-hidden rounded-md bg-slate-900/80">
                  {b.coverUrl ? (
                    <img src={b.coverUrl} alt={b.title} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[9px] text-slate-500">RB</div>
                  )}
                </div>
                <div className="flex min-w-0 flex-1 flex-col leading-tight">
                  <span className="truncate font-medium">{b.title}</span>
                  <span className="truncate text-[10px] text-slate-400">{b.producer || 'Unknown'} • {b.bpm || '--'} BPM</span>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

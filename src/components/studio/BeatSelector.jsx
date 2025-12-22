import { useMemo } from 'react'
import { useBeats } from '../../hooks/useBeats'

export default function BeatSelector({ selectedBeat, onSelectBeat, isPlaying, onTogglePlay, loopEnabled, onToggleLoop, volume, onVolumeChange }) {
  const { beats, loading } = useBeats()

  const displayBeats = useMemo(() => {
    if (!beats || !beats.length) return []
    return beats.slice(0, 8)
  }, [beats])

  return (
    <div className="studio-panel rounded-2xl border border-slate-800/80 p-4 text-[12px] text-slate-200">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Track</p>
          <h2 className="mt-1 text-sm font-semibold text-slate-50">Selected Beat</h2>
        </div>
        <span className="rounded-full border border-slate-700/70 px-2 py-0.5 text-[10px] text-slate-400">Recording Lab</span>
      </div>

      <div className="mt-3 rounded-xl border border-slate-800/80 bg-slate-950/70 p-3 flex gap-3">
        <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg bg-slate-900/80">
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
            <button
              type="button"
              onClick={onToggleLoop}
              disabled={!selectedBeat}
              title="Toggle loop"
              className={`rounded-full px-3 py-1 text-[10px] font-medium transition ${
                loopEnabled
                  ? 'bg-slate-800/80 text-emerald-300 border border-emerald-500/60'
                  : 'border border-slate-700/70 text-slate-400 hover:border-slate-500/80'
              } ${!selectedBeat ? 'opacity-40 cursor-not-allowed' : ''}`}
            >
              Loop
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

      <div className="mt-4">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Beats</p>
        <div className="max-h-52 space-y-1 overflow-y-auto pr-1">
          {loading && <p className="text-[11px] text-slate-500">Loading beats…</p>}
          {!loading && displayBeats.length === 0 && (
            <p className="text-[11px] text-slate-500">No beats available yet.</p>
          )}
          {displayBeats.map((b) => {
            const active = selectedBeat && selectedBeat.id === b.id
            return (
              <button
                key={b.id}
                type="button"
                onClick={() => onSelectBeat(b)}
                className={`flex w-full items-center gap-3 rounded-lg border px-2 py-1.5 text-left text-[11px] transition ${
                  active
                    ? 'border-red-500/60 bg-red-500/5 text-red-100'
                    : 'border-slate-800/80 bg-slate-950/60 text-slate-300 hover:border-red-500/50 hover:bg-slate-900'
                }`}
              >
                <div className="h-8 w-8 flex-shrink-0 overflow-hidden rounded-md bg-slate-900/80">
                  {b.coverUrl ? (
                    <img src={b.coverUrl} alt={b.title} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[9px] text-slate-500">RB</div>
                  )}
                </div>
                <div className="flex flex-1 flex-col">
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

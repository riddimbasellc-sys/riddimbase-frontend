export default function RecorderControls({
  recordState,
  onRecord,
  onStop,
  onReRecord,
  canRecord,
  hasRecording,
  isBeatPlaying,
  onToggleBeat,
  timerSeconds,
  isArrangementPlaying,
  onToggleArrangementPlay,
}) {
  const minutes = String(Math.floor(timerSeconds / 60)).padStart(2, '0')
  const seconds = String(timerSeconds % 60).padStart(2, '0')

  return (
    <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-slate-800/80 bg-slate-950/80 p-4 text-[12px] text-slate-200">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Session</p>
          <p className="mt-1 text-sm font-semibold text-slate-50">Recording Controls</p>
        </div>
        <div className="flex items-center gap-2 text-[11px]">
          <span className="rounded-full bg-slate-900/90 px-2 py-0.5 text-slate-400">{minutes}:{seconds}</span>
          <span
            className={`flex h-7 w-7 items-center justify-center rounded-full border text-[10px] font-semibold ${
              recordState === 'recording'
                ? 'border-red-500/80 bg-red-500 text-slate-950 studio-rec-glow'
                : 'border-slate-700/70 bg-slate-900 text-red-400'
            }`}
            title={recordState === 'recording' ? 'Recording in progress' : 'Ready'}
          >
            REC
          </span>
        </div>
      </div>

      <div className="mt-1 flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={!canRecord || recordState === 'recording'}
          onClick={onRecord}
          title={canRecord ? 'Start recording' : 'Enable microphone to record'}
          className={`rounded-full px-4 py-2 text-[12px] font-semibold transition ${
            !canRecord || recordState === 'recording'
              ? 'cursor-not-allowed bg-slate-800 text-slate-500'
              : 'bg-red-500 text-slate-950 hover:bg-red-400'
          }`}
        >
          Record
        </button>
        <button
          type="button"
          disabled={recordState !== 'recording'}
          onClick={onStop}
          title="Stop recording"
          className={`rounded-full px-4 py-2 text-[12px] font-semibold transition ${
            recordState === 'recording'
              ? 'bg-slate-800 text-slate-100 hover:bg-slate-700'
              : 'cursor-not-allowed bg-slate-800 text-slate-500'
          }`}
        >
          Stop
        </button>
        <button
          type="button"
          disabled={!hasRecording}
          onClick={onReRecord}
          title="Discard and record again"
          className={`rounded-full px-4 py-2 text-[12px] font-semibold transition ${
            hasRecording
              ? 'border border-slate-700/80 text-slate-200 hover:border-red-400/80 hover:text-red-200'
              : 'cursor-not-allowed border border-slate-800 text-slate-600'
          }`}
        >
          Re-record
        </button>
        <div className="ml-auto flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
          <div className="flex items-center gap-2">
            <span>Arrangement</span>
            <button
              type="button"
              onClick={onToggleArrangementPlay}
              className={`rounded-full px-3 py-1 text-[11px] font-medium transition ${
                isArrangementPlaying
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/60 shadow-[0_0_12px_rgba(16,185,129,0.4)]'
                  : 'border border-slate-700/80 text-slate-300 hover:border-emerald-400/70'
              }`}
              title="Play / pause the full arrangement (Spacebar)"
            >
              {isArrangementPlaying ? 'Pause' : 'Play'}
            </button>
          </div>
          <div className="flex items-center gap-2">
            <span>Beat</span>
            <button
              type="button"
              disabled={!isBeatPlaying && !canRecord}
              onClick={onToggleBeat}
              title={isBeatPlaying ? 'Pause beat' : 'Play beat while monitoring'}
              className={`rounded-full px-3 py-1 text-[11px] font-medium transition ${
                isBeatPlaying
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/60'
                  : 'border border-slate-700/80 text-slate-300 hover:border-emerald-400/70'
              }`}
            >
              {isBeatPlaying ? 'Pause' : 'Play'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function StudioSidebar({
  micStatus,
  onRequestMic,
  monitorEnabled,
  onToggleMonitor,
  inputGain,
  onInputGainChange,
  selectedVocalTrackName,
  selectedTrackFx,
  onOpenEffect,
}) {
  const micLabel =
    micStatus === 'granted'
      ? 'Mic enabled'
      : micStatus === 'denied'
      ? 'Mic blocked'
      : 'Enable microphone'

  return (
    <div className="studio-panel rounded-2xl border border-slate-800/80 p-4 text-[12px] text-slate-200">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Studio</p>
          <h2 className="mt-1 text-sm font-semibold text-slate-50">Input & FX</h2>
        </div>
      </div>

      <div className="mt-4 space-y-4">
        <div className="rounded-xl border border-slate-800/80 bg-slate-950/80 p-3">
          <p className="text-[11px] font-semibold text-slate-300">Input device</p>
          <p className="mt-1 text-[11px] text-slate-500">Default system microphone</p>
          {/* TODO: enumerate devices for advanced selection */}
          <button
            type="button"
            onClick={onRequestMic}
            title="Request microphone access"
            className={`mt-3 w-full rounded-full px-3 py-1.5 text-[11px] font-semibold transition ${
              micStatus === 'granted'
                ? 'border border-emerald-500/70 text-emerald-300 bg-emerald-500/10'
                : micStatus === 'denied'
                ? 'border border-red-500/60 text-red-300 bg-red-500/10'
                : 'border border-slate-700/80 text-slate-200 hover:border-emerald-400/70'
            }`}
          >
            {micLabel}
          </button>
        </div>

        <div className="rounded-xl border border-slate-800/80 bg-slate-950/80 p-3 space-y-3">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-semibold text-slate-300">Headphone monitoring</span>
            <button
              type="button"
              onClick={onToggleMonitor}
              title="Toggle live monitoring"
              className={`rounded-full px-3 py-1 text-[11px] font-medium transition ${
                monitorEnabled
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/60'
                  : 'border border-slate-700/80 text-slate-300 hover:border-emerald-400/70'
              }`}
            >
              {monitorEnabled ? 'On' : 'Off'}
            </button>
          </div>

          <div>
            <div className="flex items-center justify-between text-[11px] text-slate-300">
              <span>Input gain</span>
              <span className="text-slate-400">{Math.round(inputGain * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="2"
              step="0.05"
              value={inputGain}
              onChange={(e) => onInputGainChange(Number(e.target.value))}
              title="Adjust input gain for monitoring"
              className="mt-2 h-1 w-full cursor-pointer appearance-none rounded-full bg-slate-800 accent-red-500"
            />
          </div>
        </div>

        <div className="rounded-xl border border-slate-800/80 bg-slate-950/80 p-3 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] font-semibold text-slate-300">Vocal effects</p>
            <span className="truncate text-[10px] text-slate-500">
              {selectedVocalTrackName ? `Track: ${selectedVocalTrackName}` : 'Select a vocal track'}
            </span>
          </div>
          {[{ key: 'eq', label: 'EQ' }, { key: 'reverb', label: 'Reverb' }, { key: 'delay', label: 'Delay' }, { key: 'compressor', label: 'Compressor' }, { key: 'autotune', label: 'Auto-Tune' }].map((fx) => {
            const active = !!selectedTrackFx?.[fx.key]?.enabled
            return (
              <button
                key={fx.key}
                type="button"
                onClick={() => onOpenEffect?.(fx.key)}
                disabled={!selectedVocalTrackName}
                title={selectedVocalTrackName ? `${fx.label} settings` : 'Select a vocal track to edit FX'}
                className={`mt-1 flex w-full items-center justify-between rounded-lg border px-3 py-1.5 text-[11px] transition ${
                  active
                    ? 'border-red-500/70 bg-red-500/10 text-red-100 shadow-[0_0_10px_rgba(248,113,113,0.5)]'
                    : 'border-slate-700/70 bg-slate-950 text-slate-300 hover:border-red-500/60'
                } ${!selectedVocalTrackName ? 'cursor-not-allowed opacity-60' : ''}`}
              >
                <span>{fx.label}</span>
                <span className={`h-2.5 w-2.5 rounded-full ${active ? 'bg-red-500 shadow-[0_0_10px_rgba(248,113,113,0.9)]' : 'bg-slate-600'}`} />
              </button>
            )
          })}
          <p className="mt-2 text-[10px] text-slate-500">Click an effect to open presets & settings for the selected vocal track.</p>
        </div>
      </div>
    </div>
  )
}

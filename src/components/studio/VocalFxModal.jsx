import React, { useMemo, useState } from 'react'

const EFFECT_LABELS = {
  eq: 'EQ',
  reverb: 'Reverb',
  delay: 'Delay',
  compressor: 'Compressor',
  autotune: 'Auto-Tune',
}

export default function VocalFxModal({
  effectKey,
  trackName,
  initialSettings,
  onApply,
  onDiscard,
  onPreview,
}) {
  const [draft, setDraft] = useState(initialSettings || {})

  const title = EFFECT_LABELS[effectKey] || 'Effect'

  const handleChange = (patch) => {
    setDraft((prev) => ({ ...prev, ...patch }))
  }

  const presets = useMemo(() => {
    switch (effectKey) {
      case 'eq':
        return [
          { id: 'flat', label: 'Flat', value: { lowGainDb: 0, midGainDb: 0, highGainDb: 0 } },
          { id: 'bright', label: 'Bright Vocal', value: { lowGainDb: -2, midGainDb: 1.5, highGainDb: 4 } },
          { id: 'warm', label: 'Warm Vocal', value: { lowGainDb: 3, midGainDb: -1, highGainDb: -2 } },
        ]
      case 'reverb':
        return [
          { id: 'room', label: 'Room', value: { mix: 0.18, decay: 1.4 } },
          { id: 'hall', label: 'Hall', value: { mix: 0.28, decay: 2.2 } },
          { id: 'plate', label: 'Plate', value: { mix: 0.24, decay: 1.8 } },
        ]
      case 'delay':
        return [
          { id: 'slap', label: 'Slap', value: { time: 0.18, feedback: 0.22, mix: 0.16 } },
          { id: 'echo', label: 'Echo', value: { time: 0.32, feedback: 0.35, mix: 0.2 } },
          { id: 'dotted', label: 'Dotted', value: { time: 0.42, feedback: 0.28, mix: 0.18 } },
        ]
      case 'compressor':
        return [
          { id: 'vocal-gentle', label: 'Vocal Gentle', value: { threshold: -20, ratio: 2.5, attack: 0.01, release: 0.25 } },
          { id: 'vocal-tight', label: 'Vocal Tight', value: { threshold: -24, ratio: 3.5, attack: 0.005, release: 0.2 } },
        ]
      case 'autotune':
        return [
          { id: 'natural', label: 'Natural', value: { retuneSpeed: 0.4, humanize: 0.5 } },
          { id: 'modern', label: 'Modern', value: { retuneSpeed: 0.8, humanize: 0.2 } },
        ]
      default:
        return []
    }
  }, [effectKey])

  const applyPreset = (preset) => {
    handleChange({ ...preset.value, preset: preset.id, enabled: true })
  }

  const renderControls = () => {
    switch (effectKey) {
      case 'eq':
        return (
          <div className="space-y-4">
            <SliderRow
              label="Pre-Amp"
              min={-12}
              max={12}
              step={0.5}
              value={draft.preGainDb ?? 0}
              onChange={(v) => handleChange({ preGainDb: v })}
              unit="dB"
            />

            <div className="grid gap-3 sm:grid-cols-3">
              {[{
                key: 'lowGainDb',
                label: 'Low',
                sub: 'Body',
              }, {
                key: 'midGainDb',
                label: 'Mid',
                sub: 'Presence',
              }, {
                key: 'highGainDb',
                label: 'High',
                sub: 'Air',
              }].map((band) => (
                <div key={band.key} className="space-y-1 text-[10px] text-slate-300">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{band.label}</span>
                    <span className="tabular-nums text-slate-400">
                      {(draft[band.key] ?? 0).toFixed(1)} dB
                    </span>
                  </div>
                  <SliderRow
                    label=""
                    min={-12}
                    max={12}
                    step={0.5}
                    value={draft[band.key] ?? 0}
                    onChange={(v) => handleChange({ [band.key]: v })}
                    unit=""
                  />
                  <p className="text-[9px] text-slate-500">{band.sub}</p>
                </div>
              ))}
            </div>

            <p className="text-[10px] text-slate-500">
              Use the pre-amp and three tone bands to sculpt your track, similar to a graphic EQ.
            </p>
          </div>
        )
      case 'reverb':
        return (
          <div className="space-y-3">
            <SliderRow
              label="Mix"
              min={0}
              max={1}
              step={0.02}
              value={draft.mix ?? 0.2}
              onChange={(v) => handleChange({ mix: v })}
              unit=""
            />
            <SliderRow
              label="Decay"
              min={0.5}
              max={4}
              step={0.1}
              value={draft.decay ?? 1.8}
              onChange={(v) => handleChange({ decay: v })}
              unit="s"
            />
          </div>
        )
      case 'delay':
        return (
          <div className="space-y-3">
            <SliderRow
              label="Time"
              min={0.05}
              max={0.8}
              step={0.01}
              value={draft.time ?? 0.28}
              onChange={(v) => handleChange({ time: v })}
              unit="s"
            />
            <SliderRow
              label="Feedback"
              min={0}
              max={0.9}
              step={0.02}
              value={draft.feedback ?? 0.3}
              onChange={(v) => handleChange({ feedback: v })}
              unit=""
            />
            <SliderRow
              label="Mix"
              min={0}
              max={1}
              step={0.02}
              value={draft.mix ?? 0.18}
              onChange={(v) => handleChange({ mix: v })}
              unit=""
            />
          </div>
        )
      case 'compressor':
        return (
          <div className="space-y-3">
            <SliderRow
              label="Threshold"
              min={-40}
              max={0}
              step={1}
              value={draft.threshold ?? -18}
              onChange={(v) => handleChange({ threshold: v })}
              unit="dB"
            />
            <SliderRow
              label="Ratio"
              min={1}
              max={6}
              step={0.1}
              value={draft.ratio ?? 3}
              onChange={(v) => handleChange({ ratio: v })}
              unit=":1"
            />
            <SliderRow
              label="Attack"
              min={0.001}
              max={0.1}
              step={0.001}
              value={draft.attack ?? 0.01}
              onChange={(v) => handleChange({ attack: v })}
              unit="s"
            />
            <SliderRow
              label="Release"
              min={0.05}
              max={1}
              step={0.01}
              value={draft.release ?? 0.25}
              onChange={(v) => handleChange({ release: v })}
              unit="s"
            />
          </div>
        )
      case 'autotune':
        return (
          <div className="space-y-3">
            <div className="flex gap-2 text-[11px] text-slate-200">
              <div className="flex-1">
                <label className="mb-1 block text-[10px] uppercase tracking-[0.16em] text-slate-400">Key</label>
                <select
                  className="w-full rounded-md border border-slate-700/80 bg-slate-900 px-2 py-1 text-[11px] text-slate-100"
                  value={draft.key || 'C'}
                  onChange={(e) => handleChange({ key: e.target.value })}
                >
                  {['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'].map((k) => (
                    <option key={k} value={k}>{k}</option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <label className="mb-1 block text-[10px] uppercase tracking-[0.16em] text-slate-400">Scale</label>
                <select
                  className="w-full rounded-md border border-slate-700/80 bg-slate-900 px-2 py-1 text-[11px] text-slate-100"
                  value={draft.scale || 'major'}
                  onChange={(e) => handleChange({ scale: e.target.value })}
                >
                  <option value="major">Major</option>
                  <option value="minor">Minor</option>
                </select>
              </div>
            </div>
            <SliderRow
              label="Retune speed"
              min={0}
              max={1}
              step={0.02}
              value={draft.retuneSpeed ?? 0.5}
              onChange={(v) => handleChange({ retuneSpeed: v })}
              unit=""
            />
            <SliderRow
              label="Humanize"
              min={0}
              max={1}
              step={0.02}
              value={draft.humanize ?? 0.3}
              onChange={(v) => handleChange({ humanize: v })}
              unit=""
            />
            <p className="mt-1 text-[10px] text-slate-500">Pitch processing is UI-only for now. Rendering via a tuned backend or advanced DSP can be added later.</p>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 px-4 text-[12px] text-slate-100">
      <div className="w-full max-w-md rounded-2xl border border-slate-700/80 bg-slate-950/95 p-4 shadow-2xl">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Track FX</p>
            <h2 className="text-sm font-semibold text-slate-50">{title} · {trackName}</h2>
          </div>
          <button
            type="button"
            onClick={onDiscard}
            className="rounded-full border border-slate-700/80 px-2 py-0.5 text-[10px] text-slate-400 hover:border-slate-500/80"
          >
            Close
          </button>
        </div>

        <div className="mb-3 flex flex-wrap items-center gap-2 text-[10px] text-slate-400">
          <span className="uppercase tracking-[0.16em]">Presets</span>
          {presets.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => applyPreset(p)}
              className={`rounded-full border px-2 py-0.5 text-[10px] transition ${
                draft.preset === p.id
                  ? 'border-red-500/70 bg-red-500/10 text-red-100'
                  : 'border-slate-700/80 text-slate-300 hover:border-red-500/60'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          <label className="inline-flex items-center gap-2 text-[11px] text-slate-200">
            <input
              type="checkbox"
              className="h-3 w-3 rounded border-slate-600 bg-slate-900"
              checked={!!draft.enabled}
              onChange={(e) => handleChange({ enabled: e.target.checked })}
            />
            <span>Enable this effect on this track</span>
          </label>

          <div className="mt-1 rounded-xl border border-slate-800/80 bg-slate-950/80 p-3">
            {renderControls()}
          </div>
        </div>

        <div className="mt-4 flex items-center justify-end gap-2 text-[11px]">
          <button
            type="button"
            onClick={() => onPreview?.(draft)}
            className="rounded-full border border-slate-700/80 px-3 py-1 text-slate-200 hover:border-emerald-500/70"
          >
            Preview
          </button>
          <button
            type="button"
            onClick={onDiscard}
            className="rounded-full border border-slate-700/80 px-3 py-1 text-slate-300 hover:border-slate-500/80"
          >
            Discard
          </button>
          <button
            type="button"
            onClick={() => onApply(draft)}
            className="rounded-full bg-red-500 px-4 py-1 font-semibold text-slate-950 hover:bg-red-400"
          >
            Apply to track
          </button>
        </div>
      </div>
    </div>
  )
}

function SliderRow({ label, min, max, step, value, onChange, unit }) {
  const displayValue =
    typeof value === 'number' && Number.isFinite(value)
      ? value.toFixed(2)
      : '0.00'

  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-[10px] text-slate-300">
        <span>{label}</span>
        <span className="tabular-nums text-slate-400">{displayValue} {unit}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => {
          const raw = parseFloat(e.target.value)
          const numeric = Number.isFinite(raw) ? raw : 0
          const clamped = Math.max(min, Math.min(max, numeric))
          onChange(clamped)
        }}
        className="h-1 w-full cursor-pointer appearance-none rounded-full bg-slate-800 accent-red-500"
      />
    </div>
  )
}

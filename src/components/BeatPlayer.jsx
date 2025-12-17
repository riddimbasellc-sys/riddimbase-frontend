import { useEffect, useRef, useState } from 'react'
import WaveSurfer from 'wavesurfer.js'
import { recordPlay } from '../services/analyticsService'
import { ensureExclusive, clearIfCurrent } from '../utils/playbackBus'

export function BeatPlayer({ src, className = '', beatId, producerId }) {
  const containerRef = useRef(null)
  const waveSurferRef = useRef(null)
  const hasRecordedRef = useRef(false)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)

  useEffect(() => {
    if (!src || !containerRef.current) return

    const ws = WaveSurfer.create({
      container: containerRef.current,
      waveColor: '#64748b',
      progressColor: '#ef4444',
      cursorColor: '#e5e7eb',
      height: 64,
      barWidth: 2,
      barGap: 1,
      responsive: true,
    })

    waveSurferRef.current = ws

    ws.load(src)

    const onReady = () => {
      setDuration(ws.getDuration() || 0)
    }
    const onTime = () => {
      setProgress(ws.getCurrentTime() || 0)
    }
    const onFinish = () => {
      setPlaying(false)
      setProgress(ws.getDuration() || 0)
      clearIfCurrent(ws)
    }

    ws.on('ready', onReady)
    ws.on('audioprocess', onTime)
    ws.on('seek', onTime)
    ws.on('finish', onFinish)

    return () => {
      ws.un('ready', onReady)
      ws.un('audioprocess', onTime)
      ws.un('seek', onTime)
      ws.un('finish', onFinish)
      ws.destroy()
      waveSurferRef.current = null
      setPlaying(false)
      setProgress(0)
      setDuration(0)
      hasRecordedRef.current = false
    }
  }, [src])

  useEffect(() => {
    const ws = waveSurferRef.current
    if (!ws) return

    if (playing) {
      if (!hasRecordedRef.current && beatId) {
        recordPlay(beatId, producerId)
        hasRecordedRef.current = true
      }
      // Enforce exclusive playback across the app.
      ensureExclusive(ws)
      ws.play().catch(() => setPlaying(false))
    } else {
      ws.pause()
      clearIfCurrent(ws)
    }
  }, [playing, beatId, producerId])

  const toggle = () => {
    if (!src) return
    setPlaying((p) => !p)
  }

  const fmt = (t) => {
    if (!isFinite(t)) return '0:00'
    const m = Math.floor(t / 60)
    const s = Math.floor(t % 60)
      .toString()
      .padStart(2, '0')
    return `${m}:${s}`
  }

  const pct = duration ? (progress / duration) * 100 : 0

  return (
    <div
      className={`rounded-xl border border-slate-800/80 bg-slate-900/80 p-3 flex flex-col gap-3 ${className}`}
    >
      <div className="flex items-center gap-3">
        <button
          onClick={toggle}
          className="rounded-full bg-emerald-500 px-4 py-1.5 text-[11px] font-semibold text-slate-950 hover:bg-emerald-400 transition"
        >
          {playing ? 'Pause' : 'Play'}
        </button>
        <div className="flex flex-1 flex-col gap-1">
          <div
            ref={containerRef}
            className="h-16 w-full overflow-hidden rounded-md bg-slate-950/80"
          />
          <div className="flex items-center justify-between text-[10px] text-slate-400">
            <div className="flex-1 h-1 rounded-full bg-slate-800 overflow-hidden mr-2">
              <div
                style={{ width: `${pct}%` }}
                className="h-full bg-red-500 transition-[width]"
              />
            </div>
            <span>
              {fmt(progress)} / {fmt(duration)}
            </span>
          </div>
        </div>
      </div>
      {!src && (
        <p className="text-[11px] text-slate-500">
          No audio source.
        </p>
      )}
    </div>
  )
}

import { useEffect, useRef, useState } from 'react'
import { recordPlay } from '../services/analyticsService'

export function BeatPlayer({ src, className = '', beatId, producerId }) {
  const audioRef = useRef(null)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    const onTime = () => setProgress(audio.currentTime)
    const onMeta = () => setDuration(audio.duration || 0)
    audio.addEventListener('timeupdate', onTime)
    audio.addEventListener('loadedmetadata', onMeta)
    return () => {
      audio.removeEventListener('timeupdate', onTime)
      audio.removeEventListener('loadedmetadata', onMeta)
    }
  }, [])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    if (playing) {
      audio.play().catch(()=> setPlaying(false))
    } else {
      audio.pause()
    }
  }, [playing])

  const toggle = () => {
    setPlaying(p => {
      const next = !p
      if (!p && next) {
        if (beatId) recordPlay(beatId, producerId)
      }
      return next
    })
  }
  const fmt = (t) => {
    if (!isFinite(t)) return '0:00'
    const m = Math.floor(t/60)
    const s = Math.floor(t%60).toString().padStart(2,'0')
    return `${m}:${s}`
  }
  const pct = duration ? (progress / duration) * 100 : 0

  return (
    <div className={`rounded-xl border border-slate-800/80 bg-slate-900/80 p-3 flex flex-col gap-3 ${className}`}>      
      <div className="flex items-center gap-3">
        <button onClick={toggle} className="rounded-full bg-emerald-500 px-4 py-1.5 text-[11px] font-semibold text-slate-950 hover:bg-emerald-400 transition">
          {playing ? 'Pause' : 'Play'}
        </button>
        <div className="flex-1 h-2 rounded-full bg-slate-800 overflow-hidden">
          <div style={{ width: pct + '%' }} className="h-full bg-red-500 transition-[width]" />
        </div>
        <span className="text-[10px] text-slate-400">{fmt(progress)} / {fmt(duration)}</span>
      </div>
      {!src && <p className="text-[11px] text-slate-500">No audio source.</p>}
      <audio ref={audioRef} src={src || ''} preload="metadata" />
    </div>
  )
}

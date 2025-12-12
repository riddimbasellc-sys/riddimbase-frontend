import { useEffect, useRef, useState } from 'react'
import WaveSurfer from 'wavesurfer.js'
import { recordPlay } from '../services/analyticsService'

export function MiniWavePlayer({ src, beatId, producerId, height = 40, buttonRef }) {
  const containerRef = useRef(null)
  const waveSurferRef = useRef(null)
  const hasRecordedRef = useRef(false)
  const [playing, setPlaying] = useState(false)

  useEffect(() => {
    if (!src || !containerRef.current) return

    const ws = WaveSurfer.create({
      container: containerRef.current,
      height,
      barWidth: 2,
      barGap: 1,
      barRadius: 2,
      waveColor: '#334155',
      progressColor: '#f97316',
      cursorColor: '#e5e7eb',
      responsive: true,
    })

    waveSurferRef.current = ws
    ws.load(src)

    const onFinish = () => {
      setPlaying(false)
    }

    ws.on('finish', onFinish)

    return () => {
      ws.un('finish', onFinish)
      ws.destroy()
      waveSurferRef.current = null
      hasRecordedRef.current = false
      setPlaying(false)
    }
  }, [src, height])

  useEffect(() => {
    const ws = waveSurferRef.current
    if (!ws) return

    if (playing) {
      if (!hasRecordedRef.current && beatId) {
        recordPlay(beatId, producerId)
        hasRecordedRef.current = true
      }
      ws.play().catch(() => setPlaying(false))
    } else {
      ws.pause()
    }
  }, [playing, beatId, producerId])

  const toggle = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (!src) return
    setPlaying((p) => !p)
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={toggle}
        ref={buttonRef}
        className="flex h-7 w-7 items-center justify-center rounded-full border border-white/25 bg-white/5 text-[10px] text-slate-50 shadow-sm"
      >
        {playing ? '❚❚' : '▶'}
      </button>
      <div
        ref={containerRef}
        className="h-8 flex-1 overflow-hidden rounded-md bg-slate-950/80"
      />
    </div>
  )
}

export default MiniWavePlayer

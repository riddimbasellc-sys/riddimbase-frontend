import { useEffect, useMemo, useRef, useState } from 'react'
import WaveSurfer from 'wavesurfer.js'

let sharedAudioContext = null

function getSharedAudioContext() {
  if (typeof window === 'undefined') return null
  if (sharedAudioContext) return sharedAudioContext
  const Ctx = window.AudioContext || window.webkitAudioContext
  if (!Ctx) return null
  sharedAudioContext = new Ctx()
  return sharedAudioContext
}

function clamp01(value) {
  if (!Number.isFinite(value)) return 0
  return Math.min(1, Math.max(0, value))
}

export default function AudioClip({
  src,
  height = 32,
  className = '',
  clipStartSec = 0,
  clipDurationSec,
  isSelected = false,
  selection,
  onSeek,
}) {
  const hostRef = useRef(null)
  const waveRef = useRef(null)
  const overlayRef = useRef(null)
  const rafRef = useRef(null)
  const resizeRafRef = useRef(null)
  const [isReady, setIsReady] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [durationSec, setDurationSec] = useState(0)

  const effectiveDurationSec = useMemo(() => {
    if (Number.isFinite(clipDurationSec) && clipDurationSec > 0) return clipDurationSec
    if (Number.isFinite(durationSec) && durationSec > 0) return durationSec
    return 0
  }, [clipDurationSec, durationSec])

  const applyFullWaveformFit = () => {
    const ws = waveRef.current
    const host = hostRef.current
    if (!ws || !host) return

    const d = ws.getDuration?.() || effectiveDurationSec || 0
    if (!d || !Number.isFinite(d) || d <= 0) return

    const width = host.getBoundingClientRect().width
    if (!width || !Number.isFinite(width) || width <= 0) return

    // Full waveform fix: stretch the entire duration across the clip width.
    const minPxPerSec = width / d
    try {
      ws.zoom?.(minPxPerSec)
    } catch {}
  }

  const syncOverlayCanvasSize = () => {
    const canvas = overlayRef.current
    const host = hostRef.current
    if (!canvas || !host) return

    const rect = host.getBoundingClientRect()
    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1

    const nextW = Math.max(1, Math.round(rect.width * dpr))
    const nextH = Math.max(1, Math.round(rect.height * dpr))

    if (canvas.width !== nextW) canvas.width = nextW
    if (canvas.height !== nextH) canvas.height = nextH

    canvas.style.width = `${Math.max(1, Math.round(rect.width))}px`
    canvas.style.height = `${Math.max(1, Math.round(rect.height))}px`
  }

  const drawOverlay = () => {
    const canvas = overlayRef.current
    const ws = waveRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1
    const w = canvas.width
    const h = canvas.height

    ctx.clearRect(0, 0, w, h)

    // Border
    ctx.lineWidth = 1 * dpr
    ctx.strokeStyle = isSelected ? 'rgba(248,113,113,0.85)' : 'rgba(51,65,85,0.9)'
    ctx.strokeRect(0.5 * dpr, 0.5 * dpr, w - 1 * dpr, h - 1 * dpr)

    // Selection region (optional)
    if (
      selection &&
      Number.isFinite(selection.startSec) &&
      Number.isFinite(selection.endSec) &&
      effectiveDurationSec > 0
    ) {
      const start = clamp01(selection.startSec / effectiveDurationSec)
      const end = clamp01(selection.endSec / effectiveDurationSec)
      const x = Math.min(start, end) * w
      const selW = Math.max(0, Math.abs(end - start) * w)
      ctx.fillStyle = 'rgba(16,185,129,0.10)'
      ctx.fillRect(x, 0, selW, h)
      ctx.strokeStyle = 'rgba(16,185,129,0.35)'
      ctx.strokeRect(x + 0.5 * dpr, 0.5 * dpr, Math.max(0, selW - 1 * dpr), h - 1 * dpr)
    }

    // Playhead (local to this clip)
    if (ws && isReady && effectiveDurationSec > 0) {
      const t = ws.getCurrentTime?.() || 0
      const x = clamp01(t / effectiveDurationSec) * w
      ctx.strokeStyle = 'rgba(248,113,113,0.85)'
      ctx.lineWidth = 1 * dpr
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, h)
      ctx.stroke()
    }
  }

  useEffect(() => {
    if (!src || !hostRef.current) return

    const host = hostRef.current

    const ws = WaveSurfer.create({
      container: host,
      backend: 'MediaElement',
      height,
      barWidth: 2,
      barGap: 1,
      barRadius: 2,
      waveColor: '#64748b',
      progressColor: '#ef4444',
      cursorWidth: 0,
      cursorColor: 'transparent',
      responsive: true,
      interact: false,
      audioContext: getSharedAudioContext() || undefined,
    })

    waveRef.current = ws
    setIsReady(false)
    setIsPlaying(false)

    const onReady = () => {
      setIsReady(true)
      setDurationSec(ws.getDuration?.() || 0)
      syncOverlayCanvasSize()
      applyFullWaveformFit()
      drawOverlay()
    }

    const onPlay = () => setIsPlaying(true)
    const onPause = () => setIsPlaying(false)
    const onTime = () => {
      // Overlay is rendered on RAF; this is a hint to keep it in sync.
    }

    ws.on('ready', onReady)
    ws.on('play', onPlay)
    ws.on('pause', onPause)
    ws.on('seek', onTime)
    ws.on('audioprocess', onTime)

    ws.load(src)

    return () => {
      try { ws.un('ready', onReady) } catch {}
      try { ws.un('play', onPlay) } catch {}
      try { ws.un('pause', onPause) } catch {}
      try { ws.un('seek', onTime) } catch {}
      try { ws.un('audioprocess', onTime) } catch {}
      try { ws.destroy() } catch {}
      if (waveRef.current === ws) waveRef.current = null
      setIsReady(false)
      setIsPlaying(false)
      setDurationSec(0)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src, height])

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    const ro = new ResizeObserver(() => {
      if (resizeRafRef.current) cancelAnimationFrame(resizeRafRef.current)
      resizeRafRef.current = requestAnimationFrame(() => {
        syncOverlayCanvasSize()
        applyFullWaveformFit()
        drawOverlay()
      })
    })

    ro.observe(host)

    return () => {
      try { ro.disconnect() } catch {}
      if (resizeRafRef.current) cancelAnimationFrame(resizeRafRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src, effectiveDurationSec])

  useEffect(() => {
    const tick = () => {
      drawOverlay()
      rafRef.current = requestAnimationFrame(tick)
    }

    // Keep the overlay synced while playing or selected.
    if (isPlaying || isSelected) {
      rafRef.current = requestAnimationFrame(tick)
      return () => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current)
      }
    }

    // Otherwise draw once.
    drawOverlay()
    return undefined
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, isSelected, isReady, selection?.startSec, selection?.endSec, effectiveDurationSec])

  const handleClick = (e) => {
    const host = hostRef.current
    if (!host) return

    // Focus so the clip can capture Space.
    try { host.focus() } catch {}

    const rect = host.getBoundingClientRect()
    const x = e.clientX - rect.left
    const ratio = clamp01(x / rect.width)

    const ws = waveRef.current
    if (ws) {
      try { ws.seekTo?.(ratio) } catch {}
    }

    if (effectiveDurationSec > 0) {
      const nextTimelineSec = (clipStartSec || 0) + ratio * effectiveDurationSec
      onSeek?.(nextTimelineSec)
    }
  }

  const togglePlay = () => {
    const ws = waveRef.current
    if (!ws) return
    try {
      if (ws.isPlaying?.()) ws.pause?.()
      else ws.play?.()
    } catch {}
  }

  const handleKeyDown = (e) => {
    const target = e.target
    const tag = target && target.tagName
    const isTypingField = tag === 'INPUT' || tag === 'TEXTAREA' || target?.isContentEditable
    if (isTypingField) return

    if (e.key === ' ' || e.code === 'Space') {
      e.preventDefault()
      e.stopPropagation()
      togglePlay()
    }
  }

  return (
    <div className={`relative ${className}`} style={{ height }}>
      <div
        ref={hostRef}
        tabIndex={0}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        className="relative h-full w-full outline-none"
      />
      <canvas
        ref={overlayRef}
        className="pointer-events-none absolute inset-0"
      />
      {!src && (
        <div className="absolute inset-0 rounded-sm bg-gradient-to-r from-slate-600/60 to-slate-400/60" />
      )}
    </div>
  )
}

import { useEffect, useMemo, useRef, useState } from 'react'

const BASE_PIXELS_PER_SECOND = 40
const GRID_STEP_SEC = 0.25

export default function TrackTimeline({
  beatClip,
  beatLabel,
  beatTrackState,
  beatAudioUrl,
  vocalTracks,
  snapToGrid,
  playheadSec,
  isPlaying,
  loopRegion,
  onToggleSnap,
  onBeatClipChange,
  onVocalClipChange,
  onAddVocalTrack,
  onSeek,
  onPlayFromCursor,
  onStopPlayback,
  onToggleBeatMute,
  onToggleBeatSolo,
  onToggleVocalMute,
  onToggleVocalSolo,
  onToggleLoopRegion,
  onLoopSetStart,
  onLoopSetEnd,
  requestWaveform,
}) {
  const containerRef = useRef(null)
  const dragRef = useRef(null)
  const [waveforms, setWaveforms] = useState({})
  const loadedWaveformsRef = useRef(new Set())
  const [zoom, setZoom] = useState(1)

  const clampZoom = (value) => {
    return Math.min(4, Math.max(0.25, value || 1))
  }

  const pixelsPerSecond = useMemo(
    () => BASE_PIXELS_PER_SECOND * clampZoom(zoom),
    [zoom],
  )

  const hasLoopRegion =
    !!loopRegion &&
    loopRegion.enabled &&
    typeof loopRegion.startSec === 'number' &&
    typeof loopRegion.endSec === 'number' &&
    loopRegion.endSec > loopRegion.startSec

  const timelineClips = useMemo(() => {
    const clips = []
    if (beatClip) {
      clips.push({
        trackIndex: 0,
        id: 'beat',
        type: 'beat',
        label: beatLabel || 'Beat',
        startSec: beatClip.startSec || 0,
        durationSec: beatClip.durationSec || 60,
        url: beatAudioUrl || null,
        color: 'from-amber-400 to-red-500',
      })
    }
    vocalTracks.forEach((t, idx) => {
      const lane = (beatClip ? 1 : 0) + idx
      if (t.clip) {
        clips.push({
          trackIndex: lane,
          id: t.id,
          type: 'vocal',
          label: t.name || `Take ${idx + 1}`,
          startSec: t.clip.startSec || 0,
          durationSec: t.clip.durationSec || 4,
          url: t.clip.url || null,
          color: 'from-sky-400 to-emerald-400',
        })
      }
    })
    return clips
  }, [beatClip, beatLabel, vocalTracks])

  const totalSeconds = useMemo(() => {
    if (!timelineClips.length) return 32
    const maxEnd = Math.max(
      ...timelineClips.map((c) => (c.startSec || 0) + (c.durationSec || 0)),
    )
    return Math.max(32, Math.ceil(maxEnd) + 4)
  }, [timelineClips])

  useEffect(() => {
    if (!requestWaveform) return
    const urls = Array.from(
      new Set(
        timelineClips
          .map((c) => c.url)
          .filter((u) => typeof u === 'string' && u.length > 0),
      ),
    )
    urls.forEach((url) => {
      if (loadedWaveformsRef.current.has(url)) return
      loadedWaveformsRef.current.add(url)
      requestWaveform(url)
        .then((data) => {
          if (!data) return
          setWaveforms((prev) => ({ ...prev, [url]: data }))
        })
        .catch(() => {})
    })
  }, [timelineClips, requestWaveform])

  useEffect(() => {
    const handleMove = (e) => {
      if (!dragRef.current) return
      const { clip, startX } = dragRef.current
      const bounds = containerRef.current?.getBoundingClientRect()
      if (!bounds) return
      const deltaX = e.clientX - startX
      const deltaSec = deltaX / pixelsPerSecond
      let nextStart = Math.max(0, (clip.startSec || 0) + deltaSec)
      if (snapToGrid) {
        nextStart = Math.max(0, Math.round(nextStart / GRID_STEP_SEC) * GRID_STEP_SEC)
      }
      if (clip.type === 'beat') {
        onBeatClipChange?.(nextStart)
      } else {
        onVocalClipChange?.(clip.id, nextStart)
      }
    }

    const handleUp = () => {
      dragRef.current = null
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseup', handleUp)
    }

    if (dragRef.current) {
      window.addEventListener('mousemove', handleMove)
      window.addEventListener('mouseup', handleUp)
    }

    return () => {
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseup', handleUp)
    }
  }, [onBeatClipChange, onVocalClipChange, snapToGrid])

  const handleMouseDownClip = (clip, e) => {
    e.preventDefault()
    dragRef.current = {
      clip,
      startX: e.clientX,
    }
  }

  const lanes = useMemo(() => {
    const base = []
    if (beatClip) base.push({ id: 'beat-lane', label: beatLabel || 'Beat Track', kind: 'beat' })
    vocalTracks.forEach((t, idx) => {
      base.push({ id: t.id, label: t.name || `Vocal ${idx + 1}`, kind: 'vocal', trackId: t.id })
    })
    return base
  }, [beatClip, beatLabel, vocalTracks])

  const minWidth = totalSeconds * pixelsPerSecond + 160

  const handleZoomIn = () => {
    setZoom((z) => clampZoom(z * 1.25))
  }

  const handleZoomOut = () => {
    setZoom((z) => clampZoom(z / 1.25))
  }

  const handleWheelZoom = (e) => {
    if (!e.ctrlKey && !e.metaKey) return
    e.preventDefault()
    const delta = e.deltaY
    setZoom((z) => {
      if (delta > 0) return clampZoom(z / 1.1)
      if (delta < 0) return clampZoom(z * 1.1)
      return z
    })
  }

  return (
    <div className="flex h-full flex-col rounded-2xl border border-slate-800/80 bg-slate-950/95 p-3 text-[11px] text-slate-300">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">Arrangement</p>
          <p className="mt-0.5 text-xs text-slate-300">Align your beat and vocal takes on a simple timeline.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-1 rounded-full border border-slate-800/80 bg-slate-900/80 px-2 py-1 text-[9px] text-slate-400 md:flex">
            <span className="mr-1 uppercase tracking-[0.18em] text-slate-500">Zoom</span>
            <button
              type="button"
              onClick={handleZoomOut}
              className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-800 text-slate-200 hover:bg-slate-700"
              title="Zoom out (Ctrl + scroll down)"
            >
              −
            </button>
            <span className="w-8 text-center tabular-nums text-slate-300">{clampZoom(zoom).toFixed(2)}x</span>
            <button
              type="button"
              onClick={handleZoomIn}
              className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-800 text-slate-200 hover:bg-slate-700"
              title="Zoom in (Ctrl + scroll up)"
            >
              +
            </button>
          </div>
          <button
            type="button"
            onClick={onToggleLoopRegion}
            className={`rounded-full px-3 py-1 text-[10px] font-semibold transition ${
              hasLoopRegion && loopRegion?.enabled
                ? 'border border-emerald-400/80 bg-emerald-500/15 text-emerald-200'
                : 'border border-slate-700/80 bg-slate-900 text-slate-300 hover:border-emerald-400/70'
            }`}
            title="Toggle loop region playback"
          >
            Loop: {hasLoopRegion && loopRegion?.enabled ? 'On' : 'Off'}
          </button>
          {onLoopSetStart && onLoopSetEnd && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onLoopSetStart(playheadSec)}
                className="rounded-full border border-slate-700/80 bg-slate-900 px-2 py-1 text-[10px] text-slate-300 hover:border-emerald-400/70"
                title="Set loop start to current cursor position"
              >
                Set start
              </button>
              <button
                type="button"
                onClick={() => onLoopSetEnd(playheadSec)}
                className="rounded-full border border-slate-700/80 bg-slate-900 px-2 py-1 text-[10px] text-slate-300 hover:border-emerald-400/70"
                title="Set loop end to current cursor position"
              >
                Set end
              </button>
            </div>
          )}
          <button
            type="button"
            onClick={isPlaying ? onStopPlayback : onPlayFromCursor}
            className={`rounded-full px-3 py-1 text-[10px] font-semibold transition ${
              isPlaying
                ? 'border border-emerald-500/70 bg-emerald-500/15 text-emerald-200'
                : 'border border-slate-700/80 bg-slate-900 text-slate-200 hover:border-emerald-400/70'
            }`}
            title={isPlaying ? 'Stop timeline playback' : 'Play from current cursor position'}
          >
            {isPlaying ? 'Stop' : 'Play from cursor'}
          </button>
          <button
            type="button"
            onClick={onAddVocalTrack}
            className="rounded-full border border-slate-700/80 bg-slate-900 px-3 py-1 text-[10px] font-semibold text-slate-200 hover:border-emerald-400/80"
            title="Add a new vocal track lane"
          >
            + Add track
          </button>
          <button
            type="button"
            onClick={onToggleSnap}
            className={`rounded-full px-3 py-1 text-[10px] font-semibold transition ${
              snapToGrid
                ? 'border border-red-500/70 bg-red-500/15 text-red-200'
                : 'border border-slate-700/80 bg-slate-900 text-slate-300 hover:border-red-400/70'
            }`}
            title="Toggle snap-to-grid for clip movement"
          >
            Grid: {snapToGrid ? 'On' : 'Off'}
          </button>
        </div>
      </div>

      <div
        ref={containerRef}
        className="mt-1 flex-1 overflow-x-auto overflow-y-hidden rounded-xl border border-slate-800/80 bg-gradient-to-b from-slate-950/95 to-slate-950/98"
        onWheel={handleWheelZoom}
      >
        <div className="relative h-full" style={{ minWidth }}>
          {/* Time ruler */}
          <div className="relative h-6 border-b border-slate-800/80 bg-slate-950/95">
            {Array.from({ length: totalSeconds + 1 }).map((_, sec) => (
              <div
                key={sec}
                className="absolute bottom-0 flex flex-col items-center"
                style={{ left: sec * pixelsPerSecond + 140 }}
              >
                <div className="h-3 border-l border-slate-700/70" />
                <span className="mt-0.5 text-[9px] text-slate-500">{sec}</span>
              </div>
            ))}
            {/* Playhead */}
            <div
              className="absolute inset-y-0 w-px bg-red-500/80 shadow-[0_0_10px_rgba(248,113,113,0.7)]"
              style={{ left: playheadSec * pixelsPerSecond + 140 }}
            />
          </div>

          {/* Tracks */}
          <div className="divide-y divide-slate-900/80">
            {lanes.map((lane, laneIndex) => {
              const isBeatLane = lane.kind === 'beat'
              const vTrack = !isBeatLane
                ? vocalTracks.find((t) => t.id === lane.trackId)
                : null
              const muted = isBeatLane ? !!beatTrackState?.muted : !!vTrack?.muted
              const solo = isBeatLane ? !!beatTrackState?.solo : !!vTrack?.solo
              return (
                <div key={lane.id} className="flex items-stretch">
                  <div className="flex w-40 flex-shrink-0 items-center justify-between border-r border-slate-900/80 bg-slate-950/95 px-2 py-2 text-[10px] text-slate-400">
                    <span className="mr-2 truncate font-semibold text-slate-200">{lane.label}</span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() =>
                          isBeatLane
                            ? onToggleBeatSolo?.()
                            : onToggleVocalSolo?.(lane.trackId)
                        }
                        title="Solo this track"
                        className={`h-5 w-5 rounded-full text-[9px] font-semibold ${
                          solo
                            ? 'bg-emerald-500/80 text-slate-950'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        S
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          isBeatLane
                            ? onToggleBeatMute?.()
                            : onToggleVocalMute?.(lane.trackId)
                        }
                        title="Mute this track"
                        className={`h-5 w-5 rounded-full text-[9px] font-semibold ${
                          muted
                            ? 'bg-slate-600 text-slate-300'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        M
                      </button>
                    </div>
                  </div>
                  <div
                    className="relative flex-1 bg-slate-950/90 py-2"
                    onClick={(e) => {
                      const bounds = e.currentTarget.getBoundingClientRect()
                      const x = e.clientX - bounds.left
                      let sec = x / pixelsPerSecond
                      if (sec < 0) sec = 0
                      if (snapToGrid) {
                        sec = Math.round(sec / GRID_STEP_SEC) * GRID_STEP_SEC
                      }
                      onSeek?.(sec)
                    }}
                  >
                    {/* Loop region highlight */}
                    {hasLoopRegion && (
                      <div
                        className="pointer-events-none absolute inset-y-1 rounded bg-emerald-500/5 ring-1 ring-emerald-400/40"
                        style={{
                          left: loopRegion.startSec * pixelsPerSecond,
                          width: Math.max(
                            (loopRegion.endSec - loopRegion.startSec) * pixelsPerSecond,
                            4,
                          ),
                        }}
                      >
                        <div className="absolute inset-y-0 left-0 w-0.5 bg-emerald-400/80" />
                        <div className="absolute inset-y-0 right-0 w-0.5 bg-emerald-400/80" />
                      </div>
                    )}

                    {/* Grid lines */}
                    {Array.from({ length: totalSeconds + 1 }).map((_, sec) => (
                      <div
                        key={sec}
                        className="absolute top-0 h-full border-l border-slate-900/80"
                        style={{ left: sec * pixelsPerSecond }}
                      />
                    ))}

                    {/* Clips in this lane */}
                    {timelineClips
                      .filter((c) => c.trackIndex === laneIndex)
                      .map((clip) => {
                        const left = clip.startSec * pixelsPerSecond
                        const width = Math.max(clip.durationSec * pixelsPerSecond, 80)
                        const wf = clip.url ? waveforms[clip.url] : null
                        return (
                          <button
                            key={clip.id}
                            type="button"
                            onMouseDown={(e) => handleMouseDownClip(clip, e)}
                            title={
                              clip.type === 'beat'
                                ? 'Drag to offset beat against vocals'
                                : 'Drag to align this take on the grid'
                            }
                            className="group absolute flex h-10 items-center overflow-hidden rounded-md border border-slate-700/80 bg-gradient-to-r text-left text-[10px] text-slate-100 shadow-md transition-shadow hover:border-red-400/80 hover:shadow-[0_0_16px_rgba(248,113,113,0.5)]"
                            style={{ left, width }}
                          >
                            <div className="h-full w-1 bg-gradient-to-b from-red-500 to-amber-400" />
                            <div className="flex h-full flex-1 flex-col px-2 py-1">
                              <div className="mb-0.5 flex h-4 items-end gap-[1px] opacity-80">
                                {wf
                                  ? Array.from({ length: wf.length }).map((_, i) => {
                                      const v = wf[i]
                                      const h = 6 + Math.min(22, (v || 0) * 80)
                                      return (
                                        <div
                                          // eslint-disable-next-line react/no-array-index-key
                                          key={i}
                                          className="flex-1 rounded-sm bg-slate-100/80 group-hover:bg-red-200/90"
                                          style={{ height: h }}
                                        />
                                      )
                                    })
                                  : (
                                    <div className="h-full w-full rounded-sm bg-gradient-to-r from-slate-600/60 to-slate-400/60" />
                                    )}
                              </div>
                              <span className="truncate text-[10px] font-semibold">{clip.label}</span>
                              <span className="mt-0.5 text-[9px] text-slate-300">
                                {clip.type === 'beat' ? 'Beat track' : 'Vocal take'} · start {clip.startSec.toFixed(2)}s
                              </span>
                            </div>
                          </button>
                        )
                      })}
                </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

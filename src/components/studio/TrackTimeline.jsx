import { useEffect, useMemo, useRef, useState } from 'react'
import AudioClip from './AudioClip'

const BASE_PIXELS_PER_SECOND = 40
const GRID_STEP_SEC = 0.25
const LANE_LABEL_PX = 160
const MIN_CLIP_SEC = 0.1

export default function TrackTimeline({
  beatClip,
  beatLabel,
  beatTrackState,
  beatAudioUrl,
  bpm,
  vocalTracks,
  selectedVocalTrackId,
  snapToGrid,
  playheadSec,
  isPlaying,
  loopRegion,
  liveRecordingWaveforms,
  onToggleSnap,
  onBeatClipChange,
  onVocalClipChange,
  onBeatClipResize,
  onVocalClipResize,
  onAddVocalTrack,
  onSeek,
  onPlayFromCursor,
  onStopPlayback,
  onToggleBeatMute,
  onToggleBeatSolo,
  onToggleVocalMute,
  onToggleVocalSolo,
  onBeatVolumeChange,
  onVocalVolumeChange,
  onToggleLoopRegion,
  onLoopSetStart,
  onLoopSetEnd,
  onSelectVocalTrack,
  onSelectBeatTrack,
  onDeleteVocalClip,
  onDeleteVocalTrack,
  onSetLoopFromClip,
  requestWaveform,
}) {
  const containerRef = useRef(null)
  const [waveforms, setWaveforms] = useState({})
  const loadedWaveformsRef = useRef(new Set())
  const [zoom, setZoom] = useState(1)
  const [showVolumeAutomation, setShowVolumeAutomation] = useState(true)
  const [contextMenu, setContextMenu] = useState(null) // { x, y, clip?, lane? }

  const liveWaveformsMap = liveRecordingWaveforms || {}

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

  // Lazily request downsampled waveform data for any clip URLs so we can
  // render filled waveforms instead of simple rectangles.
  useEffect(() => {
    if (!requestWaveform) return

    let cancelled = false

    const loadWaveforms = async () => {
      const urlsToLoad = []

      timelineClips.forEach((clip) => {
        const url = clip.url
        if (!url) return
        if (loadedWaveformsRef.current.has(url)) return
        loadedWaveformsRef.current.add(url)
        urlsToLoad.push(url)
      })

      for (const url of urlsToLoad) {
        try {
          const data = await requestWaveform(url)
          if (!data || cancelled) continue
          setWaveforms((prev) =>
            prev[url] ? prev : { ...prev, [url]: data },
          )
        } catch (e) {
          // Allow retry on next render if something went wrong
          loadedWaveformsRef.current.delete(url)
        }
      }
    }

    loadWaveforms()

    return () => {
      cancelled = true
    }
  }, [timelineClips, requestWaveform])

  const totalSeconds = useMemo(() => {
    if (!timelineClips.length) return 32
    const maxEnd = Math.max(
      ...timelineClips.map((c) => (c.startSec || 0) + (c.durationSec || 0)),
    )
    return Math.max(32, Math.ceil(maxEnd) + 4)
  }, [timelineClips])

  const trackAreaWidth = useMemo(
    () => totalSeconds * pixelsPerSecond,
    [totalSeconds, pixelsPerSecond],
  )

  const beatsPerBar = 4
  const secondsPerBeat = useMemo(() => {
    const safeBpm = typeof bpm === 'number' && bpm > 0 ? bpm : null
    return safeBpm ? 60 / safeBpm : null
  }, [bpm])

  const secondsPerBar = useMemo(() => {
    return secondsPerBeat ? secondsPerBeat * beatsPerBar : null
  }, [secondsPerBeat])

  const clipBoundsRef = useRef(new Map())

  const handleMouseDownClip = (clip, e) => {
    e.preventDefault()

    const startX = e.clientX
    const startClientX = e.clientX
    const startClientY = e.clientY
    const initialStart = clip.startSec || 0
    let moved = false

    const handleMove = (evt) => {
      const deltaX = evt.clientX - startX
      const deltaY = evt.clientY - startClientY
      if (!moved && (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3)) moved = true
      const deltaSec = deltaX / pixelsPerSecond
      let nextStart = Math.max(0, initialStart + deltaSec)
      if (snapToGrid) {
        nextStart = Math.max(0, Math.round(nextStart / GRID_STEP_SEC) * GRID_STEP_SEC)
      }
      if (clip.type === 'beat') {
        onBeatClipChange?.(nextStart)
      } else {
        onVocalClipChange?.(clip.id, nextStart)
      }
    }

    const handleUp = (evt) => {
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseup', handleUp)

      // Click-to-seek (only if it wasn't a drag).
      if (!moved) {
        const el = evt?.target?.closest?.('[data-clip-root="true"]')
        if (el) {
          const bounds = el.getBoundingClientRect()
          const x = (evt.clientX - bounds.left) / Math.max(1, bounds.width)
          const ratio = Math.min(1, Math.max(0, x))
          const start = clip.startSec || 0
          const dur = clip.durationSec || 0
          const next = start + ratio * dur
          if (Number.isFinite(next)) onSeek?.(next)
        }
      }
    }

    window.addEventListener('mousemove', handleMove)
    window.addEventListener('mouseup', handleUp)
  }

  const lanes = useMemo(() => {
    const base = []
    if (beatClip) base.push({ id: 'beat-lane', label: beatLabel || 'Beat Track', kind: 'beat' })
    vocalTracks.forEach((t, idx) => {
      base.push({ id: t.id, label: t.name || `Vocal ${idx + 1}`, kind: 'vocal', trackId: t.id })
    })
    return base
  }, [beatClip, beatLabel, vocalTracks])

  const minWidth = trackAreaWidth + LANE_LABEL_PX

  const setZoomAnchored = ({ nextZoom, anchorTimeSec, anchorClientX }) => {
    const el = containerRef.current
    const clampedZoom = clampZoom(nextZoom)
    if (!el) {
      setZoom(clampedZoom)
      return
    }

    const oldPps = pixelsPerSecond
    const nextPps = BASE_PIXELS_PER_SECOND * clampedZoom
    const bounds = el.getBoundingClientRect()

    const anchorX =
      typeof anchorClientX === 'number'
        ? anchorClientX - bounds.left
        : LANE_LABEL_PX + (anchorTimeSec || 0) * oldPps - el.scrollLeft

    const nextScrollLeft = LANE_LABEL_PX + (anchorTimeSec || 0) * nextPps - anchorX

    setZoom(clampedZoom)
    requestAnimationFrame(() => {
      try {
        el.scrollLeft = Math.max(0, nextScrollLeft)
      } catch {}
    })
  }

  const handleZoomIn = () => {
    setZoomAnchored({ nextZoom: zoom * 1.25, anchorTimeSec: playheadSec })
  }

  const handleZoomOut = () => {
    setZoomAnchored({ nextZoom: zoom / 1.25, anchorTimeSec: playheadSec })
  }

  const handleWheelZoom = (e) => {
    if (!e.ctrlKey && !e.metaKey) return
    e.preventDefault()
    const el = containerRef.current
    const bounds = el?.getBoundingClientRect()
    const mouseX = bounds ? e.clientX - bounds.left : null
    const anchorTime =
      el && typeof mouseX === 'number'
        ? Math.max(0, (el.scrollLeft + mouseX - LANE_LABEL_PX) / pixelsPerSecond)
        : playheadSec

    const delta = e.deltaY
    const next = delta > 0 ? zoom / 1.1 : delta < 0 ? zoom * 1.1 : zoom
    setZoomAnchored({ nextZoom: next, anchorTimeSec: anchorTime, anchorClientX: e.clientX })
  }

  const [isScrubbing, setIsScrubbing] = useState(false)

  const handleScrubAtEvent = (e) => {
    const bounds = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - bounds.left
    let sec = x / pixelsPerSecond
    if (sec < 0) sec = 0
    if (snapToGrid) {
      sec = Math.round(sec / GRID_STEP_SEC) * GRID_STEP_SEC
    }
    onSeek?.(sec)
  }

  const formatTime = (sec) => {
    let safe = Number.isFinite(sec) ? sec : 0
    if (safe < 0) safe = 0
    const totalSeconds = Math.floor(safe)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const closeContextMenu = () => {
    setContextMenu(null)
  }

  const handleContextMenuAction = (action) => {
    if (!contextMenu) return

    if (contextMenu.clip) {
      const { clip } = contextMenu
      if (action === 'delete-clip') {
        if (clip.type === 'vocal') {
          onDeleteVocalClip?.(clip.id)
        }
      } else if (action === 'loop-clip') {
        const start = clip.startSec || 0
        const dur = clip.durationSec || 0
        onSetLoopFromClip?.(start, dur)
      } else if (action === 'play-clip') {
        const start = clip.startSec || 0
        onSeek?.(start)
        onPlayFromCursor?.()
      }
    } else if (contextMenu.lane) {
      const { lane } = contextMenu
      const isBeatLane = lane.kind === 'beat'

      if (action === 'delete-track') {
        if (!isBeatLane) {
          onDeleteVocalTrack?.(lane.trackId)
        }
      } else if (action === 'mute-track') {
        if (isBeatLane) {
          onToggleBeatMute?.()
        } else {
          onToggleVocalMute?.(lane.trackId)
        }
      } else if (action === 'solo-track') {
        if (isBeatLane) {
          onToggleBeatSolo?.()
        } else {
          onToggleVocalSolo?.(lane.trackId)
        }
      }
    }

    closeContextMenu()
  }

  return (
    <div className="flex h-full flex-col rounded-2xl border border-slate-800/80 bg-slate-950/95 p-3 text-[11px] text-slate-300">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">Arrangement</p>
          <p className="mt-0.5 text-xs text-slate-300">Align your beat and vocal takes on a simple timeline.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden items-center rounded-full border border-slate-800/80 bg-slate-900/80 px-2 py-1 text-[10px] font-mono tabular-nums text-slate-200 md:flex">
            <span className="text-[9px] uppercase tracking-[0.18em] text-slate-500 mr-1.5">Time</span>
            <span>{formatTime(playheadSec)}</span>
          </div>
          <div className="flex items-center gap-2">
          <div className="hidden items-center gap-1 rounded-full border border-slate-800/80 bg-slate-900/80 px-1.5 py-1 text-[9px] text-slate-400 md:flex">
            <button
              type="button"
              onClick={handleZoomOut}
              className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-800 text-slate-200 hover:bg-slate-700"
              title="Zoom out (Ctrl + scroll down)"
            >
              −
            </button>
            <span className="w-6 text-center tabular-nums text-slate-500">{clampZoom(zoom).toFixed(1)}x</span>
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
            onClick={() => setShowVolumeAutomation((v) => !v)}
            className={`hidden h-7 w-7 items-center justify-center rounded-full text-[11px] transition md:flex ${
              showVolumeAutomation
                ? 'border border-sky-500/70 bg-sky-500/15 text-sky-300'
                : 'border border-slate-700/80 bg-slate-900 text-slate-400 hover:border-sky-500/70'
            }`}
            title="Toggle volume automation lanes"
          >
            ∿
          </button>
          <button
            type="button"
            onClick={onToggleLoopRegion}
            className={`flex h-7 w-7 items-center justify-center rounded-full text-[11px] transition ${
              hasLoopRegion && loopRegion?.enabled
                ? 'border border-emerald-400/80 bg-emerald-500/15 text-emerald-200'
                : 'border border-slate-700/80 bg-slate-900 text-slate-300 hover:border-emerald-400/70'
            }`}
            title="Toggle loop region playback"
          >
            ⟳
          </button>
          <button
            type="button"
            onClick={isPlaying ? onStopPlayback : onPlayFromCursor}
            className={`flex h-7 w-7 items-center justify-center rounded-full text-[11px] transition ${
              isPlaying
                ? 'border border-emerald-500/70 bg-emerald-500/15 text-emerald-200'
                : 'border border-slate-700/80 bg-slate-900 text-slate-200 hover:border-emerald-400/70'
            }`}
            title={isPlaying ? 'Stop timeline playback' : 'Play arrangement (Spacebar)'}
          >
            {isPlaying ? '⏹' : '▶'}
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
            className={`flex h-7 w-7 items-center justify-center rounded-full text-[11px] transition ${
              snapToGrid
                ? 'border border-red-500/70 bg-red-500/15 text-red-200'
                : 'border border-slate-700/80 bg-slate-900 text-slate-300 hover:border-red-400/70'
            }`}
            title="Toggle snap-to-grid for clip movement"
          >
            #
          </button>
          </div>
        </div>
      </div>

      <div
        ref={containerRef}
        className="mt-1 flex-1 overflow-x-auto overflow-y-auto rounded-xl border border-slate-800/80 bg-gradient-to-b from-slate-950/95 to-slate-950/98"
        onWheel={handleWheelZoom}
      >
        <div className="relative min-h-full" style={{ minWidth }}>
          {/* Time ruler (sticky gutter + zoomed track area) */}
          <div className="sticky top-0 z-30 flex h-7 border-b border-slate-800/80 bg-slate-950/95">
            <div className="sticky left-0 z-40 w-40 flex-shrink-0 border-r border-slate-900/80 bg-slate-950/95" />
            <div className="relative h-full" style={{ width: trackAreaWidth }}>
              {secondsPerBar
                ? Array.from({ length: Math.ceil(totalSeconds / secondsPerBar) + 1 }).map((_, barIndex) => {
                    const t = barIndex * secondsPerBar
                    const left = t * pixelsPerSecond
                    return (
                      <div
                        key={barIndex}
                        className="absolute bottom-0 flex flex-col items-center"
                        style={{ left }}
                      >
                        <div className="h-3 border-l border-slate-600/80" />
                        <span className="mt-0.5 text-[9px] text-slate-400">{barIndex + 1}</span>
                      </div>
                    )
                  })
                : Array.from({ length: totalSeconds + 1 }).map((_, sec) => (
                    <div
                      key={sec}
                      className="absolute bottom-0 flex flex-col items-center"
                      style={{ left: sec * pixelsPerSecond }}
                    >
                      <div className="h-3 border-l border-slate-700/70" />
                      <span className="mt-0.5 text-[9px] text-slate-500">{sec}</span>
                    </div>
                  ))}
              <div
                className="absolute inset-y-0 w-px bg-red-500/80 shadow-[0_0_10px_rgba(248,113,113,0.7)]"
                style={{ left: playheadSec * pixelsPerSecond }}
              />
            </div>
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
              const volume = isBeatLane
                ? typeof beatTrackState?.volume === 'number'
                  ? beatTrackState.volume
                  : 1
                : typeof vTrack?.volume === 'number'
                ? vTrack.volume
                : 1
              const isSelectedVocalLane = !isBeatLane && lane.trackId === selectedVocalTrackId
              return (
                <div key={lane.id} className="flex items-stretch">
                  <div
                    className={`sticky left-0 z-20 flex w-40 flex-shrink-0 flex-col justify-between border-r border-slate-900/80 px-2 py-1.5 text-[10px] text-slate-400 ${
                      isSelectedVocalLane
                        ? 'bg-slate-900/95 shadow-[0_0_0_1px_rgba(248,113,113,0.7)]'
                        : 'bg-slate-950/95'
                    }`}
                    onContextMenu={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      if (isBeatLane) {
                        onSelectBeatTrack?.()
                      } else {
                        onSelectVocalTrack?.(lane.trackId)
                      }
                      setContextMenu({ x: e.clientX, y: e.clientY, lane })
                    }}
                  >
                    <div
                      className="flex items-center justify-between gap-2 cursor-pointer"
                      onClick={() => {
                        if (isBeatLane) onSelectBeatTrack?.()
                        else onSelectVocalTrack?.(lane.trackId)
                      }}
                    >
                      <span className="mr-1 truncate font-semibold text-slate-200">{lane.label}</span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            isBeatLane
                              ? onToggleBeatSolo?.()
                              : onToggleVocalSolo?.(lane.trackId)
                          }}
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
                          onClick={(e) => {
                            e.stopPropagation()
                            isBeatLane
                              ? onToggleBeatMute?.()
                              : onToggleVocalMute?.(lane.trackId)
                          }}
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
                    <div className="mt-1 flex items-center gap-1">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-800/80">
                        <div
                          className="h-full rounded-full bg-emerald-400/80"
                          style={{ width: `${Math.max(0, Math.min(1.5, volume)) * 66.6}%` }}
                        />
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="1.5"
                        step="0.01"
                        value={Number.isFinite(volume) ? volume : 1}
                        onChange={(e) => {
                          const next = parseFloat(e.target.value)
                          if (Number.isNaN(next)) return
                          if (isBeatLane) {
                            onBeatVolumeChange?.(next)
                          } else {
                            onVocalVolumeChange?.(lane.trackId, next)
                          }
                        }}
                        className="h-3 w-16 cursor-pointer accent-emerald-400/90"
                      />
                    </div>
                  </div>
                  <div
                    className="relative bg-slate-950/90 py-2 transition-colors hover:bg-slate-900/90 cursor-pointer md:cursor-col-resize"
                    style={{ width: trackAreaWidth }}
                    onMouseDown={(e) => {
                      if (e.button !== 0) return
                      setIsScrubbing(true)
                      handleScrubAtEvent(e)
                    }}
                    onMouseMove={(e) => {
                      if (!isScrubbing) return
                      handleScrubAtEvent(e)
                    }}
                    onMouseUp={() => {
                      setIsScrubbing(false)
                    }}
                    onMouseLeave={() => {
                      setIsScrubbing(false)
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
                    {secondsPerBeat
                      ? Array.from({ length: Math.ceil(totalSeconds / secondsPerBeat) + 1 }).map((_, idx) => {
                          const t = idx * secondsPerBeat
                          const left = t * pixelsPerSecond
                          const isBar = secondsPerBar && idx % beatsPerBar === 0
                          return (
                            <div
                              key={idx}
                              className={`absolute top-0 h-full border-l ${
                                isBar ? 'border-slate-800/90' : 'border-slate-900/70'
                              }`}
                              style={{ left }}
                            />
                          )
                        })
                      : Array.from({ length: totalSeconds + 1 }).map((_, sec) => (
                          <div
                            key={sec}
                            className="absolute top-0 h-full border-l border-slate-900/80"
                            style={{ left: sec * pixelsPerSecond }}
                          />
                        ))}

                    {/* Playhead across lanes */}
                    <div
                      className="pointer-events-none absolute inset-y-0 w-px bg-red-500/70"
                      style={{ left: playheadSec * pixelsPerSecond }}
                    />

                    {/* Clips in this lane */}
                    {timelineClips
                      .filter((c) => c.trackIndex === laneIndex)
                      .map((clip) => {
                        const left = clip.startSec * pixelsPerSecond
                        const width = Math.max(clip.durationSec * pixelsPerSecond, 80)
                        const existingBounds = clipBoundsRef.current.get(clip.id)
                        const clipStart = clip.startSec || 0
                        const clipEnd = clipStart + (clip.durationSec || 4)
                        if (!existingBounds) {
                          clipBoundsRef.current.set(clip.id, {
                            start: clipStart,
                            end: clipEnd,
                          })
                        } else {
                          const mergedStart = Math.min(existingBounds.start, clipStart)
                          const mergedEnd = Math.max(existingBounds.end, clipEnd)
                          clipBoundsRef.current.set(clip.id, {
                            start: mergedStart,
                            end: mergedEnd,
                          })
                        }
                        const liveWf =
                          clip.type === 'vocal' && !clip.url
                            ? liveWaveformsMap[clip.id] || null
                            : null
                        const wf = liveWf || (clip.url ? waveforms[clip.url] : null)
                        let waveformPoints = null
                        if (wf && wf.length > 1) {
                          const len = wf.length
                          const midY = 50
                          const ampRange = 42
                          const pts = []
                          for (let i = 0; i < len; i += 1) {
                            const x = (i / (len - 1)) * 100
                            const raw = wf[i] || 0
                            const v = Math.min(1, raw * 1.5)
                            const dy = v * ampRange
                            const y = midY - dy
                            pts.push(`${x},${y}`)
                          }
                          // Mirror back for a filled waveform look
                          for (let i = len - 1; i >= 0; i -= 1) {
                            const x = (i / (len - 1)) * 100
                            const raw = wf[i] || 0
                            const v = Math.min(1, raw * 1.5)
                            const dy = v * ampRange
                            const y = midY + dy
                            pts.push(`${x},${y}`)
                          }
                          waveformPoints = pts.join(' ')
                        }
                        return (
                          <button
                            key={clip.id}
                            type="button"
                            data-clip-root="true"
                            onMouseDown={(e) => {
                              if (clip.type === 'vocal') {
                                onSelectVocalTrack?.(clip.id)
                              }
                              handleMouseDownClip(clip, e)
                            }}
                            onContextMenu={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              if (clip.type === 'vocal') {
                                onSelectVocalTrack?.(clip.id)
                              }
                              setContextMenu({
                                x: e.clientX,
                                y: e.clientY,
                                clip,
                              })
                            }}
                            title={
                              clip.type === 'beat'
                                ? 'Drag to offset beat against vocals'
                                : 'Drag to align this take on the grid'
                            }
                            className={`group absolute flex h-10 items-center overflow-hidden rounded-md border bg-gradient-to-r text-left text-[10px] text-slate-100 shadow-md transition-shadow hover:border-red-400/80 hover:shadow-[0_0_16px_rgba(248,113,113,0.5)] ${
                              isSelectedVocalLane && clip.type === 'vocal'
                                ? 'border-red-400/80'
                                : 'border-slate-700/80'
                            }`}
                            style={{ left, width }}
                          >
                            <div
                              className="absolute inset-y-0 left-0 w-1 cursor-ew-resize bg-slate-100/60/70 group-hover:bg-red-300/80"
                              onMouseDown={(e) => {
                                e.stopPropagation()
                                e.preventDefault()
                                const bounds =
                                  clipBoundsRef.current.get(clip.id) || {
                                    start: clipStart,
                                    end: clipEnd,
                                  }
                                const startX = e.clientX
                                const startSec = clipStart
                                const durationSec = clip.durationSec || 4

                                const handleMove = (evt) => {
                                  const deltaX = evt.clientX - startX
                                  const deltaSec = deltaX / pixelsPerSecond

                                  let newStart = startSec + deltaSec
                                  let newEnd = startSec + durationSec

                                  const minLen = MIN_CLIP_SEC
                                  if (snapToGrid) {
                                    newStart = Math.round(newStart / GRID_STEP_SEC) * GRID_STEP_SEC
                                  }

                                  if (newEnd - newStart < minLen) {
                                    newStart = newEnd - minLen
                                  }

                                  const baseStart = typeof bounds.start === 'number' ? bounds.start : startSec
                                  const baseEnd = typeof bounds.end === 'number' ? bounds.end : startSec + durationSec
                                  if (newStart < baseStart) newStart = baseStart
                                  if (newEnd > baseEnd) newEnd = baseEnd
                                  if (newEnd - newStart < minLen) {
                                    newStart = newEnd - minLen
                                  }

                                  const nextStart = Math.max(0, newStart)
                                  const nextDuration = Math.max(minLen, newEnd - newStart)

                                  if (clip.type === 'beat') {
                                    onBeatClipResize?.('start', nextStart, nextDuration)
                                  } else {
                                    onVocalClipResize?.(lane.trackId, 'start', nextStart, nextDuration, clip.id)
                                  }
                                }

                                const handleUp = () => {
                                  window.removeEventListener('mousemove', handleMove)
                                  window.removeEventListener('mouseup', handleUp)
                                }

                                window.addEventListener('mousemove', handleMove)
                                window.addEventListener('mouseup', handleUp)
                              }}
                            />
                            <div className="h-full w-1 bg-gradient-to-b from-red-500 to-amber-400" />
                            <div className="relative flex h-full flex-1 flex-col overflow-hidden px-2 py-1">
                              {clip.url ? (
                                <div className="absolute inset-1 h-[calc(100%-0.5rem)] w-full">
                                  <AudioClip
                                    src={clip.url}
                                    height={32}
                                    clipStartSec={clip.startSec || 0}
                                    clipDurationSec={clip.durationSec || 0}
                                    isSelected={isSelectedVocalLane && clip.type === 'vocal'}
                                    onSeek={onSeek}
                                  />
                                </div>
                              ) : waveformPoints ? (
                                <svg
                                  viewBox="0 0 100 100"
                                  preserveAspectRatio="none"
                                  className="pointer-events-none absolute inset-1 h-[calc(100%-0.5rem)] w-full text-slate-100/80 opacity-80 group-hover:text-red-200/90"
                                >
                                  <polygon points={waveformPoints} className="fill-current" />
                                </svg>
                              ) : (
                                <div className="pointer-events-none absolute inset-1 h-[calc(100%-0.5rem)] w-full rounded-sm bg-gradient-to-r from-slate-600/60 to-slate-400/60" />
                              )}
                              <div className="relative z-10 flex flex-1 flex-col justify-center">
                                <span className="truncate text-[10px] font-semibold">{clip.label}</span>
                                <span className="mt-0.5 text-[9px] text-slate-300">
                                  {clip.type === 'beat' ? 'Beat track' : 'Vocal take'} · start {clip.startSec.toFixed(2)}s
                                </span>
                              </div>
                            </div>
                            {showVolumeAutomation && !isBeatLane && (
                              <div className="mt-0.5 h-4 w-full rounded-sm bg-slate-900/80">
                                <div className="relative flex h-full items-center px-1">
                                  <div className="h-px w-full bg-slate-700/70" />
                                  <div
                                    className="absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 cursor-pointer rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.8)]"
                                    style={{
                                      left: '50%',
                                    }}
                                  />
                                </div>
                              </div>
                            )}
                            <div
                              className="absolute inset-y-0 right-0 w-1 cursor-ew-resize bg-slate-100/60/70 group-hover:bg-red-300/80"
                              onMouseDown={(e) => {
                                e.stopPropagation()
                                e.preventDefault()
                                const bounds =
                                  clipBoundsRef.current.get(clip.id) || {
                                    start: clipStart,
                                    end: clipEnd,
                                  }
                                const startX = e.clientX
                                const startSec = clipStart
                                const durationSec = clip.durationSec || 4

                                const handleMove = (evt) => {
                                  const deltaX = evt.clientX - startX
                                  const deltaSec = deltaX / pixelsPerSecond

                                  let newStart = startSec
                                  let newEnd = startSec + durationSec + deltaSec

                                  const minLen = MIN_CLIP_SEC
                                  if (snapToGrid) {
                                    newEnd = Math.round(newEnd / GRID_STEP_SEC) * GRID_STEP_SEC
                                  }

                                  if (newEnd - newStart < minLen) {
                                    newEnd = newStart + minLen
                                  }

                                  const baseStart = typeof bounds.start === 'number' ? bounds.start : startSec
                                  const baseEnd = typeof bounds.end === 'number' ? bounds.end : startSec + durationSec
                                  if (newStart < baseStart) newStart = baseStart
                                  if (newEnd > baseEnd) newEnd = baseEnd
                                  if (newEnd - newStart < minLen) {
                                    newEnd = newStart + minLen
                                  }

                                  const nextStart = Math.max(0, newStart)
                                  const nextDuration = Math.max(minLen, newEnd - newStart)

                                  if (clip.type === 'beat') {
                                    onBeatClipResize?.('end', nextStart, nextDuration)
                                  } else {
                                    onVocalClipResize?.(lane.trackId, 'end', nextStart, nextDuration, clip.id)
                                  }
                                }

                                const handleUp = () => {
                                  window.removeEventListener('mousemove', handleMove)
                                  window.removeEventListener('mouseup', handleUp)
                                }

                                window.addEventListener('mousemove', handleMove)
                                window.addEventListener('mouseup', handleUp)
                              }}
                            />
                          </button>
                        )
                      })}
                </div>
                </div>
              )
            })}
          </div>
          {contextMenu && (
            <div
              className="fixed inset-0 z-40"
              onClick={closeContextMenu}
              onContextMenu={(e) => {
                e.preventDefault()
                closeContextMenu()
              }}
            >
              <div
                className="absolute z-50 w-44 rounded-md border border-slate-800/80 bg-slate-950/95 p-1 text-[11px] text-slate-200 shadow-xl"
                style={{ left: contextMenu.x, top: contextMenu.y }}
                onClick={(e) => e.stopPropagation()}
              >
                {contextMenu.clip && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleContextMenuAction('play-clip')}
                      className="flex w-full items-center rounded px-2 py-1 text-left hover:bg-slate-800/80"
                    >
                      Play from clip
                    </button>
                    <button
                      type="button"
                      onClick={() => handleContextMenuAction('loop-clip')}
                      className="flex w-full items-center rounded px-2 py-1 text-left hover:bg-slate-800/80"
                    >
                      Set loop to clip
                    </button>
                    {contextMenu.clip.type === 'vocal' && (
                      <button
                        type="button"
                        onClick={() => handleContextMenuAction('delete-clip')}
                        className="mt-1 flex w-full items-center rounded px-2 py-1 text-left text-red-300 hover:bg-red-900/40"
                      >
                        Delete clip
                      </button>
                    )}
                  </>
                )}
                {contextMenu.lane && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleContextMenuAction('mute-track')}
                      className="flex w-full items-center rounded px-2 py-1 text-left hover:bg-slate-800/80"
                    >
                      {contextMenu.lane.kind === 'beat' ? 'Mute beat track' : 'Mute track'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleContextMenuAction('solo-track')}
                      className="flex w-full items-center rounded px-2 py-1 text-left hover:bg-slate-800/80"
                    >
                      {contextMenu.lane.kind === 'beat' ? 'Solo beat track' : 'Solo track'}
                    </button>
                    {contextMenu.lane.kind === 'vocal' && (
                      <button
                        type="button"
                        onClick={() => handleContextMenuAction('delete-track')}
                        className="mt-1 flex w-full items-center rounded px-2 py-1 text-left text-red-300 hover:bg-red-900/40"
                      >
                        Delete track
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

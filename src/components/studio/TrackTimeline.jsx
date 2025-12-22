import { useEffect, useMemo, useRef, useState } from 'react'

const PIXELS_PER_SECOND = 40
const GRID_STEP_SEC = 0.25

export default function TrackTimeline({
  beatClip,
  beatLabel,
  vocalTracks,
  snapToGrid,
  onToggleSnap,
  onBeatClipChange,
  onVocalClipChange,
  onAddVocalTrack,
}) {
  const containerRef = useRef(null)
  const dragRef = useRef(null)

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
    const handleMove = (e) => {
      if (!dragRef.current) return
      const { clip, startX } = dragRef.current
      const bounds = containerRef.current?.getBoundingClientRect()
      if (!bounds) return
      const deltaX = e.clientX - startX
      const deltaSec = deltaX / PIXELS_PER_SECOND
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
    if (beatClip) base.push({ id: 'beat-lane', label: beatLabel || 'Beat Track' })
    vocalTracks.forEach((t, idx) => {
      base.push({ id: t.id, label: t.name || `Vocal ${idx + 1}` })
    })
    return base
  }, [beatClip, beatLabel, vocalTracks])

  const minWidth = totalSeconds * PIXELS_PER_SECOND + 160

  return (
    <div className="rounded-2xl border border-slate-800/80 bg-slate-950/90 p-3 text-[11px] text-slate-300">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">Arrangement</p>
          <p className="mt-0.5 text-xs text-slate-300">Align your beat and vocal takes on a simple timeline.</p>
        </div>
        <div className="flex items-center gap-2">
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
        className="mt-1 overflow-x-auto overflow-y-hidden rounded-xl border border-slate-800/80 bg-gradient-to-b from-slate-950/95 to-slate-950/98"
      >
        <div className="relative" style={{ minWidth }}>
          {/* Time ruler */}
          <div className="relative h-6 border-b border-slate-800/80 bg-slate-950/95">
            {Array.from({ length: totalSeconds + 1 }).map((_, sec) => (
              <div
                key={sec}
                className="absolute bottom-0 flex flex-col items-center"
                style={{ left: sec * PIXELS_PER_SECOND + 140 }}
              >
                <div className="h-3 border-l border-slate-700/70" />
                <span className="mt-0.5 text-[9px] text-slate-500">{sec}</span>
              </div>
            ))}
          </div>

          {/* Tracks */}
          <div className="divide-y divide-slate-900/80">
            {lanes.map((lane, laneIndex) => (
              <div key={lane.id} className="flex items-stretch">
                <div className="flex w-36 flex-shrink-0 items-center justify-between border-r border-slate-900/80 bg-slate-950/95 px-2 py-2 text-[10px] text-slate-400">
                  <span className="truncate font-semibold text-slate-200">{lane.label}</span>
                </div>
                <div className="relative flex-1 bg-slate-950/90 py-2">
                  {/* Grid lines */}
                  {Array.from({ length: totalSeconds + 1 }).map((_, sec) => (
                    <div
                      key={sec}
                      className="absolute top-0 h-full border-l border-slate-900/80"
                      style={{ left: sec * PIXELS_PER_SECOND }}
                    />
                  ))}

                  {/* Clips in this lane */}
                  {timelineClips
                    .filter((c) => c.trackIndex === laneIndex)
                    .map((clip) => {
                      const left = clip.startSec * PIXELS_PER_SECOND
                      const width = Math.max(clip.durationSec * PIXELS_PER_SECOND, 80)
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
                          <div className="flex flex-1 flex-col px-2">
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
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

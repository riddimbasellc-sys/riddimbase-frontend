import { useEffect, useRef, useState } from 'react'
import BackButton from '../components/BackButton'
import BeatSelector from '../components/studio/BeatSelector'
import RecorderControls from '../components/studio/RecorderControls'
import WaveformCanvas from '../components/studio/WaveformCanvas'
import StudioSidebar from '../components/studio/StudioSidebar'
import TrackTimeline from '../components/studio/TrackTimeline'
import VocalFxModal from '../components/studio/VocalFxModal'
import useSupabaseUser from '../hooks/useSupabaseUser'
import '../styles/recordingLab.css'

export function RecordingLab() {
  const { user } = useSupabaseUser()

  const [selectedBeat, setSelectedBeat] = useState(null)
  const [beatVolume, setBeatVolume] = useState(0.8)
  const [isBeatPlaying, setIsBeatPlaying] = useState(false)

  const [micStatus, setMicStatus] = useState('idle') // idle | pending | granted | denied
  const [recordState, setRecordState] = useState('idle') // idle | recording | recorded
  const [timerSeconds, setTimerSeconds] = useState(0)
  const [recordingUrl, setRecordingUrl] = useState(null)

  const [monitorEnabled, setMonitorEnabled] = useState(false)
  const [inputGain, setInputGain] = useState(1)

  // Multitrack timeline state
  const [snapToGrid, setSnapToGrid] = useState(true)
  const [beatClip, setBeatClip] = useState(null) // { startSec, durationSec }
  const createDefaultVocalFx = () => ({
    eq: {
      enabled: false,
      preset: 'flat',
      lowGainDb: 0,
      midGainDb: 0,
      highGainDb: 0,
    },
    compressor: {
      enabled: false,
      preset: 'vocal-gentle',
      threshold: -18,
      ratio: 3,
      attack: 0.01,
      release: 0.25,
    },
    reverb: {
      enabled: false,
      preset: 'room',
      mix: 0.2,
      decay: 1.8,
    },
    delay: {
      enabled: false,
      preset: 'slap',
      time: 0.28,
      feedback: 0.3,
      mix: 0.18,
    },
    autotune: {
      enabled: false,
      preset: 'natural',
      key: 'C',
      scale: 'major',
      retuneSpeed: 0.5,
      humanize: 0.3,
    },
  })

  const [vocalTracks, setVocalTracks] = useState([]) // { id, name, muted, solo, clip, fx }
  const [beatTrackState, setBeatTrackState] = useState({ muted: false, solo: false })
  const [playheadSec, setPlayheadSec] = useState(0)
  const [isTimelinePlaying, setIsTimelinePlaying] = useState(false)
  const [selectedVocalTrackId, setSelectedVocalTrackId] = useState(null)

  const audioRef = useRef(null)
  const audioContextRef = useRef(null)
  const mediaStreamRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const analyserRef = useRef(null)
  const monitorGainRef = useRef(null)
  const chunksRef = useRef([])
  const timerRef = useRef(null)
  const recordStartRef = useRef(null)
  const timelineSourcesRef = useRef([])
  const bufferCacheRef = useRef(new Map())
  const timelineTimeoutRef = useRef(null)
  const waveformCacheRef = useRef(new Map())

  const [hasAudioSupport] = useState(() =>
    typeof window !== 'undefined' &&
    'MediaRecorder' in window &&
    navigator.mediaDevices &&
    typeof navigator.mediaDevices.getUserMedia === 'function',
  )

  const ensureBeatAudio = () => {
    if (!selectedBeat || !selectedBeat.audioUrl) return
    if (audioRef.current) return
    const el = new Audio(selectedBeat.audioUrl)
    el.loop = true
    el.volume = beatVolume
    el.addEventListener('ended', () => {
      setIsBeatPlaying(false)
    })
    el.addEventListener('loadedmetadata', () => {
      const duration = Number.isFinite(el.duration) && el.duration > 0 ? el.duration : 60
      setBeatClip((prev) => ({ startSec: prev?.startSec || 0, durationSec: duration }))
    })
    audioRef.current = el
  }

  const cleanupBeatAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      try { audioRef.current.currentTime = 0 } catch {}
      audioRef.current.src = ''
      audioRef.current = null
    }
    setIsBeatPlaying(false)
  }

  useEffect(() => {
    // When beat changes, rebuild audio element
    cleanupBeatAudio()
    if (selectedBeat && selectedBeat.audioUrl) {
      // Create a safe default clip immediately so arrangement playback works
      // even before the audio element metadata has loaded.
      setBeatClip({ startSec: 0, durationSec: 60 })
      ensureBeatAudio()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBeat?.id])

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = beatVolume
    }
  }, [beatVolume])

  const toggleBeatPlay = () => {
    if (!selectedBeat) return
    ensureBeatAudio()
    if (!audioRef.current) return
    if (isBeatPlaying) {
      audioRef.current.pause()
      setIsBeatPlaying(false)
    } else {
      audioRef.current.play().then(() => setIsBeatPlaying(true)).catch(() => {})
    }
  }

  const setupAudioGraph = async () => {
    if (!hasAudioSupport) return null
    if (mediaStreamRef.current && audioContextRef.current && analyserRef.current) {
      return { stream: mediaStreamRef.current, analyser: analyserRef.current }
    }

    try {
      setMicStatus('pending')
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const AudioContextClass = window.AudioContext || window.webkitAudioContext
      const audioCtx = audioContextRef.current || new AudioContextClass()
      const source = audioCtx.createMediaStreamSource(stream)
      const analyser = audioCtx.createAnalyser()
      analyser.fftSize = 2048
      const bufferLength = analyser.frequencyBinCount
      const dataArray = new Uint8Array(bufferLength)
      analyser.getByteTimeDomainData(dataArray)

      const monitorGain = audioCtx.createGain()
      monitorGain.gain.value = monitorEnabled ? inputGain : 0

      source.connect(analyser)
      source.connect(monitorGain)
      monitorGain.connect(audioCtx.destination)

      audioContextRef.current = audioCtx
      mediaStreamRef.current = stream
      analyserRef.current = analyser
      monitorGainRef.current = monitorGain

      setMicStatus('granted')
      return { stream, analyser }
    } catch (e) {
      console.warn('[RecordingLab] mic error', e)
      setMicStatus('denied')
      return null
    }
  }

  const ensureRecorder = async () => {
    if (!hasAudioSupport) return null
    if (!mediaRecorderRef.current) {
      const graph = await setupAudioGraph()
      if (!graph) return null
      try {
        const recorder = new MediaRecorder(graph.stream)
        recorder.ondataavailable = (evt) => {
          if (evt.data && evt.data.size > 0) {
            chunksRef.current.push(evt.data)
          }
        }
        recorder.onstop = () => {
          const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
          chunksRef.current = []
          if (recordingUrl) URL.revokeObjectURL(recordingUrl)
          const url = URL.createObjectURL(blob)
          setRecordingUrl(url)
          const startedAt = recordStartRef.current
          const elapsed = startedAt ? (Date.now() - startedAt) / 1000 : timerSeconds
          const durationSec = Math.max(elapsed || 0, 0.5)

          // Add a new vocal track with this take clipped at t=0 on the timeline
          setVocalTracks((prev) => {
            const index = prev.length + 1
            const id = `take-${index}`
            const name = `Take ${index}`
            return [
              ...prev,
              {
                id,
                name,
                muted: false,
                solo: false,
                clip: { startSec: 0, durationSec, url },
                fx: createDefaultVocalFx(),
              },
            ]
          })
          setSelectedVocalTrackId((prev) => prev || `take-${(vocalTracks?.length || 0) + 1}`)

          setRecordState('recorded')
          // TODO: send blob to backend storage for saving sessions
        }
        mediaRecorderRef.current = recorder
      } catch (e) {
        console.warn('[RecordingLab] MediaRecorder init error', e)
        return null
      }
    }
    return mediaRecorderRef.current
  }

  const startTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    setTimerSeconds(0)
    timerRef.current = setInterval(() => {
      setTimerSeconds((t) => t + 1)
    }, 1000)
  }

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }

  const handleRecord = async () => {
    if (!hasAudioSupport) return
    if (recordState === 'recording') return
    const recorder = await ensureRecorder()
    if (!recorder) return
    try {
      recorder.start()
      setRecordState('recording')
      recordStartRef.current = Date.now()
      startTimer()
      if (selectedBeat && !isBeatPlaying) {
        toggleBeatPlay()
      }
    } catch (e) {
      console.warn('[RecordingLab] start record error', e)
    }
  }

  const handleStop = () => {
    if (!hasAudioSupport) return
    const recorder = mediaRecorderRef.current
    if (recorder && recordState === 'recording') {
      try {
        recorder.stop()
        stopTimer()
      } catch (e) {
        console.warn('[RecordingLab] stop record error', e)
      }
    }
    // Also stop the beat when user stops recording
    if (audioRef.current) {
      try {
        audioRef.current.pause()
        audioRef.current.currentTime = 0
      } catch {}
    }
    setIsBeatPlaying(false)
  }

  const handleReRecord = () => {
    if (recordingUrl) {
      URL.revokeObjectURL(recordingUrl)
      setRecordingUrl(null)
    }
    setRecordState('idle')
    setTimerSeconds(0)
  }

  const requestMic = async () => {
    await setupAudioGraph()
  }

  const toggleMonitor = () => {
    const next = !monitorEnabled
    setMonitorEnabled(next)
    if (monitorGainRef.current) {
      monitorGainRef.current.gain.value = next ? inputGain : 0
    }
  }

  const handleInputGainChange = (value) => {
    setInputGain(value)
    if (monitorGainRef.current && monitorEnabled) {
      monitorGainRef.current.gain.value = value
    }
  }

  const handleBeatClipChange = (startSec) => {
    setBeatClip((prev) => (prev ? { ...prev, startSec } : { startSec, durationSec: 60 }))
  }

  const handleVocalClipChange = (trackId, startSec) => {
    setVocalTracks((prev) =>
      prev.map((t) => (t.id === trackId && t.clip ? { ...t, clip: { ...t.clip, startSec } } : t)),
    )
  }

  const handleAddVocalTrack = () => {
    setVocalTracks((prev) => {
      const index = prev.length + 1
      const id = `vocal-${index}`
      return [
        ...prev,
        { id, name: `Vocal ${index}`, muted: false, solo: false, clip: null, fx: createDefaultVocalFx() },
      ]
    })
    setSelectedVocalTrackId((prev) => prev)
  }

  const handleToggleBeatMute = () => {
    setBeatTrackState((s) => ({ ...s, muted: !s.muted }))
  }

  const handleToggleBeatSolo = () => {
    setBeatTrackState((s) => ({ ...s, solo: !s.solo }))
  }

  const handleToggleVocalMute = (trackId) => {
    setVocalTracks((prev) =>
      prev.map((t) => (t.id === trackId ? { ...t, muted: !t.muted } : t)),
    )
  }

  const handleToggleVocalSolo = (trackId) => {
    setVocalTracks((prev) =>
      prev.map((t) => (t.id === trackId ? { ...t, solo: !t.solo } : t)),
    )
  }

  const [loopRegion, setLoopRegion] = useState({ enabled: false, startSec: 0, endSec: 8 })

  const handleToggleLoopRegion = () => {
    setLoopRegion((prev) => ({ ...prev, enabled: !prev.enabled }))
  }

  const handleLoopSetStart = (sec) => {
    const safe = Number.isFinite(sec) && sec >= 0 ? sec : 0
    setLoopRegion((prev) => {
      const minLen = 0.5
      let end = prev.endSec
      if (!Number.isFinite(end) || end <= safe + minLen) {
        end = safe + Math.max(minLen, 2)
      }
      return { ...prev, startSec: safe, endSec: end }
    })
  }

  const handleLoopSetEnd = (sec) => {
    const safe = Number.isFinite(sec) && sec >= 0 ? sec : 0
    setLoopRegion((prev) => {
      const minLen = 0.5
      const start = Number.isFinite(prev.startSec) && prev.startSec >= 0 ? prev.startSec : 0
      const end = Math.max(safe, start + minLen)
      return { ...prev, startSec: start, endSec: end }
    })
  }

  const ensurePlaybackContext = () => {
    if (typeof window === 'undefined') return null
    const AudioContextClass = window.AudioContext || window.webkitAudioContext
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContextClass()
    }
    return audioContextRef.current
  }

  const loadBuffer = async (url) => {
    if (!url) return null
    const ctx = ensurePlaybackContext()
    if (!ctx) return null
    const cache = bufferCacheRef.current
    if (cache.has(url)) return cache.get(url)
    try {
      const res = await fetch(url)
      const arr = await res.arrayBuffer()
      const buf = await ctx.decodeAudioData(arr)
      cache.set(url, buf)
      return buf
    } catch {
      return null
    }
  }

  const applyVocalFxChain = (ctx, sourceNode, fx) => {
    const safeFx = fx || {}
    let current = sourceNode

    const eqFx = safeFx.eq || {}
    if (eqFx.enabled) {
      const low = ctx.createBiquadFilter()
      low.type = 'lowshelf'
      low.frequency.value = 120
      low.gain.value = eqFx.lowGainDb ?? 0

      const mid = ctx.createBiquadFilter()
      mid.type = 'peaking'
      mid.frequency.value = 1500
      mid.Q.value = 1
      mid.gain.value = eqFx.midGainDb ?? 0

      const high = ctx.createBiquadFilter()
      high.type = 'highshelf'
      high.frequency.value = 6000
      high.gain.value = eqFx.highGainDb ?? 0

      current.connect(low)
      low.connect(mid)
      mid.connect(high)
      current = high
    }

    const compFx = safeFx.compressor || {}
    if (compFx.enabled) {
      const comp = ctx.createDynamicsCompressor()
      if (typeof compFx.threshold === 'number') comp.threshold.value = compFx.threshold
      if (typeof compFx.ratio === 'number') comp.ratio.value = compFx.ratio
      if (typeof compFx.attack === 'number') comp.attack.value = compFx.attack
      if (typeof compFx.release === 'number') comp.release.value = compFx.release
      current.connect(comp)
      current = comp
    }

    const dryGain = ctx.createGain()
    dryGain.gain.value = 1
    current.connect(dryGain)
    dryGain.connect(ctx.destination)

    const delayFx = safeFx.delay || {}
    if (delayFx.enabled) {
      const delay = ctx.createDelay(1)
      delay.delayTime.value = Math.max(0.01, Math.min(0.9, delayFx.time ?? 0.28))

      const feedback = ctx.createGain()
      feedback.gain.value = Math.max(0, Math.min(0.9, delayFx.feedback ?? 0.3))

      const wet = ctx.createGain()
      wet.gain.value = Math.max(0, Math.min(1, delayFx.mix ?? 0.18))

      current.connect(delay)
      delay.connect(feedback)
      feedback.connect(delay)
      delay.connect(wet)
      wet.connect(ctx.destination)
    }

    const reverbFx = safeFx.reverb || {}
    if (reverbFx.enabled) {
      const convolver = ctx.createConvolver()
      const rate = ctx.sampleRate
      const decay = Math.max(0.3, Math.min(4, reverbFx.decay ?? 1.8))
      const length = Math.floor(rate * decay)
      const ir = ctx.createBuffer(2, length, rate)
      for (let ch = 0; ch < 2; ch += 1) {
        const data = ir.getChannelData(ch)
        for (let i = 0; i < length; i += 1) {
          const t = i / length
          data[i] = (Math.random() * 2 - 1) * (1 - t)
        }
      }
      convolver.buffer = ir

      const wet = ctx.createGain()
      wet.gain.value = Math.max(0, Math.min(1, reverbFx.mix ?? 0.2))

      current.connect(convolver)
      convolver.connect(wet)
      wet.connect(ctx.destination)
    }

    // Auto-Tune is UI-only for now; no DSP applied here yet.
  }

  const getWaveformForUrl = async (url) => {
    if (!url) return null
    const cache = waveformCacheRef.current
    if (cache.has(url)) return cache.get(url)
    const buffer = await loadBuffer(url)
    if (!buffer) return null

    const samples = 96
    const channelData = buffer.getChannelData(0)
    const blockSize = Math.max(1, Math.floor(channelData.length / samples))
    const data = new Float32Array(samples)
    for (let i = 0; i < samples; i += 1) {
      const start = i * blockSize
      const end = Math.min(start + blockSize, channelData.length)
      let peak = 0
      for (let j = start; j < end; j += 1) {
        const v = channelData[j]
        const m = v < 0 ? -v : v
        if (m > peak) peak = m
      }
      data[i] = peak
    }
    cache.set(url, data)
    return data
  }

  const stopTimelinePlayback = () => {
    if (timelineTimeoutRef.current) {
      clearTimeout(timelineTimeoutRef.current)
      timelineTimeoutRef.current = null
    }
    if (timelineSourcesRef.current.length) {
      timelineSourcesRef.current.forEach((src) => {
        try { src.stop() } catch {}
      })
      timelineSourcesRef.current = []
    }
    setIsTimelinePlaying(false)
  }

  const handleSeek = (sec) => {
    setPlayheadSec(sec)
  }

  const [fxEditor, setFxEditor] = useState(null) // { effectKey, trackId }

  const handleSelectVocalTrack = (trackId) => {
    setSelectedVocalTrackId(trackId)
  }

  const handleOpenEffect = (effectKey) => {
    if (!selectedVocalTrackId) return
    setFxEditor({ effectKey, trackId: selectedVocalTrackId })
  }

  const handleToggleArrangementPlay = () => {
    if (isTimelinePlaying) {
      stopTimelinePlayback()
    } else {
      handlePlayFromCursor()
    }
  }

  const handlePlayFromCursor = async () => {
    const hasAnyVocalClip = vocalTracks.some((t) => !!t.clip)
    const hasBeatAudio = !!selectedBeat?.audioUrl
    if (!hasBeatAudio && !hasAnyVocalClip) return
    const ctx = ensurePlaybackContext()
    if (!ctx) return

    stopTimelinePlayback()
    try {
      await ctx.resume()
    } catch {}

    const anySolo = beatTrackState.solo || vocalTracks.some((t) => t.solo)

    const loopActive =
      loopRegion &&
      loopRegion.enabled &&
      typeof loopRegion.startSec === 'number' &&
      typeof loopRegion.endSec === 'number' &&
      loopRegion.endSec > loopRegion.startSec + 0.05

    const startAt = loopActive
      ? Math.max(0, loopRegion.startSec)
      : Math.max(0, playheadSec)

    const regionEndLimit = loopActive ? loopRegion.endSec : Infinity

    const tasks = []
    if (hasBeatAudio && !beatTrackState.muted && (!anySolo || beatTrackState.solo)) {
      tasks.push({
        type: 'beat',
        url: selectedBeat.audioUrl,
        clip: beatClip || { startSec: 0 },
      })
    }
    vocalTracks.forEach((t) => {
      if (!t.clip || t.muted) return
      if (anySolo && !t.solo) return
      tasks.push({ type: 'vocal', url: t.clip.url, clip: t.clip, fx: t.fx })
    })

    if (!tasks.length) return

    const now = ctx.currentTime + 0.05
    const sources = []
    let maxEnd = 0

    for (const task of tasks) {
      const buffer = await loadBuffer(task.url)
      if (!buffer) continue
      const { startSec = 0, durationSec = buffer.duration } = task.clip || {}
      const clipStart = startSec
      const clipEnd = startSec + durationSec

      const effectiveStart = Math.max(clipStart, startAt)
      const effectiveEnd = Math.min(clipEnd, regionEndLimit)
      if (effectiveEnd <= effectiveStart) continue

      const relStart = effectiveStart - startAt
      const offset = effectiveStart - clipStart
      const playDuration = Math.max(0.1, effectiveEnd - effectiveStart)
      const when = now + Math.max(relStart, 0)

      maxEnd = Math.max(maxEnd, effectiveEnd)

      const source = ctx.createBufferSource()
      source.buffer = buffer
      if (task.type === 'vocal') {
        applyVocalFxChain(ctx, source, task.fx)
      } else {
        source.connect(ctx.destination)
      }
      try {
        source.start(when, offset, playDuration)
        sources.push(source)
      } catch {}
    }

    if (!sources.length) return

    timelineSourcesRef.current = sources
    setIsTimelinePlaying(true)

    if (maxEnd > startAt) {
      const remaining = maxEnd - startAt
      timelineTimeoutRef.current = setTimeout(() => {
        if (
          loopRegion &&
          loopRegion.enabled &&
          typeof loopRegion.startSec === 'number' &&
          typeof loopRegion.endSec === 'number' &&
          loopRegion.endSec > loopRegion.startSec + 0.05
        ) {
          setPlayheadSec(loopRegion.startSec)
          handlePlayFromCursor()
        } else {
          stopTimelinePlayback()
        }
      }, remaining * 1000 + 300)
    }
  }

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === ' ' || e.code === 'Space') {
        const target = e.target
        const tag = target && target.tagName
        const isTypingField =
          tag === 'INPUT' ||
          tag === 'TEXTAREA' ||
          target.isContentEditable
        if (isTypingField) return
        e.preventDefault()
        if (isTimelinePlaying) {
          stopTimelinePlayback()
        } else {
          handlePlayFromCursor()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      stopTimer()
      if (mediaRecorderRef.current && recordState === 'recording') {
        try { mediaRecorderRef.current.stop() } catch {}
      }
      if (recordingUrl) URL.revokeObjectURL(recordingUrl)
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.src = ''
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop())
      }
      if (audioContextRef.current) {
        audioContextRef.current.close()
      }
      stopTimelinePlayback()
    }
  }, [isTimelinePlaying, recordState, recordingUrl])

  const canRecord = micStatus === 'granted' && hasAudioSupport
  const hasRecording = !!recordingUrl

  return (
    <section className="studio-shell min-h-screen lg:h-screen lg:overflow-hidden">
      <div className="mx-auto flex h-full w-full max-w-7xl flex-col px-4 py-6">
        <div className="flex flex-shrink-0 items-center gap-3">
          <BackButton />
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-red-400">Recording Lab</p>
            <h1 className="font-display text-2xl font-semibold text-slate-50">In-browser vocal booth</h1>
          </div>
          <span className="ml-auto rounded-full border border-red-500/70 bg-red-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-red-300">Beta</span>
        </div>

        {!hasAudioSupport && (
          <div className="mt-4 rounded-2xl border border-amber-500/60 bg-amber-500/10 p-3 text-[11px] text-amber-100">
            Your browser does not support in-browser recording. Please use the latest version of Chrome or Edge on desktop.
          </div>
        )}

        <div className="mt-6 grid flex-1 min-h-0 gap-4 lg:grid-cols-[320px_minmax(0,1fr)_320px]">
          <div className="min-h-0">
            <BeatSelector
              selectedBeat={selectedBeat}
              onSelectBeat={setSelectedBeat}
              isPlaying={isBeatPlaying}
              onTogglePlay={toggleBeatPlay}
              volume={beatVolume}
              onVolumeChange={setBeatVolume}
            />
          </div>

          <div className="flex min-h-0 flex-col gap-4">
            <div className="flex-1 min-h-0 rounded-2xl border border-slate-800/80 bg-slate-950/80 p-4 text-[12px] text-slate-200">
              <TrackTimeline
                beatClip={beatClip}
                beatLabel={selectedBeat?.title || 'Beat Track'}
                beatTrackState={beatTrackState}
                vocalTracks={vocalTracks}
                selectedVocalTrackId={selectedVocalTrackId}
                snapToGrid={snapToGrid}
                playheadSec={playheadSec}
                isPlaying={isTimelinePlaying}
                beatAudioUrl={selectedBeat?.audioUrl}
                loopRegion={loopRegion}
                onToggleSnap={() => setSnapToGrid((v) => !v)}
                onBeatClipChange={handleBeatClipChange}
                onVocalClipChange={handleVocalClipChange}
                onAddVocalTrack={handleAddVocalTrack}
                onSeek={handleSeek}
                onPlayFromCursor={handlePlayFromCursor}
                onStopPlayback={stopTimelinePlayback}
                onToggleBeatMute={handleToggleBeatMute}
                onToggleBeatSolo={handleToggleBeatSolo}
                onToggleVocalMute={handleToggleVocalMute}
                onToggleVocalSolo={handleToggleVocalSolo}
                onToggleLoopRegion={handleToggleLoopRegion}
                onLoopSetStart={handleLoopSetStart}
                onLoopSetEnd={handleLoopSetEnd}
                onSelectVocalTrack={handleSelectVocalTrack}
                requestWaveform={getWaveformForUrl}
              />
            </div>
            <div className="flex-shrink-0">
              <RecorderControls
                recordState={recordState}
                onRecord={handleRecord}
                onStop={handleStop}
                onReRecord={handleReRecord}
                canRecord={canRecord}
                hasRecording={hasRecording}
                isBeatPlaying={isBeatPlaying}
                onToggleBeat={toggleBeatPlay}
                timerSeconds={timerSeconds}
                isArrangementPlaying={isTimelinePlaying}
                onToggleArrangementPlay={handleToggleArrangementPlay}
                isLoopEnabled={!!loopRegion?.enabled}
                onToggleLoop={handleToggleLoopRegion}
              />
            </div>
            {hasRecording && (
              <div className="flex-shrink-0 rounded-2xl border border-slate-800/80 bg-slate-950/80 p-4 text-[12px] text-slate-200">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Take 1</p>
                  <span className="rounded-full border border-slate-700/80 px-2 py-0.5 text-[10px] text-slate-400">Local only · Draft</span>
                </div>
                <p className="mt-1 text-sm font-semibold text-slate-50">Preview recording</p>
                <audio
                  controls
                  src={recordingUrl}
                  className="mt-3 w-full rounded-xl border border-slate-800/80 bg-slate-900/80 p-2"
                />
                <p className="mt-2 text-[10px] text-slate-500">TODO: Save takes to your RiddimBase account for later mixing and sharing.</p>
              </div>
            )}
          </div>

          <div className="min-h-0">
            <StudioSidebar
              micStatus={micStatus}
              onRequestMic={requestMic}
              monitorEnabled={monitorEnabled}
              onToggleMonitor={toggleMonitor}
              inputGain={inputGain}
              onInputGainChange={handleInputGainChange}
              selectedVocalTrackName={
                selectedVocalTrackId
                  ? vocalTracks.find((t) => t.id === selectedVocalTrackId)?.name || selectedVocalTrackId
                  : null
              }
              selectedTrackFx={
                selectedVocalTrackId
                  ? vocalTracks.find((t) => t.id === selectedVocalTrackId)?.fx || null
                  : null
              }
              onOpenEffect={handleOpenEffect}
            />
          </div>
        </div>

        {fxEditor && selectedVocalTrackId && (
          <VocalFxModal
            effectKey={fxEditor.effectKey}
            trackName={
              vocalTracks.find((t) => t.id === fxEditor.trackId)?.name || fxEditor.trackId
            }
            initialSettings={
              vocalTracks.find((t) => t.id === fxEditor.trackId)?.fx?.[fxEditor.effectKey] || {}
            }
            onDiscard={() => setFxEditor(null)}
            onApply={(settings) => {
              setVocalTracks((prev) =>
                prev.map((t) =>
                  t.id === fxEditor.trackId
                    ? { ...t, fx: { ...t.fx, [fxEditor.effectKey]: { ...t.fx?.[fxEditor.effectKey], ...settings } } }
                    : t,
                ),
              )
              setFxEditor(null)
            }}
          />
        )}
      </div>
    </section>
  )
}

export default RecordingLab

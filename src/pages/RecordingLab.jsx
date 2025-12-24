import { useEffect, useRef, useState } from 'react'
import BackButton from '../components/BackButton'
import BeatSelector from '../components/studio/BeatSelector'
import RecorderControls from '../components/studio/RecorderControls'
import WaveformCanvas from '../components/studio/WaveformCanvas'
import StudioSidebar from '../components/studio/StudioSidebar'
import TrackTimeline from '../components/studio/TrackTimeline'
import VocalFxModal from '../components/studio/VocalFxModal'
import useSupabaseUser from '../hooks/useSupabaseUser'
import { supabase } from '../lib/supabaseClient'
import '../styles/recordingLab.css'

export function RecordingLab() {
  const { user } = useSupabaseUser()

  const [isArrangementFullscreen, setIsArrangementFullscreen] = useState(false)

  const [savedSessions, setSavedSessions] = useState([]) // { id, name, updated_at, created_at }
  const [selectedSessionId, setSelectedSessionId] = useState('')
  const [sessionBusy, setSessionBusy] = useState(false)

  const [creditBalance, setCreditBalance] = useState(null)
  const [creditLoading, setCreditLoading] = useState(false)
  const [insufficientCredits, setInsufficientCredits] = useState(false)

  const [selectedBeat, setSelectedBeat] = useState(null)
  const [beatVolume, setBeatVolume] = useState(0.8)
  const [isBeatPlaying, setIsBeatPlaying] = useState(false)

  const [micStatus, setMicStatus] = useState('idle') // idle | pending | granted | denied
  const [recordState, setRecordState] = useState('idle') // idle | recording | recorded
  const [timerSeconds, setTimerSeconds] = useState(0)
  const [recordingUrl, setRecordingUrl] = useState(null)
  const [recordingPublicUrl, setRecordingPublicUrl] = useState(null)
  const [takeUploadState, setTakeUploadState] = useState('idle') // idle | uploading | saved | error

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

  const [vocalTracks, setVocalTracks] = useState([]) // { id, name, muted, solo, volume, clip, fx }
  const [beatTrackState, setBeatTrackState] = useState({ muted: false, solo: false, volume: 1 })
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
  const playheadAnimFrameRef = useRef(null)
  const playbackStartWallTimeRef = useRef(null)
  const playbackStartSecRef = useRef(0)
  const playbackEndSecRef = useRef(null)
  const isTimelinePlayingRef = useRef(false)

  const [hasAudioSupport] = useState(() =>
    typeof window !== 'undefined' &&
    'MediaRecorder' in window &&
    navigator.mediaDevices &&
    typeof navigator.mediaDevices.getUserMedia === 'function',
  )

  const stopPlayheadAnimation = () => {
    if (playheadAnimFrameRef.current) {
      try {
        cancelAnimationFrame(playheadAnimFrameRef.current)
      } catch {}
      playheadAnimFrameRef.current = null
    }
    playbackStartWallTimeRef.current = null
    playbackEndSecRef.current = null
  }

  const startPlayheadAnimation = (startSec, endSec) => {
    stopPlayheadAnimation()
    playbackStartWallTimeRef.current =
      typeof performance !== 'undefined' ? performance.now() : Date.now()
    playbackStartSecRef.current = typeof startSec === 'number' ? startSec : 0
    playbackEndSecRef.current =
      typeof endSec === 'number' && Number.isFinite(endSec) ? endSec : null

    const loop = () => {
      if (!isTimelinePlayingRef.current) return
      const base = playbackStartWallTimeRef.current
      if (base == null) return
      const now = typeof performance !== 'undefined' ? performance.now() : Date.now()
      const elapsedSec = Math.max(0, (now - base) / 1000)
      let next = playbackStartSecRef.current + elapsedSec
      if (playbackEndSecRef.current != null) {
        if (next >= playbackEndSecRef.current) {
          setPlayheadSec(playbackEndSecRef.current)
          return
        }
      }
      setPlayheadSec(next)
      playheadAnimFrameRef.current = requestAnimationFrame(loop)
    }

    playheadAnimFrameRef.current = requestAnimationFrame(loop)
  }

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
      setBeatClip((prev) => ({ beatId: selectedBeat?.id, startSec: prev?.startSec || 0, durationSec: duration }))
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
      setBeatClip((prev) => {
        if (prev && prev.beatId === selectedBeat.id) return prev
        return { beatId: selectedBeat.id, startSec: 0, durationSec: 60 }
      })
      ensureBeatAudio()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBeat?.id])

  useEffect(() => {
    const fetchBalance = async () => {
      if (!user?.id) {
        setCreditBalance(null)
        return
      }
      try {
        setCreditLoading(true)
        const apiBase = import.meta?.env?.VITE_API_BASE_URL || 'http://localhost:5001'
        const res = await fetch(`${apiBase}/credits/balance`, {
          headers: { 'x-user-id': user.id },
        })
        if (!res.ok) throw new Error('Failed to load credits')
        const data = await res.json()
        setCreditBalance(typeof data.balance === 'number' ? data.balance : 0)
      } catch (e) {
        console.warn('[RecordingLab] load credits failed', e)
        setCreditBalance(null)
      } finally {
        setCreditLoading(false)
      }
    }

    fetchBalance()
  }, [user?.id])

  useEffect(() => {
    const run = async () => {
      if (!user?.id) {
        setSavedSessions([])
        setSelectedSessionId('')
        return
      }
      const { data, error } = await supabase
        .from('studio_sessions')
        .select('id,name,updated_at,created_at')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(100)

      if (!error) {
        setSavedSessions(Array.isArray(data) ? data : [])
      } else {
        console.warn('[RecordingLab] failed to load studio sessions', error)
        setSavedSessions([])
      }
    }

    run()
  }, [user?.id])

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
          setRecordingPublicUrl(null)
          const startedAt = recordStartRef.current
          const elapsed = startedAt ? (Date.now() - startedAt) / 1000 : timerSeconds
          const durationSec = Math.max(elapsed || 0, 0.5)

          const apiBase = import.meta?.env?.VITE_API_BASE_URL || 'http://localhost:5001'
          const takeId = `take-${Date.now()}`

          const uploadTakeToBackend = async () => {
            try {
              setTakeUploadState('uploading')
              const filename = `${takeId}.webm`
              const contentType = blob.type || 'audio/webm'
              const folder = user?.id ? `studio-takes/${user.id}` : 'studio-takes/guest'

              const resp = await fetch(`${apiBase}/api/upload-url`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filename, contentType, folder }),
              })
              if (!resp.ok) throw new Error('Failed to get upload URL')
              const { uploadUrl, publicUrl } = await resp.json()
              if (!uploadUrl || !publicUrl) throw new Error('Invalid upload URL response')

              const put = await fetch(uploadUrl, {
                method: 'PUT',
                headers: { 'Content-Type': contentType },
                body: blob,
              })
              if (!put.ok) throw new Error('Upload failed')

              setRecordingPublicUrl(publicUrl)
              setVocalTracks((prev) =>
                prev.map((t) =>
                  t.id === takeId
                    ? { ...t, clip: { ...t.clip, url: publicUrl } }
                    : t,
                ),
              )
              setTakeUploadState('saved')
            } catch (e) {
              console.warn('[RecordingLab] take upload failed', e)
              setTakeUploadState('error')
            }
          }

          // Add a new vocal track with this take clipped at t=0 on the timeline
          setVocalTracks((prev) => {
            const index = prev.length + 1
            const name = `Take ${index}`
            return [
              ...prev,
              {
                id: takeId,
                name,
                muted: false,
                solo: false,
                clip: { startSec: 0, durationSec, url },
                fx: createDefaultVocalFx(),
              },
            ]
          })
          setSelectedVocalTrackId(takeId)

          setRecordState('recorded')
          uploadTakeToBackend()
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
    if (!user?.id) {
      // eslint-disable-next-line no-alert
      alert('Log in to use the Recording Lab.')
      return
    }
    if (typeof creditBalance === 'number' && creditBalance < 200) {
      setInsufficientCredits(true)
      // eslint-disable-next-line no-alert
      alert('Insufficient credits. Each session costs 200 credits.')
      return
    }
    if (!hasAudioSupport) return
    if (recordState === 'recording') return
    const recorder = await ensureRecorder()
    if (!recorder) return
    try {
      const apiBase = import.meta?.env?.VITE_API_BASE_URL || 'http://localhost:5001'
      const res = await fetch(`${apiBase}/credits/use`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id,
        },
        body: JSON.stringify({ amount: 200 }),
      })
      if (res.status === 402) {
        setInsufficientCredits(true)
        const data = await res.json().catch(() => ({}))
        if (typeof data.balance === 'number') setCreditBalance(data.balance)
        // eslint-disable-next-line no-alert
        alert('Insufficient credits. Please buy credits or upgrade your plan.')
        return
      }
      if (!res.ok) throw new Error('Credit deduction failed')
      const data = await res.json().catch(() => ({}))
      if (typeof data.balance === 'number') setCreditBalance(data.balance)
    } catch (e) {
      console.warn('[RecordingLab] credit deduction failed', e)
      // eslint-disable-next-line no-alert
      alert('Could not verify credits. Please try again in a moment.')
      return
    }
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
    setBeatClip((prev) => {
      if (prev) return { ...prev, startSec }
      return { beatId: selectedBeat?.id, startSec, durationSec: 60 }
    })
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
        { id, name: `Vocal ${index}`, muted: false, solo: false, volume: 1, clip: null, fx: createDefaultVocalFx() },
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

  const applyVocalFxChain = (ctx, sourceNode, fx, destinationNode) => {
    const safeFx = fx || {}
    let current = sourceNode
    const destination = destinationNode || ctx.destination

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
    dryGain.connect(destination)

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
      wet.connect(destination)
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
      wet.connect(destination)
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
    if (audioRef.current) {
      try {
        audioRef.current.pause()
      } catch {}
    }
    stopPlayheadAnimation()
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

    // Beat-only sessions: fall back to the beat HTMLAudio element for robust playback
    // (avoids decode/network edge-cases when there are no vocal clips yet).
    if (hasBeatAudio && !hasAnyVocalClip) {
      ensureBeatAudio()
      const el = audioRef.current
      if (!el) return
      try {
        const beatDur = Number.isFinite(el.duration) && el.duration > 0 ? el.duration : 60
        const safeStart = Math.min(Math.max(0, startAt), beatDur)
        el.currentTime = safeStart
        el.play().catch(() => {})

        const endLimit = Number.isFinite(regionEndLimit) && regionEndLimit < Infinity
          ? Math.min(regionEndLimit, beatDur)
          : beatDur
        if (endLimit > safeStart) {
          const remaining = endLimit - safeStart
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
          }, remaining * 1000 + 200)
        }

        setIsTimelinePlaying(true)
        startPlayheadAnimation(safeStart, endLimit)
      } catch {}
      return
    }

    const ctx = ensurePlaybackContext()
    if (!ctx) return

    stopTimelinePlayback()
    try {
      await ctx.resume()
    } catch {}

    const anySolo = beatTrackState.solo || vocalTracks.some((t) => t.solo)

    const tasks = []
    if (hasBeatAudio && !beatTrackState.muted && (!anySolo || beatTrackState.solo)) {
      tasks.push({
        type: 'beat',
        url: selectedBeat.audioUrl,
        clip: beatClip || { startSec: 0 },
        volume: typeof beatTrackState.volume === 'number' ? beatTrackState.volume : 1,
      })
    }
    vocalTracks.forEach((t) => {
      if (!t.clip || t.muted) return
      if (anySolo && !t.solo) return
      tasks.push({
        type: 'vocal',
        url: t.clip.url,
        clip: t.clip,
        fx: t.fx,
        volume: typeof t.volume === 'number' ? t.volume : 1,
      })
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
      const volume = typeof task.volume === 'number' ? task.volume : 1
      const gainNode = ctx.createGain()
      gainNode.gain.value = Math.max(0, Math.min(2, volume))
      if (task.type === 'vocal') {
        applyVocalFxChain(ctx, source, task.fx, gainNode)
      } else {
        source.connect(gainNode)
      }
      gainNode.connect(ctx.destination)
      try {
        source.start(when, offset, playDuration)
        sources.push(source)
      } catch {}
    }

    if (!sources.length) return

    timelineSourcesRef.current = sources
    setIsTimelinePlaying(true)

    if (maxEnd > startAt) {
      startPlayheadAnimation(startAt, maxEnd)
    } else {
      startPlayheadAnimation(startAt)
    }

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
    isTimelinePlayingRef.current = isTimelinePlaying
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
    }
  }, [isTimelinePlaying, recordState, recordingUrl])

  useEffect(() => {
    return () => {
      stopTimer()
      if (mediaRecorderRef.current && recordState === 'recording') {
        try { mediaRecorderRef.current.stop() } catch {}
      }
      if (recordingUrl) {
        try { URL.revokeObjectURL(recordingUrl) } catch {}
      }
      if (audioRef.current) {
        try { audioRef.current.pause() } catch {}
        audioRef.current.src = ''
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop())
      }
      if (audioContextRef.current) {
        try { audioContextRef.current.close() } catch {}
      }
      stopTimelinePlayback()
      stopPlayheadAnimation()
    }
  }, [])

  const canRecord = micStatus === 'granted' && hasAudioSupport
  const hasRecording = !!recordingUrl
  const canPlayArrangement = !!selectedBeat?.audioUrl || vocalTracks.some((t) => !!t.clip)
  const hasEnoughCredits = typeof creditBalance === 'number' ? creditBalance >= 200 : true

  const formatSessionLabel = (s) => {
    const name = (s?.name || '').trim()
    if (name) return name
    const ts = s?.updated_at || s?.created_at
    if (!ts) return 'Untitled session'
    try {
      return `Session · ${new Date(ts).toLocaleString()}`
    } catch {
      return 'Untitled session'
    }
  }

  const buildSessionState = () => {
    const hasLocalOnlyTakes = vocalTracks.some((t) =>
      typeof t?.clip?.url === 'string' ? t.clip.url.startsWith('blob:') : false,
    )
    if (hasLocalOnlyTakes) {
      // Local blob URLs can’t be restored after refresh.
      // Keep saving anyway (user might have other tracks + beat + FX).
      // eslint-disable-next-line no-alert
      alert('Some takes are still local-only (not uploaded). They will not reload after refresh unless uploaded.')
    }

    return {
      version: 1,
      savedAt: new Date().toISOString(),
      selectedBeatId: selectedBeat?.id || null,
      beatVolume,
      snapToGrid,
      beatClip,
      beatTrackState,
      vocalTracks,
      loopRegion,
      playheadSec,
      selectedVocalTrackId,
    }
  }

  const fetchSessionsList = async () => {
    if (!user?.id) return
    const { data, error } = await supabase
      .from('studio_sessions')
      .select('id,name,updated_at,created_at')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(100)
    if (!error) setSavedSessions(Array.isArray(data) ? data : [])
  }

  const handleSaveSession = async () => {
    if (!user?.id) {
      // eslint-disable-next-line no-alert
      alert('Log in to save sessions.')
      return
    }

    const existing = selectedSessionId
      ? savedSessions.find((s) => s.id === selectedSessionId)
      : null

    const defaultName = (existing?.name || '').trim() || `Session ${new Date().toLocaleString()}`
    // eslint-disable-next-line no-alert
    const input = window.prompt('Session name (optional)', defaultName)
    if (input === null) return
    const name = input.trim() || defaultName

    const payload = {
      user_id: user.id,
      name,
      beat_id: selectedBeat?.id || null,
      beat_snapshot: selectedBeat
        ? {
            id: selectedBeat.id,
            title: selectedBeat.title,
            audioUrl: selectedBeat.audioUrl,
            coverUrl: selectedBeat.coverUrl,
            bpm: selectedBeat.bpm,
            producer: selectedBeat.producer,
          }
        : null,
      state: buildSessionState(),
    }

    try {
      setSessionBusy(true)
      if (selectedSessionId) {
        const { error } = await supabase
          .from('studio_sessions')
          .update(payload)
          .eq('id', selectedSessionId)
          .eq('user_id', user.id)
        if (error) throw error
      } else {
        const { data, error } = await supabase
          .from('studio_sessions')
          .insert(payload)
          .select('id')
          .single()
        if (error) throw error
        if (data?.id) setSelectedSessionId(data.id)
      }

      await fetchSessionsList()
    } catch (e) {
      console.warn('[RecordingLab] save session failed', e)
      // eslint-disable-next-line no-alert
      alert('Failed to save session. (Check Supabase table + RLS + env vars.)')
    } finally {
      setSessionBusy(false)
    }
  }

  const handleLoadSession = async (sessionId) => {
    if (!user?.id) return
    if (!sessionId) return
    try {
      setSessionBusy(true)
      stopTimelinePlayback()
      cleanupBeatAudio()

      const { data, error } = await supabase
        .from('studio_sessions')
        .select('id,name,beat_snapshot,state')
        .eq('id', sessionId)
        .eq('user_id', user.id)
        .single()
      if (error) throw error

      const state = data?.state || {}
      const beatSnapshot = data?.beat_snapshot || null

      setSelectedBeat(beatSnapshot && beatSnapshot.audioUrl ? beatSnapshot : null)
      setBeatVolume(typeof state.beatVolume === 'number' ? state.beatVolume : 0.8)
      setSnapToGrid(typeof state.snapToGrid === 'boolean' ? state.snapToGrid : true)
      setBeatClip(state.beatClip || null)
      setBeatTrackState(state.beatTrackState || { muted: false, solo: false, volume: 1 })
      setVocalTracks(
        Array.isArray(state.vocalTracks)
          ? state.vocalTracks.map((t, idx) => ({
              id: t.id || `vocal-${idx + 1}`,
              name: t.name || `Vocal ${idx + 1}`,
              muted: !!t.muted,
              solo: !!t.solo,
              volume: typeof t.volume === 'number' ? t.volume : 1,
              clip: t.clip || null,
              fx: t.fx || createDefaultVocalFx(),
            }))
          : [],
      )
      setLoopRegion(state.loopRegion || { enabled: false, startSec: 0, endSec: 8 })
      setPlayheadSec(typeof state.playheadSec === 'number' ? state.playheadSec : 0)
      setSelectedVocalTrackId(state.selectedVocalTrackId || null)

      setRecordState('idle')
      setTimerSeconds(0)
      if (recordingUrl) {
        try { URL.revokeObjectURL(recordingUrl) } catch {}
      }
      setRecordingUrl(null)
      setRecordingPublicUrl(null)
      setTakeUploadState('idle')
    } catch (e) {
      console.warn('[RecordingLab] load session failed', e)
      // eslint-disable-next-line no-alert
      alert('Failed to load session.')
    } finally {
      setSessionBusy(false)
    }
  }

  return (
    <section className="studio-shell min-h-screen lg:h-screen lg:overflow-hidden">
      <div className="mx-auto flex h-full w-full max-w-7xl flex-col px-4 py-6">
        <div className="flex flex-shrink-0 items-center gap-3">
          <BackButton />
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-red-400">Recording Lab</p>
            <h1 className="font-display text-2xl font-semibold text-slate-50">In-browser vocal booth</h1>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <div className="flex flex-col items-end text-[11px]">
              <div className="flex items-center gap-2">
                <span className="rounded-full border border-slate-700/80 bg-slate-950/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-300">
                  {creditLoading
                    ? 'Credits: …'
                    : typeof creditBalance === 'number'
                    ? `Credits: ${creditBalance.toLocaleString('en-US')}`
                    : 'Credits: —'}
                </span>
                <a
                  href="/studio-credits"
                  className="rounded-full border border-emerald-500/70 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-300 hover:bg-emerald-500/15"
                >
                  Buy Credits
                </a>
                <a
                  href="/#pricing"
                  className="rounded-full border border-sky-500/70 bg-sky-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-sky-300 hover:bg-sky-500/15"
                >
                  Upgrade Plan
                </a>
              </div>
              <p className="mt-1 text-[10px] text-slate-400">200 credits per recording session</p>
            </div>
            <select
              className="h-9 w-[220px] max-w-[52vw] rounded-xl border border-slate-800/80 bg-slate-950/80 px-3 text-[12px] text-slate-200"
              value={selectedSessionId}
              disabled={!user || sessionBusy}
              onChange={(e) => {
                const id = e.target.value
                setSelectedSessionId(id)
                if (id) handleLoadSession(id)
              }}
              title={user ? 'Saved sessions' : 'Log in to see saved sessions'}
            >
              <option value="">Saved sessions…</option>
              {savedSessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {formatSessionLabel(s)}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={handleSaveSession}
              disabled={!user || sessionBusy}
              className="h-9 rounded-xl border border-slate-800/80 bg-slate-900/60 px-3 text-[12px] font-semibold text-slate-100 hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
              title={user ? 'Save current session' : 'Log in to save sessions'}
            >
              {selectedSessionId ? 'Save' : 'Save session'}
            </button>

            <span className="rounded-full border border-red-500/70 bg-red-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-red-300">Beta</span>
            <button
              type="button"
              onClick={() => setIsArrangementFullscreen((v) => !v)}
              className="hidden h-8 w-8 items-center justify-center rounded-full border border-slate-700/80 bg-slate-900/80 text-[11px] text-slate-200 hover:border-emerald-400/70 lg:inline-flex"
              title={isArrangementFullscreen ? 'Exit full arrangement view' : 'Fullscreen arrangement view'}
            >
              {isArrangementFullscreen ? '⤢' : '⤢'}
            </button>
          </div>
        </div>

        {!hasAudioSupport && (
          <div className="mt-4 rounded-2xl border border-amber-500/60 bg-amber-500/10 p-3 text-[11px] text-amber-100">
            Your browser does not support in-browser recording. Please use the latest version of Chrome or Edge on desktop.
          </div>
        )}

        <div
          className={`mt-6 flex-1 min-h-0 gap-4 transition-all lg:grid ${
            isArrangementFullscreen
              ? 'lg:grid-cols-[minmax(0,1fr)]'
              : 'lg:grid-cols-[320px_minmax(0,1fr)_320px]'
          }`}
        >
          {!isArrangementFullscreen && (
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
          )}

          <div className="relative flex min-h-0 flex-col gap-4">
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
                bpm={selectedBeat?.bpm}
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
                onBeatVolumeChange={(value) => {
                  const v = Number.isFinite(value) ? value : 1
                  setBeatTrackState((s) => ({ ...s, volume: v }))
                  setBeatVolume(v)
                  if (audioRef.current) {
                    try {
                      audioRef.current.volume = Math.max(0, Math.min(1, v))
                    } catch {}
                  }
                }}
                onVocalVolumeChange={(trackId, value) => {
                  const v = Number.isFinite(value) ? value : 1
                  setVocalTracks((prev) =>
                    prev.map((t) => (t.id === trackId ? { ...t, volume: v } : t)),
                  )
                }}
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
                onRequestMic={requestMic}
                onStopArrangement={stopTimelinePlayback}
                canRecord={canRecord}
                canPlay={canPlayArrangement}
                hasRecording={hasRecording}
                isBeatPlaying={isBeatPlaying}
                onToggleBeat={toggleBeatPlay}
                hasBeatSelected={!!selectedBeat}
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
                  <span className="rounded-full border border-slate-700/80 px-2 py-0.5 text-[10px] text-slate-400">
                    {takeUploadState === 'uploading'
                      ? 'Uploading…'
                      : takeUploadState === 'saved'
                      ? 'Saved'
                      : takeUploadState === 'error'
                      ? 'Upload failed · Local'
                      : 'Local only · Draft'}
                  </span>
                </div>
                <p className="mt-1 text-sm font-semibold text-slate-50">Preview recording</p>
                <audio
                  controls
                  src={recordingUrl}
                  className="mt-3 w-full rounded-xl border border-slate-800/80 bg-slate-900/80 p-2"
                />
                {recordingPublicUrl ? (
                  <p className="mt-2 text-[10px] text-slate-500">Saved URL: {recordingPublicUrl}</p>
                ) : (
                  <p className="mt-2 text-[10px] text-slate-500">Takes upload to your storage when the backend is running.</p>
                )}
              </div>
            )}
          </div>
          {!isArrangementFullscreen && (
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
          )}
        </div>
        {isArrangementFullscreen && (
          <div className="pointer-events-none fixed inset-x-0 bottom-4 z-40 flex justify-center px-4">
            <div className="pointer-events-auto flex max-w-3xl flex-1 items-center justify-between gap-3 rounded-2xl border border-slate-800/80 bg-slate-950/95/90 px-4 py-2 text-[11px] text-slate-200 shadow-[0_18px_60px_rgba(15,23,42,0.95)]">
              <div className="flex items-center gap-2">
                <span className="rounded-full border border-slate-700/80 bg-slate-950/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-300">
                  {creditLoading
                    ? 'Credits: …'
                    : typeof creditBalance === 'number'
                    ? `Credits: ${creditBalance.toLocaleString('en-US')}`
                    : 'Credits: —'}
                </span>
                <button
                  type="button"
                  onClick={handleSaveSession}
                  disabled={!user || sessionBusy}
                  className="h-7 rounded-full border border-slate-800/80 bg-slate-900/60 px-3 text-[10px] font-semibold text-slate-100 hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {selectedSessionId ? 'Save' : 'Save session'}
                </button>
              </div>
              <div className="flex items-center gap-2">
                <select
                  className="h-7 w-[200px] rounded-full border border-slate-800/80 bg-slate-950/80 px-3 text-[10px] text-slate-200"
                  value={selectedSessionId}
                  disabled={!user || sessionBusy}
                  onChange={(e) => {
                    const id = e.target.value
                    setSelectedSessionId(id)
                    if (id) handleLoadSession(id)
                  }}
                  title={user ? 'Saved sessions' : 'Log in to see saved sessions'}
                >
                  <option value="">Saved sessions…</option>
                  {savedSessions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {formatSessionLabel(s)}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setIsArrangementFullscreen(false)}
                  className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-700/80 bg-slate-900/80 text-[11px] text-slate-200 hover:border-emerald-400/70"
                  title="Exit full arrangement view"
                >
                  ✕
                </button>
              </div>
            </div>
          </div>
        )}

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

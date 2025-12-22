import { useEffect, useRef, useState } from 'react'
import BackButton from '../components/BackButton'
import BeatSelector from '../components/studio/BeatSelector'
import RecorderControls from '../components/studio/RecorderControls'
import WaveformCanvas from '../components/studio/WaveformCanvas'
import StudioSidebar from '../components/studio/StudioSidebar'
import useSupabaseUser from '../hooks/useSupabaseUser'
import '../styles/recordingLab.css'

export function RecordingLab() {
  const { user } = useSupabaseUser()

  const [selectedBeat, setSelectedBeat] = useState(null)
  const [beatVolume, setBeatVolume] = useState(0.8)
  const [isBeatPlaying, setIsBeatPlaying] = useState(false)
  const [loopEnabled, setLoopEnabled] = useState(true)

  const [micStatus, setMicStatus] = useState('idle') // idle | pending | granted | denied
  const [recordState, setRecordState] = useState('idle') // idle | recording | recorded
  const [timerSeconds, setTimerSeconds] = useState(0)
  const [recordingUrl, setRecordingUrl] = useState(null)

  const [monitorEnabled, setMonitorEnabled] = useState(false)
  const [effects, setEffects] = useState({ reverb: false, delay: false, autotune: false })
  const [inputGain, setInputGain] = useState(1)

  const audioRef = useRef(null)
  const audioContextRef = useRef(null)
  const mediaStreamRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const analyserRef = useRef(null)
  const monitorGainRef = useRef(null)
  const chunksRef = useRef([])
  const timerRef = useRef(null)

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
    el.loop = loopEnabled
    el.volume = beatVolume
    el.addEventListener('ended', () => {
      setIsBeatPlaying(false)
    })
    audioRef.current = el
  }

  const cleanupBeatAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.src = ''
      audioRef.current = null
    }
    setIsBeatPlaying(false)
  }

  useEffect(() => {
    // When beat changes, rebuild audio element
    cleanupBeatAudio()
    if (selectedBeat && selectedBeat.audioUrl) {
      ensureBeatAudio()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBeat?.id])

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.loop = loopEnabled
    }
  }, [loopEnabled])

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
      const audioCtx = new AudioContextClass()
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

  const handleToggleEffect = (key) => {
    setEffects((fx) => ({ ...fx, [key]: !fx[key] }))
  }

  useEffect(() => {
    return () => {
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
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const canRecord = micStatus === 'granted' && hasAudioSupport
  const hasRecording = !!recordingUrl

  return (
    <section className="studio-shell">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="flex items-center gap-3">
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

        <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.3fr)_minmax(0,0.9fr)]">
          <BeatSelector
            selectedBeat={selectedBeat}
            onSelectBeat={setSelectedBeat}
            isPlaying={isBeatPlaying}
            onTogglePlay={toggleBeatPlay}
            loopEnabled={loopEnabled}
            onToggleLoop={() => setLoopEnabled((v) => !v)}
            volume={beatVolume}
            onVolumeChange={setBeatVolume}
          />

          <div className="flex flex-col gap-4">
            <WaveformCanvas analyser={analyserRef.current} isActive={recordState === 'recording'} />
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
            />
            {hasRecording && (
              <div className="rounded-2xl border border-slate-800/80 bg-slate-950/80 p-4 text-[12px] text-slate-200">
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

          <StudioSidebar
            micStatus={micStatus}
            onRequestMic={requestMic}
            monitorEnabled={monitorEnabled}
            onToggleMonitor={toggleMonitor}
            effects={effects}
            onToggleEffect={handleToggleEffect}
            inputGain={inputGain}
            onInputGainChange={handleInputGainChange}
          />
        </div>
      </div>
    </section>
  )
}

export default RecordingLab

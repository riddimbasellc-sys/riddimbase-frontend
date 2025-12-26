export default function RecorderControls({
  recordState,
  onRecord,
  onStop,
  onReRecord,
  onRequestMic,
  onStopArrangement,
  canRecord,
  canPlay,
  hasRecording,
  isBeatPlaying,
  onToggleBeat,
  hasBeatSelected,
  timerSeconds,
  isArrangementPlaying,
  onToggleArrangementPlay,
  isLoopEnabled,
  onToggleLoop,
}) {
  const Icon = ({ children, filled = false }) => (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      aria-hidden="true"
      focusable="false"
      fill={filled ? 'currentColor' : 'none'}
      stroke={filled ? 'none' : 'currentColor'}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  )

  const IconRecord = () => (
    <Icon filled>
      <circle cx="12" cy="12" r="6" />
    </Icon>
  )

  const IconStop = () => (
    <Icon filled>
      <rect x="7" y="7" width="10" height="10" rx="2" />
    </Icon>
  )

  const IconPlay = () => (
    <Icon filled>
      <path d="M9 7 L18 12 L9 17 Z" />
    </Icon>
  )

  const IconPause = () => (
    <Icon filled>
      <rect x="7" y="6.5" width="4" height="11" rx="1" />
      <rect x="13" y="6.5" width="4" height="11" rx="1" />
    </Icon>
  )

  const IconLoop = () => (
    <Icon>
      <path d="M20 12a8 8 0 0 1-14.5 4" />
      <path d="M4 12a8 8 0 0 1 14.5-4" />
      <path d="M18 5v4h-4" />
      <path d="M6 19v-4h4" />
    </Icon>
  )
        <div className="rounded-2xl border border-slate-800/80 bg-slate-950/95 px-3 py-2 text-[11px] text-slate-200 shadow-[0_10px_40px_rgba(15,23,42,0.9)]">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <TransportButton
                title={canRecord ? 'Record' : 'Enable microphone to record'}
                disabled={recordState === 'recording'}
                active={recordState === 'recording'}
                variant="record"
                onClick={() => {
                  if (recordState === 'recording') return
                  if (canRecord) onRecord?.()
                  else onRequestMic?.()
                }}
              >
                <IconRecord />
              </TransportButton>
              <TransportButton
                title={recordState === 'recording' ? 'Stop recording' : 'Stop playback'}
                disabled={recordState !== 'recording' && !isArrangementPlaying}
                active={recordState === 'recording' || isArrangementPlaying}
                onClick={() => {
                  if (recordState === 'recording') onStop?.()
                  else onStopArrangement?.()
                }}
              >
                <IconStop />
              </TransportButton>
              <TransportButton
                title={isArrangementPlaying ? 'Pause arrangement (Spacebar)' : 'Play arrangement (Spacebar)'}
                disabled={!canPlay}
                active={isArrangementPlaying}
                onClick={onToggleArrangementPlay}
              >
                {isArrangementPlaying ? <IconPause /> : <IconPlay />}
              </TransportButton>
              <TransportButton
                title={isLoopEnabled ? 'Disable loop' : 'Enable loop'}
                disabled={!onToggleLoop}
                active={!!isLoopEnabled}
                onClick={onToggleLoop}
              >
                <IconLoop />
              </TransportButton>
            </div>

            <div className="flex items-center gap-2">
              <TransportButton
                title="Re-record (discard last take)"
                disabled={!hasRecording}
                active={false}
                onClick={onReRecord}
              >
                <IconRedo />
              </TransportButton>
              <TransportButton
                title={isBeatPlaying ? 'Stop beat monitor' : 'Play beat monitor'}
                disabled={!hasBeatSelected}
                active={!!isBeatPlaying}
                onClick={onToggleBeat}
              >
                <IconHeadphones />
              </TransportButton>
            </div>
          </div>
        </div>
            <IconRecord />
          </TransportButton>
          <TransportButton
            title={recordState === 'recording' ? 'Stop recording' : 'Stop playback'}
            disabled={recordState !== 'recording' && !isArrangementPlaying}
            active={recordState === 'recording' || isArrangementPlaying}
            onClick={() => {
              if (recordState === 'recording') onStop?.()
              else onStopArrangement?.()
            }}
          >
            <IconStop />
          </TransportButton>
          <TransportButton
            title={isArrangementPlaying ? 'Pause arrangement (Spacebar)' : 'Play arrangement (Spacebar)'}
            disabled={!canPlay}
            active={isArrangementPlaying}
            onClick={onToggleArrangementPlay}
          >
            {isArrangementPlaying ? <IconPause /> : <IconPlay />}
          </TransportButton>
          <TransportButton
            title={isLoopEnabled ? 'Disable loop' : 'Enable loop'}
            disabled={!onToggleLoop}
            active={!!isLoopEnabled}
            onClick={onToggleLoop}
          >
            <IconLoop />
          </TransportButton>
        </div>

        <div className="flex items-center gap-2">
          <TransportButton
            title="Re-record (discard last take)"
            disabled={!hasRecording}
            active={false}
            onClick={onReRecord}
          >
            <IconRedo />
          </TransportButton>
          <TransportButton
            title={isBeatPlaying ? 'Stop beat monitor' : 'Play beat monitor'}
            disabled={!hasBeatSelected}
            active={!!isBeatPlaying}
            onClick={onToggleBeat}
          >
            <IconHeadphones />
          </TransportButton>
        </div>
      </div>
    </div>
  )
}

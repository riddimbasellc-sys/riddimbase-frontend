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
  timerSeconds, // kept for API compatibility, unused in compact UI
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

  const IconRedo = () => (
    <Icon>
      <path d="M20 7v6h-6" />
      <path d="M20 13a8 8 0 1 1-2.3-5.7" />
    </Icon>
  )

  const IconHeadphones = () => (
    <Icon>
      <path d="M4.5 12a7.5 7.5 0 0 1 15 0" />
      <path d="M4.5 12v6" />
      <path d="M19.5 12v6" />
      <rect x="3.5" y="14" width="4" height="6" rx="2" />
      <rect x="16.5" y="14" width="4" height="6" rx="2" />
    </Icon>
  )

  const TransportButton = ({
    title,
    disabled,
    active,
    variant,
    onClick,
    children,
  }) => {
    const base =
      'inline-flex h-8 w-8 items-center justify-center rounded-full border text-[14px] font-semibold transition focus:outline-none focus-visible:ring-2'
    const styles =
      variant === 'record'
        ? active
          ? 'border-red-500/80 bg-red-500 text-slate-950 studio-rec-glow focus-visible:ring-red-500/40'
          : 'border-slate-700/70 bg-slate-900 text-red-300 hover:border-red-400/70 focus-visible:ring-red-500/30'
        : active
        ? 'border-emerald-500/70 bg-emerald-500/15 text-emerald-200 shadow-[0_0_12px_rgba(16,185,129,0.35)] focus-visible:ring-emerald-500/30'
        : 'border-slate-700/80 bg-slate-900 text-slate-200 hover:border-emerald-400/70 focus-visible:ring-slate-500/30'

    return (
      <button
        type="button"
        title={title}
        aria-label={title}
        disabled={disabled}
        onClick={onClick}
        className={`${base} ${styles} ${
          disabled
            ? 'cursor-not-allowed opacity-40 hover:border-slate-700/80 hover:bg-slate-900'
            : ''
        }`}
      >
        {children}
      </button>
    )
  }

  return (
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
            disabled={false}
            active={recordState === 'recording' || isArrangementPlaying}
            onClick={() => {
              if (recordState === 'recording') {
                onStop?.()
              }
              onStopArrangement?.()
            }}
          >
            <IconStop />
          </TransportButton>
          <TransportButton
            title={
              isArrangementPlaying
                ? 'Pause arrangement (Spacebar)'
                : 'Play arrangement (Spacebar)'
            }
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

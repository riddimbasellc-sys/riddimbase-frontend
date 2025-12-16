import { useState } from 'react'
import { openTawk } from '../services/tawkService'

export default function SupportBubbleWidget() {
  const [open, setOpen] = useState(false)
  const whatsappHref = 'https://wa.me/18762797956'

  const hasTawkConfig =
    Boolean(import.meta.env.VITE_TAWK_PROPERTY_ID) &&
    Boolean(import.meta.env.VITE_TAWK_WIDGET_ID)

  return (
    <div className="pointer-events-none fixed bottom-24 right-4 z-40 md:bottom-8 md:right-8">
      {open && (
        <div className="pointer-events-auto mb-3 w-64 rounded-2xl border border-slate-800/80 bg-slate-950/95 p-3 shadow-rb-gloss-panel">
          <p className="mb-1 text-[11px] font-semibold text-slate-100">Get help</p>
          <p className="mb-3 text-[10px] text-slate-400">
            Talk to us in real time or reach out on WhatsApp.
          </p>
          <div className="space-y-2 text-[11px] font-medium">
            <button
              type="button"
              onClick={() => {
                if (hasTawkConfig) {
                  openTawk()
                } else {
                  window.open('https://tawk.to/chat', '_blank', 'noopener,noreferrer')
                }
                setOpen(false)
              }}
              className="flex w-full items-center justify-between rounded-xl bg-red-500/90 px-3 py-2 text-slate-50 hover:bg-red-400 transition"
            >
              <span className="inline-flex items-center gap-2">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-black/30 text-xs">
                  💬
                </span>
                <span>Chat live</span>
              </span>
            </button>
            <a
              href={whatsappHref}
              target="_blank"
              rel="noreferrer"
              onClick={() => setOpen(false)}
              className="flex items-center justify-between rounded-xl bg-[#25D366] px-3 py-2 text-slate-950 hover:bg-[#1ebe5a] transition"
            >
              <span className="inline-flex items-center gap-2">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-black/10 text-xs">
                  ☎
                </span>
                <span>Chat on WhatsApp</span>
              </span>
            </a>
          </div>
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="pointer-events-auto inline-flex items-center gap-2 rounded-full bg-red-500 px-4 py-2 text-[11px] font-semibold text-slate-50 shadow-rb-gloss-btn hover:bg-red-400 transition"
        aria-label="Get help"
      >
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-black/30 text-xs">
          ?
        </span>
        <span>Get help</span>
      </button>
    </div>
  )
}


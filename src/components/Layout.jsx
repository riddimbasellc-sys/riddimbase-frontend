import { Navbar } from './Navbar'
import { Footer } from './Footer'
import { useEffect, useState } from 'react'
import AnnouncementRotator from './AnnouncementRotator'
import { getAnnouncements, getRotationInterval } from '../services/announcementService'
import { Link } from 'react-router-dom'

export function Layout({ children }) {
  const [announcements, setAnnouncements] = useState([])
  const [intervalSec, setIntervalSec] = useState(3)

  useEffect(() => {
    async function load() {
      const [list, interval] = await Promise.all([
        getAnnouncements(),
        getRotationInterval(),
      ])
      setAnnouncements(list || [])
      setIntervalSec(interval || 3)
    }

    load()
  }, [])

  return (
    <div className="min-h-screen overflow-x-hidden bg-rb-caribbean text-slate-50 flex flex-col">
      {/* Announcement bar fixed at very top, above navbar */}
      {announcements.length > 0 && (
        <div className="w-full border-b border-rb-sun-gold/50 bg-slate-950/70 backdrop-blur-md shadow-rb-gloss-panel">
          <div className="mx-auto flex w-full max-w-7xl px-4 py-1.5">
            <AnnouncementRotator
              announcements={announcements}
              intervalSec={intervalSec}
              className="w-full"
            />
          </div>
        </div>
      )}
      <Navbar />
      <main className="relative flex-1">
        {children}
        <HelpBubble />
      </main>
      <Footer />
    </div>
  )
}

function HelpBubble() {
  const [open, setOpen] = useState(false)
  const whatsappHref = 'https://wa.me/18762797956'

  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-40">
      {open && (
        <div className="pointer-events-auto mb-3 w-56 rounded-2xl border border-slate-800/80 bg-slate-950/95 p-3 shadow-rb-gloss-panel">
          <p className="text-[11px] font-semibold text-slate-100 mb-2">Need a hand?</p>
          <div className="space-y-2">
            <Link
              to="/support/general?ticket=1"
              onClick={() => setOpen(false)}
              className="flex items-center justify-between rounded-xl border border-slate-700/70 bg-slate-900/80 px-3 py-2 text-[11px] font-medium text-slate-100 hover:border-emerald-400/70 hover:text-emerald-300 transition"
            >
              <span>Create support ticket</span>
              <span className="text-xs">→</span>
            </Link>
            <a
              href={whatsappHref}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between rounded-xl bg-[#25D366] px-3 py-2 text-[11px] font-semibold text-slate-950 hover:bg-[#1ebe5a] transition"
              onClick={() => setOpen(false)}
            >
              <span>Chat on WhatsApp</span>
              <span className="inline-flex h-4 w-4 items-center justify-center">
                <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                  <path d="M12.04 2A9.9 9.9 0 0 0 2 11.93a9.8 9.8 0 0 0 1.35 5l-1.4 5.1 5.2-1.36A10 10 0 1 0 12.04 2Zm0 2a8 8 0 0 1 0 16 8.1 8.1 0 0 1-4.08-1.1l-.3-.18-3 0.8 0.8-2.9-.2-.31A7.9 7.9 0 0 1 4 11.93 8 8 0 0 1 12.04 4Zm-3 3.3c-.2 0-.5 0-.7.4-.2.5-.7 1.4-.7 2.3s.5 2 1.1 2.7 1.6 1.7 3.1 2.3c1.5.6 2 .5 2.4.4.4 0 1.3-.5 1.4-1s.1-1 .1-1-.1-.1-.3-.2l-1.4-.7c-.2-.1-.4-.2-.6 0l-.5.6c-.1.1-.3.2-.5.1-.2-.1-.9-.3-1.7-1.1-.6-.5-1-1.5-1.1-1.7-.1-.2 0-.3.1-.4l.4-.5c.1-.2.1-.3 0-.5l-.6-1.5C12 7.4 11.9 7.3 11.8 7.3Z" />
                </svg>
              </span>
            </a>
          </div>
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="pointer-events-auto inline-flex h-11 w-11 items-center justify-center rounded-full bg-rb-sun-gold text-slate-950 shadow-rb-gloss-btn hover:bg-rb-sun-yellow transition"
        aria-label="Help me"
      >
        ?
      </button>
    </div>
  )
}

import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { getFooterLinks } from '../services/siteLinksService'
import { getSocialLinks } from '../services/socialLinksService'

export function Footer() {
  const [links, setLinks] = useState([])
  const [socials, setSocials] = useState([])

  useEffect(() => {
    ;(async () => {
      const l = await getFooterLinks()
      setLinks(l)
      const s = await getSocialLinks()
      const filtered = (s || []).filter(
        (item) => item.url && item.url.trim().length > 0,
      )
      setSocials(filtered)
    })()
  }, [])

  return (
    <footer className="border-t border-slate-900/80 bg-slate-950/95 bg-rb-gloss-stripes bg-blend-soft-light">
      <div className="mx-auto max-w-6xl px-4 py-6 md:py-8">
        {/* Top row: brand + socials */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-1 md:max-w-md">
            <div className="rb-logo-gloss">
              <img src="/assets/rb-logo.png" alt="RiddimBase" className="h-7 w-auto rb-logo-img" />
            </div>
            <p className="text-[11px] leading-relaxed text-slate-400">
              The Caribbean beat marketplace for dancehall, reggae, soca, afrobeats & emerging hybrid genres.
            </p>
          </div>
          {socials.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-500">Connect</span>
              <div className="flex flex-wrap items-center gap-2">
                {socials.map((s) => (
                  <a
                    key={s.id}
                    href={s.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-900/80 border border-slate-700/70 hover:border-red-500 hover:bg-slate-900 shadow-rb-gloss-btn transition"
                    aria-label={s.network}
                  >
                    <FooterSocialIcon network={s.network} className="h-4 w-4 text-red-400" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Bottom row: links + copyright */}
        <div className="mt-4 flex flex-col gap-3 md:mt-3 md:flex-row md:items-center md:justify-between">
          <nav
            aria-label="Footer navigation"
            className="flex flex-wrap gap-x-4 gap-y-1 text-[11px]"
          >
            {links.map((l) => (
              <Link
                key={l.id}
                to={l.to}
                className="text-slate-400 hover:text-rb-sun-gold transition"
              >
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="text-[10px] text-slate-500 md:text-right space-y-1">
            <p>© {new Date().getFullYear()} RiddimBase. All rights reserved.</p>
            <p>Building a fair ecosystem for Caribbean music creators.</p>
          </div>
        </div>
      </div>
    </footer>
  )
}

function FooterSocialIcon({ network, className }) {
  switch (network) {
    case 'instagram':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
          <rect x="3" y="3" width="18" height="18" rx="5" />
          <circle cx="12" cy="12" r="4.5" />
          <circle cx="17" cy="7" r="1.2" />
        </svg>
      )
    case 'youtube':
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
          <path d="M21.6 7.2a2.5 2.5 0 0 0-1.76-1.77C18.1 5 12 5 12 5s-6.1 0-7.84.43A2.5 2.5 0 0 0 2.4 7.2 26 26 0 0 0 2 12a26 26 0 0 0 .4 4.8 2.5 2.5 0 0 0 1.76 1.77C5.9 19 12 19 12 19s6.1 0 7.84-.43A2.5 2.5 0 0 0 21.6 16.8 26 26 0 0 0 22 12a26 26 0 0 0-.4-4.8ZM10 15.25V8.75L15 12Z" />
        </svg>
      )
    case 'tiktok':
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
          <path d="M15.5 3h2.1c.2 1 .7 1.9 1.4 2.6a4 4 0 0 0 2.3 1v2.3a6.4 6.4 0 0 1-3.5-1.1v6.5A5.7 5.7 0 0 1 12 20.9 5.9 5.9 0 0 1 6.1 15 5.8 5.8 0 0 1 12 9.1h.5v2.8A3.1 3.1 0 0 0 9.9 15 3 3 0 0 0 12 18a3 3 0 0 0 3.1-3V3Z" />
        </svg>
      )
    case 'twitter':
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
          <path d="M16.5 3H20l-7 8.2L21 21h-4.5l-5-6-5.7 6H2.2l7.5-8.5L3 3h4.6l4.5 5.5Z" />
        </svg>
      )
    case 'facebook':
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
          <path d="M13.5 21v-7h2.3l.4-3h-2.7V9a1.1 1.1 0 0 1 1.2-1.2h1.6V5.1H14a3.4 3.4 0 0 0-3.6 3.6v2.3H8v3h2.4v7Z" />
        </svg>
      )
    case 'soundcloud':
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
          <path d="M9.5 7.2A4.7 4.7 0 0 1 14 4.5a4.8 4.8 0 0 1 4.6 3.4A3.4 3.4 0 0 1 22 11.2 3.3 3.3 0 0 1 18.7 15H9a3.2 3.2 0 0 1-3.2-3.1A3.3 3.3 0 0 1 9.5 7.2Z" />
          <path d="M4 9.5A2.7 2.7 0 0 0 2.5 12 2.7 2.7 0 0 0 4 14.5Z" />
        </svg>
      )
    case 'spotify':
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
          <path d="M12 2.5A9.5 9.5 0 1 0 21.5 12 9.5 9.5 0 0 0 12 2.5Zm3.8 12.6a.8.8 0 0 1-1.1.3 8.3 8.3 0 0 0-3.4-.9 7.9 7.9 0 0 0-2.8.4.8.8 0 0 1-.5-1.4 9.5 9.5 0 0 1 3.3-.5 9.9 9.9 0 0 1 4 .9.8.8 0 0 1 .5 1.2Zm1-3a.9.9 0 0 1-1.2.3 10.7 10.7 0 0 0-4.3-1 10 10 0 0 0-3.2.4.9.9 0 0 1-.5-1.7A11.8 11.8 0 0 1 12 9a12.5 12.5 0 0 1 5 1.2.9.9 0 0 1 .8 1.4Zm.1-3a.9.9 0 0 1-1.2.4 12.4 12.4 0 0 0-5-1.1 11.9 11.9 0 0 0-3.7.6.9.9 0 0 1-.6-1.7A13.9 13.9 0 0 1 12 6.7a14.6 14.6 0 0 1 5.8 1.4.9.9 0 0 1 .6 1.5Z" />
        </svg>
      )
    default:
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
          <circle cx="12" cy="12" r="9" />
          <path d="M8 12h8" />
        </svg>
      )
  }
}

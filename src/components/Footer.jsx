import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { getFooterLinks } from '../services/siteLinksService'
import { getSocialLinks } from '../services/socialLinksService'
import SocialIcon from './SocialIcon'

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
            <div className="font-semibold text-slate-100 text-sm drop-shadow-rb-glow">
              RiddimBase
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
                    <SocialIcon network={s.network} className="h-4 w-4" />
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


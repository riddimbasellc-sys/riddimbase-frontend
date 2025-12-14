import BackButton from '../components/BackButton'
import { listProviderProfiles, fetchCatalog } from '../services/supabaseProvidersRepository'
import { Link } from 'react-router-dom'
import SocialIconRow from '../components/SocialIconRow'
import { useEffect, useState } from 'react'
import { BeatPlayer } from '../components/BeatPlayer'

export function Services() {
  const [providers, setProviders] = useState([])

  useEffect(() => {
    let active = true
    async function load() {
      const rows = await listProviderProfiles()
      const baseProviders = rows.map((row) => ({
        id: row.id,
        name: row.display_name || row.id,
        avatar: row.avatar_url || null,
        location: row.location || '',
        tags:
          (row.tags || '')
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean) || [],
        bio: row.bio || '',
        contact: {
          email: row.contact_email || '',
          phone: row.contact_phone || '',
          instagram: row.instagram || '',
          whatsapp: row.whatsapp || '',
          telegram: row.telegram || '',
        },
        services: Array.isArray(row.services) ? row.services : [],
        catalog: [],
      }))

      const catalogs = await Promise.all(
        baseProviders.map(async (p) => {
          const items = await fetchCatalog(p.id)
          return (items || []).map((c) => ({
            id: c.id,
            title: c.title,
            audioUrl: c.audio_url,
            coverUrl: c.cover_url,
          }))
        }),
      )

      if (active) {
        const enriched = baseProviders.map((p, idx) => ({
          ...p,
          catalog: catalogs[idx] || [],
        }))
        setProviders(enriched)
      }
    }
    load()
    return () => {
      active = false
    }
  }, [])

  return (
    <section className="bg-slate-950/95">
      <div className="mx-auto max-w-6xl px-3 py-6 sm:px-4 sm:py-10">
        <div className="flex items-center gap-3">
          <BackButton />
          <h1 className="font-display text-xl font-semibold text-slate-50 sm:text-2xl">Production Services</h1>
        </div>
        <p className="mt-1 max-w-2xl text-xs text-slate-300 sm:text-sm">
          Browse engineers and producers offering mix & master, custom beats, studio sessions and more.
        </p>
        <div className="mt-6 grid gap-4 sm:mt-8 sm:grid-cols-2 lg:grid-cols-3">
          {providers.map((p) => (
            <Link
              key={p.id}
              to={`/services/${p.id}`}
              className="group rounded-2xl border border-slate-800/70 bg-slate-900/70 p-5 hover:border-emerald-400/60 transition"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-slate-100 group-hover:text-emerald-300 transition">
                    {p.name}
                  </h2>
                  <p className="mt-1 text-[11px] text-slate-400">{p.location}</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800/80 text-[10px] font-bold text-slate-300 overflow-hidden">
                  {p.avatar ? (
                    <img src={p.avatar} alt={p.name} className="h-full w-full object-cover" />
                  ) : (
                    p.name
                      .split(' ')
                      .map((w) => w[0])
                      .slice(0, 2)
                      .join('')
                  )}
                </div>
              </div>
              <p className="mt-3 line-clamp-3 text-[11px] text-slate-400">{p.bio}</p>
              {p.services.length > 0 && (
                <div className="mt-3 space-y-1 text-[11px] text-slate-300">
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                    Services &amp; pricing
                  </div>
                  {p.services.slice(0, 3).map((s) => (
                    <div key={s.name} className="flex items-center justify-between">
                      <span className="truncate">{s.name}</span>
                      {s.price !== undefined && s.price !== null && s.price !== '' && (
                        <span className="ml-2 font-semibold text-emerald-300">
                          ${Number(s.price).toFixed(0)}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-4 flex flex-wrap gap-1.5">
                {p.tags.map((t) => (
                  <span
                    key={t}
                    className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-300"
                  >
                    {t}
                  </span>
                ))}
              </div>
              {p.contact && (
                <SocialIconRow
                  website={p.contact.website}
                  instagram={p.contact.instagram}
                  twitterX={p.contact.twitterX}
                  whatsapp={p.contact.whatsapp}
                  telegram={p.contact.telegram}
                  size="xs"
                />
              )}
              <div className="mt-4 flex items-center justify-between text-[10px] text-slate-400">
                <span>{p.catalog.length} / 3 catalog demos</span>
                <span className="text-emerald-400 group-hover:translate-x-1 transition-transform">
                  View profile
                </span>
              </div>
              {p.catalog[0] && (
                <div className="mt-4 rounded-xl border border-slate-800/70 bg-slate-950/70 p-3">
                  <p className="text-[10px] font-semibold text-slate-300">
                    Sample: <span className="text-slate-100">{p.catalog[0].title}</span>
                  </p>
                  <BeatPlayer src={p.catalog[0].audioUrl} className="mt-2" />
                </div>
              )}
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}

export default Services

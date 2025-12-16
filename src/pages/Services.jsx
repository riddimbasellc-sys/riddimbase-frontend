import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import BackButton from '../components/BackButton'
import SocialIconRow from '../components/SocialIconRow'
import { BeatPlayer } from '../components/BeatPlayer'
import ScrollableGrid from '../components/ScrollableGrid'
import { listProviderProfiles, fetchCatalog } from '../services/supabaseProvidersRepository'
import { supabase } from '../lib/supabaseClient'

export function Services() {
  const [providers, setProviders] = useState([])
  const [viewMode, setViewMode] = useState('grid')
  const [proMap, setProMap] = useState({})
  const [search, setSearch] = useState('')
  const [suggestions, setSuggestions] = useState([])

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
          website: row.website || '',
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

      if (!active) return

      const enriched = baseProviders.map((p, idx) => ({
        ...p,
        catalog: catalogs[idx] || [],
      }))
      setProviders(enriched)

      try {
        const ids = baseProviders.map((p) => p.id)
        const { data: subs } = await supabase
          .from('subscriptions')
          .select('user_id, plan_id, status')
          .in('user_id', ids)
          .in('status', ['active', 'trialing', 'past_due'])

        if (active) {
          const pro = {}
          ;(subs || []).forEach((row) => {
            if (row.plan_id === 'producer-pro') {
              pro[row.user_id] = true
            }
          })
          setProMap(pro)
        }
      } catch {
        if (active) setProMap({})
      }
    }

    load()

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    const term = search.trim()
    if (!term) {
      setSuggestions([])
      return
    }

    let active = true
    ;(async () => {
      try {
        const { data } = await supabase
          .from('provider_profiles')
          .select('id, display_name, tags')
          .or(`display_name.ilike.%${term}%,tags.ilike.%${term}%`)
          .limit(6)
        if (active) setSuggestions(data || [])
      } catch {
        if (active) setSuggestions([])
      }
    })()

    return () => {
      active = false
    }
  }, [search])

  const filteredProviders = providers.filter((p) => {
    const term = search.trim().toLowerCase()
    if (!term) return true
    const name = (p.name || '').toLowerCase()
    const tags = (p.tags || []).join(' ').toLowerCase()
    return name.includes(term) || tags.includes(term)
  })

  return (
    <section className="bg-slate-950/95">
      <div className="mx-auto max-w-6xl px-3 py-6 sm:px-4 sm:py-10">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <BackButton />
            <div>
              <h1 className="font-display text-xl font-semibold text-slate-50 sm:text-2xl">
                Production Services
              </h1>
              <p className="mt-1 max-w-2xl text-xs text-slate-300 sm:text-sm">
                Browse engineers and producers offering mix &amp; master, custom beats, studio
                sessions and more.
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-3">
            <div className="relative w-full max-w-xs">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search services or providers"
                className="w-full rounded-full border border-slate-700/70 bg-slate-950/80 px-3 py-2 text-[12px] text-slate-100 placeholder:text-slate-500"
              />
              {suggestions.length > 0 && (
                <div className="absolute z-20 mt-1 w-full max-h-60 overflow-auto rounded-xl border border-slate-800/80 bg-slate-950/95 text-[11px] text-slate-100 shadow-lg">
                  {suggestions.map((p) => (
                    <Link
                      key={p.id}
                      to={`/services/${p.id}`}
                      onClick={() => {
                        setSuggestions([])
                        setSearch('')
                      }}
                      className="flex w-full flex-col items-start px-3 py-2 text-left hover:bg-slate-900/90"
                    >
                      <span className="w-full truncate font-semibold">
                        {p.display_name || 'Provider'}
                      </span>
                      {p.tags && (
                        <span className="mt-0.5 w-full truncate text-[10px] text-slate-400">
                          {p.tags}
                        </span>
                      )}
                    </Link>
                  ))}
                </div>
              )}
            </div>
            <div className="hidden items-center gap-2 md:flex">
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`flex h-8 w-8 items-center justify-center rounded-full border text-[12px] ${
                  viewMode === 'list'
                    ? 'border-emerald-400 bg-slate-900 text-emerald-300'
                    : 'border-slate-700 bg-slate-900 text-slate-300'
                }`}
                aria-label="List view"
              >
                <span className="flex flex-col gap-[2px]">
                  <span className="h-[2px] w-4 rounded bg-current" />
                  <span className="h-[2px] w-4 rounded bg-current" />
                  <span className="h-[2px] w-4 rounded bg-current" />
                </span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`flex h-8 w-8 items-center justify-center rounded-full border text-[12px] ${
                  viewMode === 'grid'
                    ? 'border-emerald-400 bg-slate-900 text-emerald-300'
                    : 'border-slate-700 bg-slate-900 text-slate-300'
                }`}
                aria-label="Grid view"
              >
                <span className="grid h-3 w-3 grid-cols-2 gap-[2px]">
                  <span className="rounded bg-current" />
                  <span className="rounded bg-current" />
                  <span className="rounded bg-current" />
                  <span className="rounded bg-current" />
                </span>
              </button>
            </div>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-end gap-2 md:hidden">
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={`flex h-8 w-8 items-center justify-center rounded-full border text-[12px] ${
              viewMode === 'list'
                ? 'border-emerald-400 bg-slate-900 text-emerald-300'
                : 'border-slate-700 bg-slate-900 text-slate-300'
            }`}
            aria-label="List view"
          >
            <span className="flex flex-col gap-[2px]">
              <span className="h-[2px] w-4 rounded bg-current" />
              <span className="h-[2px] w-4 rounded bg-current" />
              <span className="h-[2px] w-4 rounded bg-current" />
            </span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('grid')}
            className={`flex h-8 w-8 items-center justify-center rounded-full border text-[12px] ${
              viewMode === 'grid'
                ? 'border-emerald-400 bg-slate-900 text-emerald-300'
                : 'border-slate-700 bg-slate-900 text-slate-300'
            }`}
            aria-label="Grid view"
          >
            <span className="grid h-3 w-3 grid-cols-2 gap-[2px]">
              <span className="rounded bg-current" />
              <span className="rounded bg-current" />
              <span className="rounded bg-current" />
              <span className="rounded bg-current" />
            </span>
          </button>
        </div>
        <div className="mt-6 sm:mt-8">
          <ScrollableGrid
            gridClassName={
              viewMode === 'grid'
                ? 'grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-3'
                : 'space-y-3'
            }
          >
            {filteredProviders.map((p) => {
              const isPro = !!proMap[p.id]

              if (viewMode === 'list') {
                return (
                  <Link
                    key={p.id}
                    to={`/services/${p.id}`}
                    className="flex items-center justify-between gap-4 rounded-2xl border border-slate-800/70 bg-slate-900/70 px-4 py-3 transition hover:border-emerald-400/60"
                  >
                    <div className="min-w-0">
                      <h2 className="truncate text-sm font-semibold text-slate-100">{p.name}</h2>
                      <p className="mt-1 truncate text-[11px] text-slate-400">
                        {p.location || p.bio}
                      </p>
                    </div>
                    <div className="flex flex-shrink-0 items-center gap-3">
                      {isPro && (
                        <span className="hidden items-center gap-1 rounded-full border border-sky-400/70 bg-sky-500/15 px-2 py-[1px] text-[9px] font-semibold text-sky-200 sm:inline-flex">
                          <span>バ"</span>
                          <span>Verified Pro</span>
                        </span>
                      )}
                      {p.contact && (
                        <div className="hidden md:block">
                          <SocialIconRow
                            website={p.contact.website}
                            instagram={p.contact.instagram}
                            twitterX={p.contact.twitterX}
                            whatsapp={p.contact.whatsapp}
                            telegram={p.contact.telegram}
                            size="xs"
                          />
                        </div>
                      )}
                      <span className="inline-block rounded-full bg-emerald-500/10 px-3 py-1 text-[10px] font-medium text-emerald-300">
                        View profile
                      </span>
                    </div>
                  </Link>
                )
              }

              return (
                <Link
                  key={p.id}
                  to={`/services/${p.id}`}
                  className="group rounded-2xl border border-slate-800/70 bg-slate-900/70 p-5 transition hover:border-emerald-400/60"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="text-sm font-semibold text-slate-100 transition group-hover:text-emerald-300">
                        {p.name}
                      </h2>
                      <p className="mt-1 text-[11px] text-slate-400">{p.location}</p>
                    </div>
                    <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-slate-800/80 text-[10px] font-bold text-slate-300">
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
                  {isPro && (
                    <div className="mt-2">
                      <span className="inline-flex items-center gap-1 rounded-full border border-sky-400/70 bg-sky-500/15 px-2 py-[1px] text-[9px] font-semibold text-sky-200">
                        <span>バ"</span>
                        <span>Verified Pro</span>
                      </span>
                    </div>
                  )}
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
                    <div className="mt-3">
                      <SocialIconRow
                        website={p.contact.website}
                        instagram={p.contact.instagram}
                        twitterX={p.contact.twitterX}
                        whatsapp={p.contact.whatsapp}
                        telegram={p.contact.telegram}
                        size="xs"
                      />
                    </div>
                  )}
                  <div className="mt-4 flex items-center justify-between text-[10px] text-slate-400">
                    <span>{p.catalog.length} / 3 catalog demos</span>
                    <span className="text-emerald-400 transition-transform group-hover:translate-x-1">
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
              )
            })}
          </ScrollableGrid>
        </div>
      </div>
    </section>
  )
}

export default Services

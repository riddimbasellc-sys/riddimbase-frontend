import { useEffect, useState } from 'react'
import { useBeats } from '../hooks/useBeats'
import BackButton from '../components/BackButton'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import SocialIconRow from '../components/SocialIconRow'
import ScrollableGrid from '../components/ScrollableGrid'

export function Producers() {
  const { beats } = useBeats()
  const [profiles, setProfiles] = useState({})
  const [proMap, setProMap] = useState({})
  const [producerList, setProducerList] = useState([]) // [userId, beatCount]
  const [viewMode, setViewMode] = useState('grid')
  const [search, setSearch] = useState('')
  const [suggestions, setSuggestions] = useState([])

  useEffect(() => {
    let active = true

    ;(async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, display_name, website, instagram, twitter_x, youtube, role')

        if (!error && data && active) {
          const nextProfiles = {}
          const producerIds = []
          for (const row of data) {
            const role = (row.role || '').toLowerCase()
            const tokens = role.split(/[+\s,\/]+/).filter(Boolean)
            const isProducer =
              tokens.includes('producer') ||
              tokens.includes('beatmaker') ||
              tokens.includes('beat')
            if (!isProducer) continue
            nextProfiles[row.id] = {
              displayName: row.display_name || row.id,
              website: row.website || '',
              instagram: row.instagram || '',
              twitterX: row.twitter_x || '',
              youtube: row.youtube || '',
            }
            producerIds.push(row.id)
          }

          // Compute beat counts for each producer (including those with zero beats)
          const beatCounts = {}
          for (const b of beats) {
            if (!b.userId) continue
            beatCounts[b.userId] = (beatCounts[b.userId] || 0) + 1
          }

          const sorted = producerIds
            .map((id) => [id, beatCounts[id] || 0])
            .sort((a, b) => b[1] - a[1])

          if (active) {
            setProfiles(nextProfiles)
            setProducerList(sorted)
          }
        } else if (active) {
          setProfiles({})
          setProducerList([])
        }
      } catch {
        // ignore
      }

      try {
        const producerIds = producerList.map(([id]) => id)
        if (!producerIds.length) {
          if (active) setProMap({})
          return
        }

        const { data: subs } = await supabase
          .from('subscriptions')
          .select('user_id, plan_id, status')
          .in('user_id', producerIds)
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
    })()

            if (active) {
              setProfiles({})
              setProducerList([])
              setProMap({})
            }
      active = false
    }
  }, [beats])

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
          .from('profiles')
          .select('id, display_name, role, email')
          .or(`display_name.ilike.%${term}%,email.ilike.%${term}%`)
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

  const filteredList = producerList.filter(([pid]) => {
    const term = search.trim().toLowerCase()
    if (!term) return true
    const prof = profiles[pid]
    const beatSample = beats.find((b) => b.userId === pid)
    const name = (prof?.displayName || beatSample?.producer || pid || '').toLowerCase()
    return name.includes(term)
  })

  return (
    <section className="bg-slate-950/95">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <BackButton />
            <div>
              <h1 className="font-display text-2xl font-semibold text-slate-50">Producers</h1>
              <p className="mt-1 text-sm text-slate-300">
                Browse active producers and explore their catalogs.
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-3">
            <div className="relative w-full max-w-xs">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or email"
                className="w-full rounded-full border border-slate-700/70 bg-slate-950/80 px-3 py-2 text-[12px] text-slate-100 placeholder:text-slate-500"
              />
              {suggestions.length > 0 && (
                <div className="absolute z-20 mt-1 w-full max-h-60 overflow-auto rounded-xl border border-slate-800/80 bg-slate-950/95 text-[11px] text-slate-100 shadow-lg">
                  {suggestions.map((p) => (
                    <Link
                      key={p.id}
                      to={`/producer/${p.id}`}
                      onClick={() => {
                        setSuggestions([])
                        setSearch('')
                      }}
                      className="flex w-full flex-col items-start px-3 py-2 text-left hover:bg-slate-900/90"
                    >
                      <span className="w-full truncate font-semibold">
                        {p.display_name || p.email || 'Producer'}
                      </span>
                      {p.role && (
                        <span className="mt-0.5 w-full truncate text-[10px] text-slate-400">
                          {p.role}
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
        <div className="mt-6">
          <ScrollableGrid
            gridClassName={
              viewMode === 'grid'
                ? 'grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4'
                : 'space-y-3'
            }
          >
            {filteredList.map(([pid, count]) => {
              const prof = profiles[pid]
              const beatSample = beats.find((b) => b.userId === pid)
              const fallbackName = beatSample?.producer || pid
              const displayName = prof?.displayName || fallbackName
              const isPro = !!proMap[pid]

              if (viewMode === 'list') {
                return (
                  <Link
                    key={pid}
                    to={`/producer/${pid}`}
                    className="flex items-center justify-between gap-4 rounded-2xl border border-slate-800/80 bg-slate-900/70 px-4 py-3 hover:border-emerald-400/70 transition"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-100 truncate">
                        {displayName}
                      </p>
                      <p className="mt-1 text-[11px] text-slate-400">
                        {count} beat{count !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <div className="flex flex-shrink-0 items-center gap-3">
                      {isPro && (
                        <span className="hidden sm:inline-flex items-center gap-1 rounded-full border border-sky-400/70 bg-sky-500/15 px-2 py-[1px] text-[9px] font-semibold text-sky-200">
                          <span>バ"</span>
                          <span>Verified Pro</span>
                        </span>
                      )}
                      {prof && (
                        <div className="hidden md:block">
                          <SocialIconRow
                            website={prof.website}
                            instagram={prof.instagram}
                            twitterX={prof.twitterX}
                            youtube={prof.youtube}
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
                  key={pid}
                  to={`/producer/${pid}`}
                  className="rounded-2xl border border-slate-800/80 bg-slate-900/70 p-4 hover:border-emerald-400/70 transition"
                >
                  <div className="mb-3 h-14 w-14 rounded-xl bg-gradient-to-br from-emerald-500 via-emerald-400 to-orange-500" />
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-slate-100 truncate">
                      {displayName}
                    </p>
                    {isPro && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-sky-400/70 bg-sky-500/15 px-2 py-[1px] text-[9px] font-semibold text-sky-200">
                        <span>バ"</span>
                        <span>Verified Pro</span>
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-[11px] text-slate-400">
                    {count} beat{count !== 1 ? 's' : ''}
                  </p>
                  {prof && (
                    <SocialIconRow
                      website={prof.website}
                      instagram={prof.instagram}
                      twitterX={prof.twitterX}
                      youtube={prof.youtube}
                      size="xs"
                    />
                  )}
                  <span className="mt-2 inline-block rounded-full bg-emerald-500/10 px-2 py-1 text-[10px] font-medium text-emerald-300">
                    View Profile
                  </span>
                </Link>
              )
            })}
            {filteredList.length === 0 && (
              <p className="text-xs text-slate-500">No producers yet.</p>
            )}
          </ScrollableGrid>
        </div>
      </div>
    </section>
  )
}

export default Producers

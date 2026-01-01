import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import BackButton from '../components/BackButton'
import { BeatCard } from '../components/BeatCard'
import { slugify } from '../utils/slugify'
import { fetchBeatsByProducerId } from '../services/beatsRepository'
import { getProducerProfile } from '../services/producerProfileService'
import { followerCount, isFollowing, toggleFollow } from '../services/socialService'
import useSupabaseUser from '../hooks/useSupabaseUser'
import { getSubscription, isProducerProPlanId } from '../services/subscriptionService'
import { supabase } from '../lib/supabaseClient'
import YouTubePreview from '../components/YouTubePreview'
import ProviderReviews from '../components/ProviderReviews'

const PAGE_SIZE = 24

export default function ProducerStorefront() {
  const { producerId: producerIdParam } = useParams()
  const navigate = useNavigate()
  const uuidRegex =
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/
  const [producerId, setProducerId] = useState(() => {
    const raw = producerIdParam ? String(producerIdParam) : ''
    const candidate = raw.substring(0, 36)
    return uuidRegex.test(candidate) ? candidate : null
  })

  const { user } = useSupabaseUser()
  const [profile, setProfile] = useState(null)
  const [subscription, setSubscription] = useState(null)
  const [beats, setBeats] = useState([])
  const [beatsLoading, setBeatsLoading] = useState(true)
  const [beatsPage, setBeatsPage] = useState(1)
  const [beatsHasMore, setBeatsHasMore] = useState(false)
  const [followers, setFollowers] = useState(0)
  const [following, setFollowing] = useState(false)
  const [authPrompt, setAuthPrompt] = useState('')
  const [activeTab, setActiveTab] = useState('beats')

  // Resolve slug-style producer URLs to an ID (same logic as ProducerProfile)
  useEffect(() => {
    let active = true
    ;(async () => {
      if (producerId || !producerIdParam) return
      const raw = decodeURIComponent(String(producerIdParam))
      const candidate = raw.substring(0, 36)
      if (uuidRegex.test(candidate)) {
        if (active) setProducerId(candidate)
        return
      }
      try {
        const targetSlug = slugify(raw || '')
        const nameGuess = String(raw || '')
          .replace(/[-_]+/g, ' ')
          .trim()

        const { data: profs, error: profErr } = await supabase
          .from('profiles')
          .select('id, display_name')
          .ilike('display_name', nameGuess)
          .limit(10)
        if (!profErr && Array.isArray(profs) && profs.length) {
          const match = profs.find((row) => slugify(row.display_name || row.id) === targetSlug)
          if (match && active) {
            setProducerId(match.id)
            return
          }
        }

        const { data: beatRows, error: beatErr } = await supabase
          .from('beats')
          .select('user_id, producer')
          .not('user_id', 'is', null)
          .ilike('producer', nameGuess)
          .order('created_at', { ascending: false })
          .limit(200)
        if (!beatErr && Array.isArray(beatRows) && beatRows.length) {
          const match = beatRows.find((row) => slugify(row.producer || '') === targetSlug)
          if (match?.user_id && active) {
            setProducerId(match.user_id)
          }
        }
      } catch {
        // ignore
      }
    })()
    return () => {
      active = false
    }
  }, [producerId, producerIdParam])

  // Load profile + subscription for hero and badges
  useEffect(() => {
    let active = true
    ;(async () => {
      if (!producerId) {
        if (active) {
          setProfile(null)
          setSubscription(null)
        }
        return
      }
      try {
        const [prof, sub] = await Promise.all([
          getProducerProfile(producerId),
          getSubscription(producerId),
        ])
        if (!active) return
        setProfile(prof || null)
        setSubscription(sub || null)
      } catch {
        if (active) {
          setProfile(null)
          setSubscription(null)
        }
      }
    })()
    return () => {
      active = false
    }
  }, [producerId])

  // Followers + follow state
  useEffect(() => {
    ;(async () => {
      if (producerId) setFollowers(await followerCount(producerId))
      if (producerId && user && user.id !== producerId) {
        try {
          const isF = await isFollowing({ followerId: user.id, producerId })
          setFollowing(isF)
        } catch {}
      } else {
        setFollowing(false)
      }
    })()
  }, [producerId, user])

  // Beats for Beats tab
  useEffect(() => {
    let active = true
    ;(async () => {
      if (!producerId) {
        if (active) {
          setBeats([])
          setBeatsLoading(false)
        }
        return
      }
      setBeatsLoading(true)
      try {
        let list = await fetchBeatsByProducerId(producerId, {
          limit: PAGE_SIZE,
          offset: 0,
        })
        if (!active) return
        if (!Array.isArray(list)) list = []
        setBeats(list)
        setBeatsHasMore(list.length === PAGE_SIZE)
        setBeatsPage(1)
      } catch {
        if (!active) return
        setBeats([])
        setBeatsHasMore(false)
      } finally {
        if (active) setBeatsLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [producerId])

  const handleLoadMoreBeats = async () => {
    if (!producerId || !beatsHasMore) return
    try {
      const nextOffset = beats.length
      let more = await fetchBeatsByProducerId(producerId, {
        limit: PAGE_SIZE,
        offset: nextOffset,
      })
      if (!Array.isArray(more) || more.length === 0) {
        setBeatsHasMore(false)
        return
      }
      setBeats((prev) => [...prev, ...more])
      setBeatsPage((p) => p + 1)
      if (more.length < PAGE_SIZE) setBeatsHasMore(false)
    } catch {
      setBeatsHasMore(false)
    }
  }

  const youtubeUrl = profile?.youtubeUrl || null
  const isOwnProfile = user && producerId && user.id === producerId
  const showProBadge = !!(subscription && isProducerProPlanId(subscription.planId))

  const displayName =
    profile?.displayName ||
    (isOwnProfile
      ? user.user_metadata?.display_name || user.email?.split('@')[0] || 'Producer'
      : 'Producer')

  const location = profile?.location || ''
  const primaryGenre = profile?.primaryGenre || ''
  const tags = (profile?.tags || '')
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)

  const normalizeUrl = (url) => {
    if (!url) return null
    const trimmed = url.trim()
    if (!trimmed) return null
    if (/^https?:\/\//i.test(trimmed)) return trimmed
    return `https://${trimmed}`
  }

  const handleFollow = async () => {
    if (!user) {
      setAuthPrompt('Log in or create an account to follow producers.')
      return
    }
    if (!producerId || user.id === producerId) return
    try {
      const optimisticFollowers = following ? followers - 1 : followers + 1
      setFollowing(!following)
      setFollowers(Math.max(0, optimisticFollowers))
      const res = await toggleFollow({ followerId: user.id, producerId })
      if (res.following !== !following) {
        setFollowing(res.following)
        setFollowers(await followerCount(producerId))
      }
    } catch {
      setFollowing(false)
      if (producerId) setFollowers(await followerCount(producerId))
    }
  }

  const handleMessage = () => {
    if (!user) {
      setAuthPrompt('Log in or create an account to start a chat with this producer.')
      return
    }
    if (!producerId || user.id === producerId) return
    navigate(`/producer/inbox?to=${encodeURIComponent(producerId)}`)
  }

  const stats = useMemo(() => {
    const totalBeats = beats.length
    const avgBpm =
      totalBeats === 0
        ? 0
        : beats.reduce((sum, b) => sum + (Number(b.bpm) || 0), 0) / totalBeats
    const totalPlays = beats.reduce(
      (sum, b) => sum + (Number(b.play_count || b.playCount || 0) || 0),
      0,
    )
    const totalSales = beats.reduce(
      (sum, b) => sum + (Number(b.sales_count || b.salesCount || 0) || 0),
      0,
    )
    return {
      totalBeats,
      totalPlays,
      totalSales,
      avgBpm,
      rating: profile?.rating || null,
    }
  }, [beats, profile])

  const ratingLabel = stats.rating ? stats.rating.toFixed(1) : 'New'

  return (
    <section className="bg-slate-950/95 min-h-screen">
      <div className="mx-auto max-w-6xl px-3 pb-10 pt-4 sm:px-4 sm:pt-6">
        <div className="flex items-center gap-3">
          <BackButton />
          <h1 className="font-display text-xl font-semibold text-slate-50 sm:text-2xl">
            Producer Storefront
          </h1>
        </div>

        {/* Hero header */}
        <div className="mt-4 overflow-hidden rounded-3xl border border-slate-800/80 bg-slate-900/80 shadow-rb-gloss-panel">
          <div className="relative h-40 w-full bg-gradient-to-r from-red-500/40 via-slate-900 to-emerald-500/30 sm:h-52">
            {profile?.bannerUrl && (
              <img
                src={profile.bannerUrl}
                alt="Producer banner"
                className="h-full w-full object-cover opacity-80"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/10 to-transparent" />
          </div>
          <div className="relative px-4 pb-4 pt-0 sm:px-6 sm:pb-6">
            <div className="-mt-12 flex flex-col gap-4 sm:-mt-16 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex items-end gap-4">
                <div className="h-20 w-20 overflow-hidden rounded-2xl border-2 border-slate-900/80 bg-gradient-to-br from-emerald-500 via-emerald-400 to-orange-500 sm:h-24 sm:w-24">
                  {profile?.avatarUrl && (
                    <img
                      src={profile.avatarUrl}
                      alt={displayName}
                      className="h-full w-full object-cover"
                    />
                  )}
                </div>
                <div className="pb-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-semibold text-slate-50 sm:text-xl">
                      {displayName}
                    </h2>
                    {showProBadge && (
                      <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-300">
                        Pro
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                    {location && <span>{location}</span>}
                    {primaryGenre && (
                      <span className="rounded-full bg-slate-900/80 px-2 py-0.5 text-[10px] text-slate-200">
                        {primaryGenre}
                      </span>
                    )}
                    {tags.map((t) => (
                      <span
                        key={t}
                        className="rounded-full bg-slate-900/80 px-2 py-0.5 text-[10px] text-slate-300"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                    <span>{followers} followers</span>
                    {authPrompt && (
                      <span className="text-[10px] text-rose-300">{authPrompt}</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 pb-1">
                <button
                  type="button"
                  onClick={handleFollow}
                  className="rounded-full border border-emerald-400/70 px-4 py-1.5 text-[11px] font-semibold text-emerald-300 hover:bg-emerald-500/10"
                >
                  {following ? 'Following' : 'Follow'}
                </button>
                <button
                  type="button"
                  onClick={handleMessage}
                  className="rounded-full bg-emerald-500 px-4 py-1.5 text-[11px] font-semibold text-slate-950 hover:bg-emerald-400"
                >
                  Message Producer
                </button>
                <div className="ml-0 flex items-center gap-2 sm:ml-2">
                  {profile?.website && (
                    <a
                      href={normalizeUrl(profile.website)}
                      target="_blank"
                      rel="noreferrer"
                      className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-700/80 bg-slate-900/80 text-[11px] text-slate-200 hover:border-emerald-400/70"
                    >
                      <span className="sr-only">Website</span>
                      <span>🌐</span>
                    </a>
                  )}
                  {profile?.instagram && (
                    <a
                      href={normalizeUrl(
                        profile.instagram.startsWith('@')
                          ? `https://instagram.com/${profile.instagram.slice(1)}`
                          : profile.instagram,
                      )}
                      target="_blank"
                      rel="noreferrer"
                      className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-700/80 bg-slate-900/80 text-[11px] text-slate-200 hover:border-emerald-400/70"
                    >
                      <span className="sr-only">Instagram</span>
                      <span>📸</span>
                    </a>
                  )}
                  {profile?.tiktok && (
                    <a
                      href={normalizeUrl(profile.tiktok)}
                      target="_blank"
                      rel="noreferrer"
                      className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-700/80 bg-slate-900/80 text-[11px] text-slate-200 hover:border-emerald-400/70"
                    >
                      <span className="sr-only">TikTok</span>
                      <span>🎵</span>
                    </a>
                  )}
                  {youtubeUrl && (
                    <a
                      href={normalizeUrl(youtubeUrl)}
                      target="_blank"
                      rel="noreferrer"
                      className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-700/80 bg-slate-900/80 text-[11px] text-slate-200 hover:border-emerald-400/70"
                    >
                      <span className="sr-only">YouTube</span>
                      <span>▶</span>
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats bar */}
        <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <StatCard label="Total Beats" value={stats.totalBeats} />
          <StatCard label="Total Plays" value={stats.totalPlays} />
          <StatCard label="Total Sales" value={stats.totalSales} />
          <StatCard label="Average BPM" value={stats.totalBeats ? stats.avgBpm.toFixed(1) : '—'} />
          <StatCard label="Rating" value={ratingLabel} />
        </div>

        {/* Tab navigation */}
        <div className="sticky top-0 z-10 mt-5 bg-slate-950/95 pb-1 pt-3">
          <nav className="flex flex-wrap gap-1 rounded-full border border-slate-800/80 bg-slate-900/80 p-1 text-[11px]">
            <TabButton id="beats" activeTab={activeTab} onChange={setActiveTab}>
              Beats
            </TabButton>
            <TabButton id="services" activeTab={activeTab} onChange={setActiveTab}>
              Services
            </TabButton>
            <TabButton id="licenses" activeTab={activeTab} onChange={setActiveTab}>
              Licenses
            </TabButton>
            <TabButton id="about" activeTab={activeTab} onChange={setActiveTab}>
              About
            </TabButton>
            <TabButton id="reviews" activeTab={activeTab} onChange={setActiveTab}>
              Reviews
            </TabButton>
          </nav>
        </div>

        {/* Tab content */}
        <div className="mt-4">
          {activeTab === 'beats' && (
            <BeatsTab
              beats={beats}
              loading={beatsLoading}
              hasMore={beatsHasMore}
              onLoadMore={handleLoadMoreBeats}
            />
          )}
          {activeTab === 'services' && <ServicesTab producerId={producerId} />}
          {activeTab === 'licenses' && <LicensesTab producerId={producerId} />}
          {activeTab === 'about' && <AboutTab profile={profile} youtubeUrl={youtubeUrl} />}
          {activeTab === 'reviews' && producerId && (
            <ReviewsTab producerId={producerId} />
          )}
        </div>
      </div>
    </section>
  )
}

function StatCard({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-800/80 bg-slate-900/80 px-4 py-3 shadow-rb-gloss-panel">
      <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold text-slate-50">{value}</p>
    </div>
  )
}

function TabButton({ id, activeTab, onChange, children }) {
  const isActive = activeTab === id
  return (
    <button
      type="button"
      onClick={() => onChange(id)}
      className={`flex-1 rounded-full px-3 py-1.5 text-center font-medium transition ${
        isActive
          ? 'bg-red-500 text-slate-950 shadow-[0_0_25px_rgba(239,68,68,0.6)]'
          : 'bg-transparent text-slate-300 hover:bg-slate-800/80'
      }`}
    >
      {children}
    </button>
  )
}

function BeatsTab({ beats, loading, hasMore, onLoadMore }) {
  if (loading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-40 rounded-2xl border border-slate-800/80 bg-slate-900/80 rb-skeleton" />
        ))}
      </div>
    )
  }

  if (!loading && beats.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-800/80 bg-slate-900/80 p-6 text-center text-sm text-slate-400">
        No beats found.{' '}
        <Link to="/beats" className="underline">
          Browse marketplace
        </Link>
        .
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-slate-800/80 bg-slate-900/80 p-3 shadow-rb-gloss-panel">
      <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {beats.map((b) => (
            <BeatCard
              key={b.id}
              id={b.id}
              title={b.title}
              producer={b.producer || 'Unknown'}
              collaborator={b.collaborator || null}
              userId={b.user_id || b.userId}
              genre={b.genre}
              bpm={b.bpm}
              musicalKey={b.key}
              price={b.price}
              coverUrl={b.cover_url || b.coverUrl}
              audioUrl={b.audio_url || b.audioUrl}
              description={b.description}
              licensePrices={b.license_prices || b.licensePrices}
              freeDownload={!!(b.free_download || b.freeDownload)}
              square
              compact
            />
          ))}
        </div>
        {hasMore && (
          <div className="flex justify-center pb-2 pt-1">
            <button
              type="button"
              onClick={onLoadMore}
              className="rounded-full bg-slate-800 px-4 py-1.5 text-[11px] font-semibold text-slate-100 hover:bg-slate-700"
            >
              Load more beats
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function ServicesTab({ producerId }) {
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let active = true
    ;(async () => {
      if (!producerId) return
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from('provider_profiles')
          .select('services, display_name')
          .eq('id', producerId)
          .maybeSingle()
        if (!active) return
        if (error || !data) {
          setServices([])
          return
        }
        let list = []
        if (Array.isArray(data.services)) {
          list = data.services
        } else if (typeof data.services === 'string') {
          try {
            list = JSON.parse(data.services) || []
          } catch {
            list = []
          }
        }
        setServices(Array.isArray(list) ? list : [])
      } catch {
        if (active) setServices([])
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [producerId])

  if (!producerId) {
    return null
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-800/80 bg-slate-900/80 p-5 text-[12px] text-slate-300">
        Loading services…
      </div>
    )
  }

  if (!services.length) {
    return (
      <div className="rounded-2xl border border-slate-800/80 bg-slate-900/80 p-5 text-[12px] text-slate-300">
        This producer has not listed any custom services yet.
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-slate-800/80 bg-slate-900/80 p-5 shadow-rb-gloss-panel">
      <h2 className="text-sm font-semibold text-slate-100">Services</h2>
      <p className="mt-1 text-[11px] text-slate-400">
        Mixing, mastering, custom beats and more.
      </p>
      <ul className="mt-4 divide-y divide-slate-800/80 text-[12px] text-slate-200">
        {services.map((s) => (
          <li key={s.name} className="flex items-center justify-between py-2">
            <div>
              <p className="font-medium text-slate-100">{s.name}</p>
              {s.description && (
                <p className="text-[11px] text-slate-400">{s.description}</p>
              )}
              {s.delivery && (
                <p className="mt-0.5 text-[10px] text-slate-500">
                  Delivery: {s.delivery}
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="text-[12px] font-semibold text-emerald-300">
                ${Number(s.price || 0).toFixed(2)}
              </p>
              <button
                type="button"
                className="mt-1 rounded-full bg-emerald-500 px-3 py-1 text-[10px] font-semibold text-slate-950 hover:bg-emerald-400"
              >
                Order Service
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

function LicensesTab({ producerId }) {
  const [licenses, setLicenses] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let active = true
    ;(async () => {
      if (!producerId) return
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from('licenses')
          .select('*')
          .eq('producer_id', producerId)
          .order('price', { ascending: true })
        if (!active) return
        if (error || !Array.isArray(data)) {
          setLicenses([])
        } else {
          setLicenses(data)
        }
      } catch {
        if (active) setLicenses([])
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [producerId])

  if (!producerId) return null

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-800/80 bg-slate-900/80 p-5 text-[12px] text-slate-300">
        Loading licenses…
      </div>
    )
  }

  if (!licenses.length) {
    return (
      <div className="rounded-2xl border border-slate-800/80 bg-slate-900/80 p-5 text-[12px] text-slate-300">
        This producer has not published any custom licenses yet.
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {licenses.map((lic) => (
        <div
          key={lic.id}
          className="rounded-2xl border border-slate-800/80 bg-slate-900/80 p-4 shadow-rb-gloss-panel"
        >
          <div className="flex items-baseline justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-100">{lic.name}</h3>
              <p className="mt-0.5 text-[11px] text-slate-400">
                {lic.is_exclusive ? 'Exclusive rights' : 'Non-exclusive lease'}
              </p>
            </div>
            <p className="text-sm font-semibold text-emerald-300">
              ${Number(lic.price || 0).toFixed(2)}
            </p>
          </div>
          <ul className="mt-3 space-y-1.5 text-[11px] text-slate-300">
            {typeof lic.streams_allowed === 'number' && (
              <li>Streams allowed: {lic.streams_allowed.toLocaleString()}</li>
            )}
            {typeof lic.downloads_allowed === 'number' && (
              <li>Downloads allowed: {lic.downloads_allowed.toLocaleString()}</li>
            )}
            <li>
              Distribution: {lic.distribution_allowed ? 'Allowed' : 'Not allowed'}
            </li>
            <li>Radio: {lic.radio_allowed ? 'Allowed' : 'Not allowed'}</li>
            <li>
              Music video: {lic.music_video_allowed ? 'Allowed' : 'Not allowed'}
            </li>
            <li>Stems included: {lic.stems_included ? 'Yes' : 'No'}</li>
            <li>
              Ownership transfer: {lic.ownership_transfer ? 'Yes' : 'No'}
            </li>
            {lic.notes && <li className="mt-1 text-slate-400">{lic.notes}</li>}
          </ul>
        </div>
      ))}
    </div>
  )
}

function AboutTab({ profile, youtubeUrl }) {
  const bioText =
    profile?.bio?.trim()?.length
      ? profile.bio
      : 'This producer has not added a bio yet.'
  const influences = profile?.influences || ''
  const equipment = profile?.equipment || ''
  const achievements = profile?.achievements || ''

  return (
    <div className="grid gap-6 md:grid-cols-[1.2fr,1fr]">
      <div className="space-y-4">
        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/80 p-4">
          <h2 className="text-sm font-semibold text-slate-100">About</h2>
          <p className="mt-2 text-[13px] leading-relaxed text-slate-300">{bioText}</p>
        </div>
        {influences && (
          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/80 p-4">
            <h3 className="text-sm font-semibold text-slate-100">Influences</h3>
            <p className="mt-2 text-[13px] leading-relaxed text-slate-300">
              {influences}
            </p>
          </div>
        )}
        {equipment && (
          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/80 p-4">
            <h3 className="text-sm font-semibold text-slate-100">Equipment</h3>
            <p className="mt-2 text-[13px] leading-relaxed text-slate-300">
              {equipment}
            </p>
          </div>
        )}
        {achievements && (
          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/80 p-4">
            <h3 className="text-sm font-semibold text-slate-100">Achievements</h3>
            <p className="mt-2 text-[13px] leading-relaxed text-slate-300">
              {achievements}
            </p>
          </div>
        )}
      </div>
      <div className="space-y-4">
        {youtubeUrl && (
          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/80 p-4">
            <h3 className="text-sm font-semibold text-slate-100">Featured video</h3>
            <p className="mt-1 text-[11px] text-slate-400">
              Watch a glimpse into this producer&apos;s sound.
            </p>
            <div className="mt-3">
              <YouTubePreview youtubeUrl={youtubeUrl} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function ReviewsTab({ producerId }) {
  return (
    <div className="rounded-2xl border border-slate-800/80 bg-slate-900/80 p-4 shadow-rb-gloss-panel">
      <h2 className="text-sm font-semibold text-slate-100">Buyer Reviews</h2>
      <p className="mt-1 text-[11px] text-slate-400">
        Feedback from artists who&apos;ve purchased beats or services from this producer.
      </p>
      <div className="mt-4">
        <ProviderReviews providerId={producerId} />
      </div>
    </div>
  )
}

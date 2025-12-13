import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useBeats } from '../hooks/useBeats'
import { topBeatsByPlays } from '../services/analyticsService'
import { listPlans } from '../services/plansRepository'
import { BeatCard } from '../components/BeatCard'
import { useSiteSettings } from '../context/SiteSettingsContext'
import { supabase } from '../lib/supabaseClient'
import BeatCarousel from '../components/BeatCarousel'

export default function LandingPage() {
  const { beats } = useBeats()
  const navigate = useNavigate()
  const [heroSearch, setHeroSearch] = useState('')
  const [searchSuggestions, setSearchSuggestions] = useState([])
  const [searchOpen, setSearchOpen] = useState(false)
  const [plans, setPlans] = useState([])
  const { settings } = useSiteSettings()
  const heroBanners = settings?.hero?.banners || []
  const heroBackgrounds = heroBanners
    .filter((b) => b.backgroundUrl)
    .map((b) => b.backgroundUrl)
  const [heroBgIndex, setHeroBgIndex] = useState(0)

  const testimonials = [
    {
      role: 'Dancehall Producer',
      name: 'Jahmel Beats • Kingston, Jamaica',
      quote:
        '“RiddimBase finally feels like a real home for Caribbean riddims. My beats are getting plays from artists in London and New York I never knew before.”',
    },
    {
      role: 'Afro-Caribbean Artist',
      name: 'Naila Vibes • Port of Spain, Trinidad',
      quote:
        '“Licensing a beat here is as easy as adding it to cart. Contracts, stems and delivery are instant, so I can focus on writing and recording.”',
    },
    {
      role: 'Beat Maker & Mix Engineer',
      name: 'Kruz Fyah • Montego Bay, Jamaica',
      quote:
        '“Between the jobs board and boosted beats, most of my online clients now come straight through RiddimBase.”',
    },
  ]

  const trendingBeats = useMemo(() => {
    if (!beats.length) return []
    const ids = beats.map((b) => b.id)
    const ranked = topBeatsByPlays(ids, 10)
    const byId = new Map(beats.map((b) => [b.id, b]))
    const mapped = ranked.map((r) => byId.get(r.id)).filter(Boolean)
    if (mapped.length) return mapped
    return beats.slice(0, 10)
  }, [beats])

  const handleScrollToBeats = () => {
    const el = document.getElementById('trending-beats')
    if (el) el.scrollIntoView({ behavior: 'smooth' })
  }

  const handleHeroSearch = (event) => {
    event.preventDefault()
    const query = heroSearch.trim()
    const target = query ? `/beats?search=${encodeURIComponent(query)}` : '/beats'
    navigate(target)
    setSearchOpen(false)
  }

  useEffect(() => {
    ;(async () => {
      try {
        const loaded = await listPlans()
        setPlans(loaded || [])
      } catch {
        setPlans([])
      }
    })()
  }, [])

  useEffect(() => {
    if (heroBackgrounds.length <= 1) return
    setHeroBgIndex(0)
    const id = setInterval(() => {
      setHeroBgIndex((idx) => (idx + 1) % heroBackgrounds.length)
    }, 10000)
    return () => clearInterval(id)
  }, [heroBackgrounds.length])

  useEffect(() => {
    const term = heroSearch.trim()
    if (!term) {
      setSearchSuggestions([])
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const { data } = await supabase
          .from('beats')
          .select('id, title, producer, genre')
          .or(`title.ilike.%${term}%,producer.ilike.%${term}%`)
          .order('created_at', { ascending: false })
          .limit(6)
        if (!cancelled) setSearchSuggestions(data || [])
      } catch {
        if (!cancelled) setSearchSuggestions([])
      }
    })()
    return () => {
      cancelled = true
    }
  }, [heroSearch])

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#050505] via-[#05070a] to-black text-slate-100">
      <main className="mx-auto max-w-6xl px-4">
        {/* HERO */}
        <section className="relative py-10 md:py-14 lg:py-18 overflow-hidden">
          {heroBackgrounds.length > 0 && (
            <div className="absolute inset-0 -z-10">
              {heroBackgrounds.map((url, idx) => (
                <div
                  key={url + idx}
                  className={`absolute inset-0 transition-opacity duration-[1200ms] ${
                    idx === heroBgIndex ? 'opacity-100' : 'opacity-0'
                  }`}
                >
                  <img
                    src={url}
                    alt="Hero background"
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/75 to-black/95" />
                </div>
              ))}
            </div>
          )}

          <div className="relative mx-auto flex max-w-4xl flex-col items-center gap-6 text-center">
            <div className="flex w-full flex-col items-center justify-center space-y-6">
              <div>
                <h1 className="text-balance text-3xl font-black tracking-tight text-white sm:text-4xl lg:text-[2.9rem]">
                  The <span className="text-red-500">Home of Caribbean</span> Beats.
                </h1>
                <p className="mt-3 max-w-2xl mx-auto text-sm text-slate-300 sm:text-[15px]">
                  Discover, sell and license Dancehall, Reggae, Trap Dancehall, Afro-Caribbean and more on a
                  platform built for Caribbean creators, with global reach.
                </p>

                {/* Hero search bar with live suggestions */}
                <div className="relative mt-4 mx-auto w-full max-w-md">
                  <form
                    onSubmit={handleHeroSearch}
                    className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs text-slate-100 backdrop-blur-sm"
                  >
                    <input
                      type="text"
                      value={heroSearch}
                      onChange={(e) => {
                        setHeroSearch(e.target.value)
                        setSearchOpen(true)
                      }}
                      onFocus={() => {
                        if (searchSuggestions.length) setSearchOpen(true)
                      }}
                      placeholder="Search beats by title or producer"
                      className="flex-1 bg-transparent text-xs text-slate-100 placeholder:text-slate-500 outline-none"
                    />
                    <button
                      type="submit"
                      className="rounded-full bg-white px-4 py-1.5 text-[11px] font-semibold text-black shadow hover:bg-slate-100"
                    >
                      Explore beats
                    </button>
                  </form>
                  {searchOpen && searchSuggestions.length > 0 && (
                    <div className="absolute z-20 mt-1 w-full max-h-64 overflow-auto rounded-2xl border border-slate-800/80 bg-slate-950/95 text-[11px] shadow-xl">
                      {searchSuggestions.map((b) => (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() => {
                            navigate(`/beat/${b.id}`)
                            setSearchOpen(false)
                          }}
                          className="flex w-full items-center justify-between px-3 py-2 text-left text-slate-100 hover:bg-slate-900/90"
                        >
                          <div className="min-w-0">
                            <p className="truncate font-semibold">{b.title}</p>
                            <p className="mt-0.5 truncate text-[10px] text-slate-400">
                              {b.producer || 'Unknown'} • {b.genre || 'Beat'}
                            </p>
                          </div>
                          <span className="ml-2 text-[9px] text-slate-500">View</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={handleScrollToBeats}
                  className="rounded-full bg-white px-5 py-2 text-xs font-semibold text-black shadow-[0_0_35px_rgba(248,250,252,0.2)] transition hover:bg-slate-100"
                >
                  Browse trending beats
                </button>
                <Link
                  to="/signup"
                  className="rounded-full border border-white/15 bg-white/5 px-5 py-2 text-xs font-semibold text-slate-100 backdrop-blur transition hover:border-white/40 hover:bg-white/10"
                >
                  Become a producer
                </Link>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-5 text-[11px] text-slate-400">
                <div className="flex items-center gap-1.5">
                  Instant licensing & delivery
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                  Tools for producers & artists
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
                  Built for the Caribbean, made for the world
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* TRENDING BEATS */}
          <section id="trending-beats" className="py-8 md:py-10">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-white sm:text-xl">Trending Caribbean Beats</h2>
                <p className="mt-1 text-xs text-slate-400" />
              </div>
              <Link
                to="/beats"
                className="text-xs font-medium text-slate-300 underline-offset-4 hover:text-white hover:underline"
              >
                View all beats
              </Link>
            </div>

            {trendingBeats.length === 0 ? (
              <p className="mt-5 text-xs text-slate-400">
                No beats available yet. Once beats are uploaded, they will appear here for everyone.
              </p>
            ) : (
              <BeatCarousel beats={trendingBeats} />
            )}
          </section>

        {/* FEATURES GRID */}
        <section className="py-8 md:py-10">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-lg font-bold text-white sm:text-xl">Built for Caribbean creators</h2>
              <p className="mt-1 text-xs text-slate-400">
                RiddimBase combines a pro-grade beat marketplace with tools tailored for Caribbean music.
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <FeatureCard
              label="Marketplace"
              title="Sell & license beats globally"
              body="Upload your riddims, set your prices, and license to artists worldwide with clear contracts & instant delivery."
            />
            <FeatureCard
              label="AI Tools"
              title="Create smarter, faster"
              body="Use AI to help with tags, descriptions, pricing suggestions and more — without losing your unique sound."
            />
            <FeatureCard
              label="Analytics"
              title="Understand your listeners"
              body="Track plays, favorites, downloads and regions so you know which beats are connecting and where."
            />
            <FeatureCard
              label="Boosting"
              title="Get your beats seen"
              body="Boost beats into featured sections, get in front of new artists and grow your sales on autopilot."
            />
          </div>
        </section>

        {/* TESTIMONIALS */}
        <section className="pb-10 md:pb-12">
          <div className="rounded-3xl border border-white/10 bg-black/70 bg-rb-gloss-stripes bg-blend-soft-light p-4 shadow-rb-gloss-panel md:p-6">
            <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-100 sm:text-base">
                  What Caribbean creators are saying
                </h2>
                <p className="mt-1 text-[11px] text-slate-400 sm:text-xs">
                  Real producers, beat makers and artists using RiddimBase to move their
                  music forward.
                </p>
              </div>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {testimonials.map((t) => (
                <figure
                  key={t.name}
                  className="flex h-full flex-col rounded-2xl border border-slate-800/80 bg-slate-950/80 p-4 text-[11px] text-slate-200"
                >
                  <p className="flex-1 text-[11px] text-slate-200">
                    {t.quote}
                  </p>
                  <figcaption className="mt-3">
                    <p className="text-[11px] font-semibold text-rb-trop-cyan">
                      {t.name}
                    </p>
                    <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">
                      {t.role}
                    </p>
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section id="how-it-works" className="py-10 md:py-12">
          <h2 className="text-center text-lg font-bold text-white sm:text-xl">How RiddimBase works</h2>
          <p className="mt-2 text-center text-xs text-slate-400">
            Whether you&apos;re an artist or producer, getting started takes minutes — not months.
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <StepCard
              step="1"
              title="Create your free account"
              body="Sign up as an artist, producer or both. Set up your profile and wallet in a few clicks."
            />
            <StepCard
              step="2"
              title="Upload or discover beats"
              body="Producers upload beats with artwork, stems & pricing. Artists browse, filter & favorite beats they love."
            />
            <StepCard
              step="3"
              title="License, download & release"
              body="Instant licensing, secure payments and automatic delivery so you can focus on making records."
            />
          </div>
        </section>

        {/* PRICING */}
        <section id="pricing" className="pb-12 md:pb-16">
          <h2 className="text-center text-lg font-bold text-white sm:text-xl">
            Pricing built for growing creators
          </h2>
          <p className="mt-2 text-center text-xs text-slate-400">
            Start free, then upgrade only when you&apos;re ready to scale your catalog and revenue.
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {(plans.length ? plans : []).slice(0, 3).map((plan) => {
              const baseFeatures = Array.isArray(plan.features) ? plan.features : []
              const hasMessaging = baseFeatures.some((f) =>
                typeof f === 'string' && f.toLowerCase().includes('messag'),
              )
              const features =
                hasMessaging
                  ? baseFeatures
                  : plan.id === 'free'
                  ? [
                      ...baseFeatures,
                      'Up to 20 in-platform chat messages per month (resets every month).',
                    ]
                  : [
                      ...baseFeatures,
                      'Unlimited in-platform messaging with artists, producers and clients.',
                    ]

              return (
                <PricingCard
                  key={plan.id}
                  name={plan.name}
                  price={
                    plan.monthly === 0
                      ? 'Free'
                      : `$${Number(plan.monthly).toFixed(0)}/mo`
                  }
                  tagline={plan.badge || ''}
                  features={features}
                  highlight={plan.id === 'pro'}
                  planId={plan.id}
                />
              )
            })}
            {plans.length === 0 && (
              <div className="rounded-2xl border border-white/10 bg-black/60 p-4 text-xs text-slate-300">
                Live pricing will appear here once plans are loaded.
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  )
}

function FeatureCard({ label, title, body }) {
  return (
    <div className="flex flex-col rounded-xl border border-white/5 bg-white/5 p-4 text-xs text-slate-200">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-semibold text-white">{title}</p>
      <p className="mt-2 text-[11px] text-slate-400">{body}</p>
    </div>
  )
}

function StepCard({ step, title, body }) {
  return (
    <div className="flex flex-col rounded-xl border border-white/5 bg-white/5 p-4">
      <div className="mb-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-white text-[11px] font-bold text-black">
        {step}
      </div>
      <p className="text-xs font-semibold text-white">{title}</p>
      <p className="mt-2 text-[11px] text-slate-400">{body}</p>
    </div>
  )
}

function PricingCard({ name, price, tagline, features, highlight, planId }) {
  return (
    <div
      className={`flex flex-col rounded-2xl border p-4 text-xs ${
        highlight
          ? 'border-red-500/60 bg-gradient-to-b from-red-500/15 via-black to-black shadow-[0_0_50px_rgba(248,113,113,0.45)]'
          : 'border-white/10 bg-black/60'
      }`}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{name}</p>
      <p className="mt-1 text-lg font-bold text-white">{price}</p>
      <p className="mt-1 text-[11px] text-slate-300">{tagline}</p>

      <ul className="mt-3 space-y-1.5 text-[11px] text-slate-200">
        {features.map((feature) => (
          <li key={feature} className="flex items-start gap-1.5">
            <span className="mt-[3px] h-1.5 w-1.5 flex-shrink-0 rounded-full bg-emerald-400" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      <Link
        to={planId ? `/subscribe/${planId}` : '/signup'}
        className={`mt-4 inline-flex items-center justify-center rounded-full px-4 py-2 text-[11px] font-semibold ${
          highlight
            ? 'bg-white text-black hover:bg-slate-100'
            : 'border border-white/15 text-slate-100 hover:border-white/40 hover:bg-white/5'
        } transition`}
      >
        {planId ? 'Choose plan' : 'Get started'}
      </Link>
    </div>
  )
}

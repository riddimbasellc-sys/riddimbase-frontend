import { useParams, useNavigate } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import BackButton from '../components/BackButton'
import { useBeats } from '../hooks/useBeats'
import PayPalButtonsGroup from '../components/payments/PayPalButtonsGroup'
import useSupabaseUser from '../hooks/useSupabaseUser'
import { fetchBeat as fetchBeatRemote } from '../services/beatsRepository'

const BOOST_OPTIONS = [
  { days: 1, label: '1 day', price: 4.99 },
  { days: 3, label: '3 days', price: 9.99 },
  { days: 7, label: '7 days', price: 19.99 },
  { days: 14, label: '14 days', price: 34.99 },
  { days: 30, label: '30 days', price: 59.99 },
]

export function BoostBeat() {
  const { beatId } = useParams()
  const navigate = useNavigate()
  const { beats } = useBeats()
  const { user } = useSupabaseUser()

  const [remoteBeat, setRemoteBeat] = useState(null)
  const [selected, setSelected] = useState(BOOST_OPTIONS[1]) // default 3 days
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState(null)

  const beat =
    useMemo(
      () => beats.find((b) => b.id === beatId) || null,
      [beats, beatId],
    ) || remoteBeat

  useEffect(() => {
    if (!beat && beatId) {
      ;(async () => {
        const data = await fetchBeatRemote(beatId)
        if (data) {
          setRemoteBeat({
            id: data.id,
            title: data.title,
            producer: data.producer || 'Unknown',
            userId: data.user_id || null,
            genre: data.genre || 'Dancehall',
            bpm: data.bpm || 0,
            price: data.price || 29,
            coverUrl: data.cover_url || null,
          })
        }
      })()
    }
  }, [beat, beatId])

  const handleBoostCreated = () => {
    setSubmitting(false)
    setResult({
      ok: true,
      message:
        'Your beat is now boosted. It will appear at the top of homepage and search while the promotion is active.',
    })
  }

  const handleBoostError = (err) => {
    setSubmitting(false)
    setResult({
      ok: false,
      message: err?.message || 'Failed to create boost.',
    })
  }

  const handlePayPalSuccess = async ({ orderId }) => {
    if (!beat || !user) return
    setSubmitting(true)
    try {
      const base =
        (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '') || ''
      const res = await fetch(`${base}/boosts/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          beat_id: beat.id,
          producer_id: beat.userId || user.id,
          days: selected.days,
          paypal_order_id: orderId,
        }),
      })
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}))
        throw new Error(payload.error || 'Boost create failed')
      }
      await res.json()
      handleBoostCreated()
    } catch (e) {
      handleBoostError(e)
    }
  }

  if (!beat) {
    return (
      <section className="bg-slate-950/95">
        <div className="mx-auto max-w-4xl px-3 py-6 sm:px-4 sm:py-10">
          <BackButton />
          <p className="mt-4 text-sm text-slate-300">
            Loading beat info…
          </p>
        </div>
      </section>
    )
  }

  return (
    <section className="bg-slate-950/95">
      <div className="mx-auto max-w-4xl px-3 py-6 sm:px-4 sm:py-10">
        <div className="flex items-center gap-3">
          <BackButton />
          <div>
            <h1 className="font-display text-xl font-semibold text-slate-50 sm:text-2xl">
              Boost this beat
            </h1>
            <p className="mt-1 text-xs text-slate-400 sm:text-sm">
              Turn this beat into a sponsored placement on homepage, search
              and producer pages.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-6 md:grid-cols-[1.1fr,0.9fr]">
          {/* Beat preview panel */}
          <div className="space-y-4 rounded-2xl border border-slate-800/80 bg-slate-900/80 p-5">
            <div className="flex items-start gap-4">
              <div className="h-16 w-16 overflow-hidden rounded-xl bg-slate-800/80">
                {beat.coverUrl ? (
                  <img
                    src={beat.coverUrl}
                    alt={beat.title}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-[10px] text-slate-400">
                    No artwork
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-rb-sun-gold">
                  Beat preview
                </p>
                <p className="truncate text-sm font-semibold text-slate-50">
                  {beat.title}
                </p>
                <p className="text-[11px] text-slate-400">
                  {beat.producer || 'Unknown'} • {beat.genre || 'Caribbean'} •{' '}
                  {beat.bpm || 0} BPM
                </p>
              </div>
            </div>
            <div className="mt-3 rounded-xl border border-slate-800/80 bg-slate-950/80 p-3 text-[11px] text-slate-300">
              <p className="font-semibold text-slate-100">Where boosts appear</p>
              <ul className="mt-2 space-y-1">
                <li>• Top of homepage “Boosted beats” rail</li>
                <li>• Pinned above search and browse results</li>
                <li>• Highlighted on your producer profile catalog</li>
              </ul>
            </div>
          </div>

          {/* Boost selector + PayPal */}
          <div className="space-y-4 rounded-2xl border border-slate-800/80 bg-slate-900/80 p-5">
            <h2 className="text-sm font-semibold text-slate-100">
              Choose boost duration
            </h2>
            <p className="text-[11px] text-slate-400">
              Longer boosts keep your beat in sponsored placements for more days.
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
              {BOOST_OPTIONS.map((opt) => {
                const active = selected.days === opt.days
                return (
                  <button
                    key={opt.days}
                    type="button"
                    onClick={() => setSelected(opt)}
                    className={`rounded-xl border px-3 py-2 text-left transition ${
                      active
                        ? 'border-red-500/80 bg-red-500/10 text-red-100'
                        : 'border-slate-700/80 bg-slate-900/70 text-slate-200 hover:border-red-500/70'
                    }`}
                  >
                    <p className="text-xs font-semibold">{opt.label}</p>
                    <p className="mt-1 text-[11px]">
                      ${opt.price.toFixed(2)} total
                    </p>
                  </button>
                )
              })}
            </div>

            <div className="mt-4 rounded-xl border border-slate-800/80 bg-slate-950/80 p-3 text-[11px] text-slate-300">
              <p className="flex items-center justify-between">
                <span>Selected duration</span>
                <span className="font-semibold text-slate-100">
                  {selected.label}
                </span>
              </p>
              <p className="mt-1 flex items-center justify-between">
                <span>Boost price</span>
                <span className="font-semibold text-rb-sun-gold">
                  ${selected.price.toFixed(2)}
                </span>
              </p>
            </div>

            <div className="mt-3">
              <PayPalButtonsGroup
                amount={selected.price}
                currency="USD"
                description={`Boost for beat "${beat.title}" (${selected.label})`}
                payerEmail={user?.email || ''}
                onSuccess={handlePayPalSuccess}
                onError={handleBoostError}
              />
            </div>

            {result && (
              <div
                className={`mt-3 rounded-xl border px-3 py-2 text-[11px] ${
                  result.ok
                    ? 'border-emerald-400/70 bg-emerald-500/10 text-emerald-200'
                    : 'border-rose-400/70 bg-rose-500/10 text-rose-200'
                }`}
              >
                <p>{result.message}</p>
                {result.ok && (
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => navigate('/beats')}
                      className="rounded-full bg-red-500 px-3 py-1 text-[11px] font-semibold text-slate-50 hover:bg-red-400"
                    >
                      Browse boosted beats
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate('/producer/dashboard')}
                      className="rounded-full border border-slate-700/70 px-3 py-1 text-[11px] font-semibold text-slate-200 hover:border-emerald-400/70"
                    >
                      Back to dashboard
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

export default BoostBeat


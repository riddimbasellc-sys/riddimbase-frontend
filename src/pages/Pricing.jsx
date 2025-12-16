import { useEffect, useState } from 'react'
import BackButton from '../components/BackButton'
import { useLocation, useNavigate } from 'react-router-dom'
import { listPlans } from '../services/plansRepository'
import useUserPlan from '../hooks/useUserPlan'
import { cancelSubscription, getSubscription } from '../services/subscriptionService'

export function Pricing() {
  const location = useLocation()
  const searchParams = new URLSearchParams(location.search)
  const initialCycle = searchParams.get('cycle') === 'yearly' ? 'yearly' : 'monthly'

  const [cycle, setCycle] = useState(initialCycle)
  const [plans, setPlans] = useState([])
  const navigate = useNavigate()
  const { user, plan, loading } = useUserPlan()
  const [subscription, setSubscription] = useState(null)

  useEffect(() => {
    ;(async () => {
      setPlans(await listPlans())
    })()
  }, [])

  useEffect(() => {
    let active = true
    if (!loading && user) {
      ;(async () => {
        const sub = await getSubscription(user.id)
        if (active) setSubscription(sub)
      })()
    }
    if (!loading && !user) {
      setSubscription(null)
    }
    return () => {
      active = false
    }
  }, [loading, user])

  const expiresAtDate = subscription?.expiresAt
    ? new Date(subscription.expiresAt)
    : null
  const daysRemaining = expiresAtDate
    ? Math.ceil((expiresAtDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null
  const isExpiringSoon = daysRemaining !== null && daysRemaining >= 0 && daysRemaining <= 3

  const withMessagingFeature = (plan) => {
    const base = Array.isArray(plan.features) ? plan.features : []
    const hasMessaging = base.some((f) =>
      typeof f === 'string' && f.toLowerCase().includes('messag')
    )
    if (hasMessaging) return base
    if (plan.id === 'free') {
      return [
        ...base,
        'Up to 20 in-platform chat messages per month (resets every month).',
      ]
    }
    return [
      ...base,
      'Unlimited in-platform messaging with artists, producers and clients.',
    ]
  }

  const handleCancelAutoRenew = async () => {
    if (!user) return
    await cancelSubscription(user.id)
    const sub = await getSubscription(user.id)
    setSubscription(sub)
  }

  const currentPlanLabel =
    plan === 'starter' ? 'Starter' : plan === 'pro' ? 'Pro' : 'Free'

  const updateCycle = (next) => {
    setCycle(next)
    const params = new URLSearchParams(location.search)
    if (next === 'yearly') {
      params.set('cycle', 'yearly')
    } else {
      params.delete('cycle')
    }
    navigate(
      {
        pathname: location.pathname,
        search: params.toString() ? `?${params.toString()}` : '',
      },
      { replace: true },
    )
  }

  return (
    <section className="bg-slate-950/95">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="flex items-center gap-3">
          <BackButton />
          <h1 className="font-display text-2xl font-semibold text-slate-50">
            Pricing & Plans
          </h1>
        </div>
        <p className="mt-1 text-sm text-slate-300 max-w-2xl">
          Choose the plan that matches your production pace. Your first 5 uploads are
          totally free—no credit card required.
        </p>
        {!loading && user && (
          <div className="mt-5 rounded-2xl border border-slate-800/80 bg-slate-900/80 p-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between shadow-rb-gloss-panel">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-rb-sun-gold">
                Your plan
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-100">
                {currentPlanLabel}
              </p>
              {plan === 'free' || !subscription || !expiresAtDate ? (
                <p className="text-[11px] text-slate-400">
                  Free tier · no expiry. Upgrade any time to unlock more uploads and
                  analytics.
                </p>
              ) : (
                <p className="text-[11px] text-slate-400">
                  {subscription.autoRenew !== false ? 'Renews on ' : 'Expires on '}
                  <span className="font-medium text-slate-200">
                    {expiresAtDate.toLocaleDateString()}
                  </span>
                  {daysRemaining !== null && daysRemaining >= 0 && (
                    <span className="ml-1 text-slate-500">
                      (
                      {daysRemaining === 0
                        ? 'today'
                        : `in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'}`}
                      )
                    </span>
                  )}
                </p>
              )}
            </div>
            {plan !== 'free' && subscription && expiresAtDate && (
              <div className="flex flex-col items-start gap-2 md:items-end">
                {isExpiringSoon && (
                  <span className="inline-flex items-center rounded-full border border-amber-400/70 bg-amber-500/10 px-3 py-1 text-[11px] font-semibold text-amber-200">
                    Expiring in {daysRemaining} day{daysRemaining === 1 ? '' : 's'} — renew
                    or cancel.
                  </span>
                )}
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => navigate(`/subscribe/${plan}`)}
                    className="rounded-full bg-rb-trop-sunrise px-4 py-1.5 text-[11px] font-semibold text-slate-950 shadow-rb-gloss-btn hover:brightness-110"
                  >
                    Renew / Change plan
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelAutoRenew}
                    className="rounded-full border border-slate-700/70 bg-slate-800/80 px-4 py-1.5 text-[11px] font-medium text-slate-200 hover:border-rose-400/70 hover:text-rose-200"
                  >
                    Cancel auto-renew
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
        <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-slate-700/70 bg-slate-900/70 p-1 text-xs">
          <button
            type="button"
            onClick={() => updateCycle('monthly')}
            className={`rounded-full px-3 py-1 font-medium transition ${
              cycle === 'monthly'
                ? 'bg-rb-trop-sunrise text-slate-950'
                : 'text-slate-300 hover:text-emerald-300'
            }`}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => updateCycle('yearly')}
            className={`rounded-full px-3 py-1 font-medium transition ${
              cycle === 'yearly'
                ? 'bg-rb-trop-sunrise text-slate-950'
                : 'text-slate-300 hover:text-emerald-300'
            }`}
          >
            Yearly{' '}
            <span className="text-[10px] ml-1 font-semibold text-emerald-300/80">
              (Save ~17%)
            </span>
          </button>
        </div>
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {plans.map((p) => {
            const price = cycle === 'monthly' ? p.monthly : p.yearly
            const features = withMessagingFeature(p)
            return (
              <div
                key={p.id}
                className="relative flex flex-col rounded-2xl border border-slate-800/80 bg-slate-900/80 p-5 shadow-rb-gloss-panel"
              >
                <div className="flex items-baseline justify-between">
                  <h2 className="text-sm font-semibold text-slate-100">{p.name}</h2>
                  {p.badge && (
                    <span className="rounded-full bg-rb-trop-sunrise/10 px-2 py-0.5 text-[10px] font-medium text-rb-sun-gold">
                      {p.badge}
                    </span>
                  )}
                </div>
                <p className="mt-2 text-3xl font-bold tracking-tight text-rb-trop-cyan">
                  {price === 0 ? 'Free' : `$${price}`}
                  <span className="ml-1 text-xs font-medium text-slate-400">
                    /{cycle === 'monthly' ? 'mo' : 'yr'}
                  </span>
                </p>
                {p.id !== 'free' && cycle === 'yearly' && (
                  <p className="mt-1 text-[11px] text-emerald-300">
                    Equivalent to ${p.monthly}/mo
                  </p>
                )}
                <ul className="mt-4 flex-1 space-y-2 text-[11px] text-slate-300">
                  {features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-emerald-400/90" />
                      <span>{f}</span>
                    </li>
                  ))}
                  {p.id === 'free' && (
                    <li className="flex items-start gap-2">
                      <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-emerald-400/90" />
                      <span>Upgrade any time—keep existing beats live</span>
                    </li>
                  )}
                </ul>
                <button
                  type="button"
                  onClick={() => navigate(`/subscribe/${p.id}?cycle=${cycle}`)}
                  className="mt-5 rounded-full bg-rb-trop-sunrise px-4 py-2 text-xs font-semibold text-slate-950 hover:brightness-110 transition shadow-rb-gloss-btn"
                >
                  {p.cta}
                </button>
                {p.id === 'pro' && (
                  <p className="mt-3 text-[10px] text-slate-500">
                    Includes upcoming monetization & payout tools.
                  </p>
                )}
              </div>
            )
          })}
          {plans.length === 0 && (
            <p className="text-xs text-slate-400">No plans available.</p>
          )}
        </div>
        <div className="mt-10 rounded-2xl border border-slate-800/80 bg-slate-900/80 p-6">
          <h3 className="text-sm font-semibold text-slate-100">FAQ</h3>
          <div className="mt-4 space-y-3 text-xs text-slate-300">
            <div>
              <p className="font-semibold text-slate-100">
                Do I need a card for Free?
              </p>
              <p className="mt-1 text-slate-400">
                No card required. Just sign up and start uploading—first 5 beats are
                free.
              </p>
            </div>
            <div>
              <p className="font-semibold text-slate-100">
                What happens after 5 uploads?
              </p>
              <p className="mt-1 text-slate-400">
                Your existing beats stay live. To upload more you choose a paid tier.
              </p>
            </div>
            <div>
              <p className="font-semibold text-slate-100">
                Can I switch billing cycles?
              </p>
              <p className="mt-1 text-slate-400">
                Yes. Prorated credits will apply automatically when upgrading or
                downgrading.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default Pricing

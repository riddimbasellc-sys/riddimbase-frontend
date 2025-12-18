import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import useUserPlan from '../hooks/useUserPlan'
import { validateCoupon, markCouponUsed } from '../services/couponsService'
import PayPalSubscriptionButtons from '../components/payments/PayPalSubscriptionButtons'
import { getPlan } from '../services/plansRepository'

const PLAN_DETAILS = {
  free: {
    name: 'Free',
    description: 'Starter tier with 5 total uploads.',
  },
  starter: {
    name: 'Starter',
    description:
      'Grow your catalog with up to 100 active beats and monthly analytics.',
  },
  pro: {
    name: 'Pro',
    description:
      'Unlimited beats plus real-time sales dashboard and early features.',
  },
}

export function SubscriptionCheckout() {
  const { planId: paramPlanId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const { user, plan, loading } = useUserPlan()

  const planId = paramPlanId || 'free'

  const searchParams = new URLSearchParams(location.search)
  const initialCycle = searchParams.get('cycle') === 'yearly' ? 'yearly' : 'monthly'
  const kind = searchParams.get('kind') || null

  const [planMeta, setPlanMeta] = useState(null)
  const details = {
    name:
      planMeta?.name ||
      (PLAN_DETAILS[planId] ? PLAN_DETAILS[planId].name : PLAN_DETAILS.free.name),
    description:
      (PLAN_DETAILS[planId] && PLAN_DETAILS[planId].description) ||
      PLAN_DETAILS.free.description,
  }

  const [step, setStep] = useState(1)
  const [processing, setProcessing] = useState(false)
  const [billingCycle] = useState(initialCycle)
  const [billing, setBilling] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    company: '',
    line1: '',
    line2: '',
    city: '',
    state: '',
    postalCode: '',
    country: '',
  })

  const [baseAmount, setBaseAmount] = useState(0)

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const meta = await getPlan(planId)
        if (!active || !meta) return
        setPlanMeta(meta)
        const monthly = Number(meta.monthly || 0)
        const yearly = Number(meta.yearly || 0)

        if (billingCycle === 'yearly' && yearly > 0) {
          setBaseAmount(yearly)
        } else if (monthly > 0) {
          setBaseAmount(monthly)
        } else {
          setBaseAmount(0)
        }
      } catch {
        // fall back to defaults
      }
    })()
    return () => {
      active = false
    }
  }, [planId, billingCycle])

  const [couponCode, setCouponCode] = useState('')
  const [couponResult, setCouponResult] = useState(null)
  const [couponStatus, setCouponStatus] = useState(null) // { type: 'success'|'error', message: string }
  const [showCouponInput, setShowCouponInput] = useState(false)

  const finalAmount = couponResult?.valid ? couponResult.final : baseAmount

  const applyCoupon = async () => {
    if (!couponCode.trim()) return
    const res = await validateCoupon({
      code: couponCode,
      planId,
      amount: baseAmount,
      billingCycle,
      kind,
      userId: user?.id || null,
    })
    setCouponResult(res)
    if (res.valid) {
      setCouponStatus({
        type: 'success',
        message: 'Coupon applied successfully.',
      })
    } else {
      setCouponStatus({
        type: 'error',
        message: 'Invalid coupon. Please check the code.',
      })
    }
  }

  const handleUpgrade = async (appliedCode = null, paypalSubId = null) => {
    if (!user) return
    setProcessing(true)
    try {
      if (appliedCode) await markCouponUsed(appliedCode, user.id)
      if (paypalSubId) {
        try {
          await fetch('/api/subscriptions/activate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: user.id,
              planId,
              providerSubscriptionId: paypalSubId,
            }),
          })
        } catch {
          // webhook will still populate Supabase if this fails
        }
      }
      navigate('/producer/dashboard')
    } finally {
      setProcessing(false)
    }
  }

  const alreadyActive = plan === planId
  const isProducerPro = planId === 'pro' && kind === 'producer'

  const close = () => navigate(-1)

  if (loading) {
    return (
      <section className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
        <div className="rounded-2xl border border-slate-800/80 bg-slate-950/95 px-5 py-4 text-xs text-slate-400">
          Loading your plan...
        </div>
      </section>
    )
  }

  if (!user) {
    return (
      <section className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
        <div className="w-full max-w-sm rounded-2xl border border-slate-800/80 bg-slate-950/95 p-5 text-xs text-slate-200">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-50">
              Sign in to continue
            </p>
            <button
              type="button"
              onClick={close}
              className="text-[18px] leading-none text-slate-500 hover:text-slate-200"
              aria-label="Close"
            >
              ×
            </button>
          </div>
          <p className="mt-2 text-slate-400">
            You need an account to activate a subscription plan.
          </p>
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="mt-4 w-full rounded-full bg-emerald-500 px-4 py-2 text-[11px] font-semibold text-slate-950 hover:bg-emerald-400"
          >
            Go to login
          </button>
        </div>
      </section>
    )
  }

  if (planId === 'free') {
    return (
      <section className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
        <div className="w-full max-w-sm rounded-2xl border border-slate-800/80 bg-slate-950/95 p-5 text-xs text-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-300">
                Downgrade
              </p>
              <h1 className="mt-1 text-sm font-semibold text-slate-50">
                Switch to Free plan
              </h1>
            </div>
            <button
              type="button"
              onClick={close}
              className="text-[18px] leading-none text-slate-500 hover:text-slate-200"
              aria-label="Close"
            >
              ×
            </button>
          </div>
          <p className="mt-3 text-slate-400">
            Existing beats stay live, but you will be limited to the Free upload
            quota.
          </p>
          <button
            disabled={processing || alreadyActive}
            onClick={() => handleUpgrade()}
            className="mt-4 w-full rounded-full bg-emerald-500 px-4 py-2 text-[11px] font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-50"
          >
            {alreadyActive
              ? 'Free plan already active'
              : processing
              ? 'Processing...'
              : 'Confirm downgrade'}
          </button>
          <button
            type="button"
            onClick={close}
            className="mt-2 w-full rounded-full border border-slate-700/70 bg-slate-900 px-4 py-2 text-[11px] font-semibold text-slate-300 hover:border-slate-500/80"
          >
            Cancel
          </button>
        </div>
      </section>
    )
  }

  const canGoNext = billing.firstName.trim() && billing.lastName.trim()

  return (
    <section className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-3">
      <div className="flex max-h-[95vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-950/95 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800/70 px-5 py-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-red-400">
              Plan checkout
            </p>
            <h1 className="font-display text-lg font-semibold text-slate-50">
              {details.name} Plan
            </h1>
            <p className="mt-0.5 text-[11px] text-slate-400">
              {details.description}
            </p>
          </div>
          <button
            type="button"
            onClick={close}
            className="rounded-full border border-slate-700/70 px-2 py-1 text-[11px] text-slate-400 hover:border-slate-500 hover:text-slate-100"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="flex items-center justify-between border-b border-slate-800/70 px-5 py-2 text-[11px] text-slate-400">
          <div className="flex items-center gap-2">
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold ${
                step === 1
                  ? 'bg-red-500 text-white'
                  : 'border border-slate-600 text-slate-300'
              }`}
            >
              1
            </span>
            <span>Billing details</span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold ${
                step === 2
                  ? 'bg-red-500 text-white'
                  : 'border border-slate-600 text-slate-300'
              }`}
            >
              2
            </span>
            <span>Payment & summary</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 text-[12px] text-slate-200">
          {step === 1 && (
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-800/80 bg-slate-900/80 p-3 flex items-center justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
                    Selected plan
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-50">
                    {details.name}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-slate-50">
                    {baseAmount > 0 ? `$${baseAmount.toFixed(2)}` : 'Free'}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    per {billingCycle === 'yearly' ? 'year' : 'month'}
                  </p>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="text-[10px] font-semibold text-slate-400">
                    First Name
                  </label>
                  <input
                    value={billing.firstName}
                    onChange={(e) =>
                      setBilling((b) => ({ ...b, firstName: e.target.value }))
                    }
                    className="mt-1 w-full rounded-lg border border-slate-700/70 bg-slate-950/80 px-3 py-2 text-[12px] text-slate-100"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-slate-400">
                    Last Name
                  </label>
                  <input
                    value={billing.lastName}
                    onChange={(e) =>
                      setBilling((b) => ({ ...b, lastName: e.target.value }))
                    }
                    className="mt-1 w-full rounded-lg border border-slate-700/70 bg-slate-950/80 px-3 py-2 text-[12px] text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-semibold text-slate-400">
                  Phone (optional)
                </label>
                <input
                  value={billing.phone}
                  onChange={(e) =>
                    setBilling((b) => ({ ...b, phone: e.target.value }))
                  }
                  className="mt-1 w-full rounded-lg border border-slate-700/70 bg-slate-950/80 px-3 py-2 text-[12px] text-slate-100"
                />
              </div>

              <div>
                <label className="text-[10px] font-semibold text-slate-400">
                  Company (optional)
                </label>
                <input
                  value={billing.company}
                  onChange={(e) =>
                    setBilling((b) => ({ ...b, company: e.target.value }))
                  }
                  className="mt-1 w-full rounded-lg border border-slate-700/70 bg-slate-950/80 px-3 py-2 text-[12px] text-slate-100"
                />
              </div>

              <div>
                <label className="text-[10px] font-semibold text-slate-400">
                  Address Line 1
                </label>
                <input
                  value={billing.line1}
                  onChange={(e) =>
                    setBilling((b) => ({ ...b, line1: e.target.value }))
                  }
                  className="mt-1 w-full rounded-lg border border-slate-700/70 bg-slate-950/80 px-3 py-2 text-[12px] text-slate-100"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-400">
                  Address Line 2 (optional)
                </label>
                <input
                  value={billing.line2}
                  onChange={(e) =>
                    setBilling((b) => ({ ...b, line2: e.target.value }))
                  }
                  className="mt-1 w-full rounded-lg border border-slate-700/70 bg-slate-950/80 px-3 py-2 text-[12px] text-slate-100"
                />
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="text-[10px] font-semibold text-slate-400">
                    City
                  </label>
                  <input
                    value={billing.city}
                    onChange={(e) =>
                      setBilling((b) => ({ ...b, city: e.target.value }))
                    }
                    className="mt-1 w-full rounded-lg border border-slate-700/70 bg-slate-950/80 px-3 py-2 text-[12px] text-slate-100"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-slate-400">
                    Postal Code
                  </label>
                  <input
                    value={billing.postalCode}
                    onChange={(e) =>
                      setBilling((b) => ({
                        ...b,
                        postalCode: e.target.value,
                      }))
                    }
                    className="mt-1 w-full rounded-lg border border-slate-700/70 bg-slate-950/80 px-3 py-2 text-[12px] text-slate-100"
                  />
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="text-[10px] font-semibold text-slate-400">
                    Country
                  </label>
                  <input
                    value={billing.country}
                    onChange={(e) =>
                      setBilling((b) => ({ ...b, country: e.target.value }))
                    }
                    className="mt-1 w-full rounded-lg border border-slate-700/70 bg-slate-950/80 px-3 py-2 text-[12px] text-slate-100"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-slate-400">
                    State / Region
                  </label>
                  <input
                    value={billing.state}
                    onChange={(e) =>
                      setBilling((b) => ({ ...b, state: e.target.value }))
                    }
                    className="mt-1 w-full rounded-lg border border-slate-700/70 bg-slate-950/80 px-3 py-2 text-[12px] text-slate-100"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-800/80 bg-slate-900/80 p-3 text-[11px] text-slate-300">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-100">
                    {details.name} Plan
                  </span>
                  <span className="text-slate-100">
                    ${baseAmount.toFixed(2)}/{billingCycle === 'yearly' ? 'yr' : 'mo'}
                  </span>
                </div>
                <p className="mt-1 text-[10px] text-slate-400">
                  Billed securely via PayPal subscription. Cancel anytime from
                  your billing settings.
                </p>
                <div className="mt-3 space-y-1 text-[11px]">
                  <p className="flex justify-between">
                    <span>Subtotal</span>
                    <span>${baseAmount.toFixed(2)}</span>
                  </p>
                  {couponResult?.valid && (
                    <p className="flex justify-between text-emerald-300">
                      <span>Coupon discount</span>
                      <span>- ${couponResult.discount.toFixed(2)}</span>
                    </p>
                  )}
                  <p className="mt-1 flex justify-between font-semibold text-slate-50">
                    <span>Total</span>
                    <span>
                      ${finalAmount.toFixed(2)}/{billingCycle === 'yearly' ? 'yr' : 'mo'}
                    </span>
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-slate-800/80 bg-slate-900/80 p-3">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-slate-100">
                    Coupon
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setShowCouponInput((show) => !show)
                    }
                    className="text-[11px] font-semibold text-emerald-300 hover:text-emerald-200"
                  >
                    {showCouponInput ? 'Hide' : 'Apply coupon'}
                  </button>
                </div>
                {showCouponInput && (
                  <div className="mt-3 flex gap-2">
                    <input
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                      placeholder="Enter coupon code"
                      className="flex-1 rounded-lg border border-slate-700/70 bg-slate-950/80 px-3 py-2 text-[12px] text-slate-100"
                    />
                    <button
                      type="button"
                      onClick={applyCoupon}
                      className="rounded-full bg-slate-800 px-4 py-2 text-[11px] font-semibold text-slate-200 hover:bg-slate-700"
                    >
                      Save
                    </button>
                  </div>
                )}
                {couponStatus && (
                  <p
                    className={`mt-2 text-[10px] ${
                      couponStatus.type === 'success'
                        ? 'text-emerald-300'
                        : 'text-red-300'
                    }`}
                  >
                    {couponStatus.message}
                  </p>
                )}
              </div>

              <div className="space-y-3">
                <p className="text-[11px] font-semibold text-slate-100">
                  Pay with PayPal
                </p>
                <PayPalSubscriptionButtons
                  paypalPlanId={
                    planId === 'starter'
                      ? (import.meta.env.VITE_PAYPAL_PLAN_STARTER || '').trim()
                      : planId === 'pro' && isProducerPro
                      ? (
                          import.meta.env.VITE_PAYPAL_PLAN_PRO_PRODUCER ||
                          ''
                        ).trim()
                      : planId === 'pro'
                      ? (import.meta.env.VITE_PAYPAL_PLAN_PRO || '').trim()
                      : ''
                  }
                  planId={planId}
                  userId={user?.id}
                  description={`${details.name} Plan Subscription`}
                  payerName={user?.email?.split('@')[0] || ''}
                  payerEmail={user?.email || ''}
                  onSuccess={({ subscriptionId }) =>
                    handleUpgrade(
                      couponResult?.valid ? couponResult.coupon.code : null,
                      subscriptionId,
                    )
                  }
                  onError={(err) =>
                    console.error('[PayPal][Sub] error', err)
                  }
                />
                <p className="text-[10px] text-slate-500">
                  By subscribing you agree to RiddimBase&apos;s Terms, Privacy
                  Policy and Refund Policy. You can cancel renewal at any time.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-slate-800/70 px-5 py-3 text-[11px]">
          <button
            type="button"
            onClick={step === 1 ? close : () => setStep(1)}
            className="rounded-full border border-slate-700/70 bg-slate-900 px-4 py-1.5 text-[11px] font-medium text-slate-200 hover:border-slate-500/80"
          >
            {step === 1 ? 'Cancel' : 'Back'}
          </button>
          {step === 1 && (
            <button
              type="button"
              disabled={!canGoNext}
              onClick={() => setStep(2)}
              className="rounded-full bg-red-500 px-5 py-1.5 text-[11px] font-semibold text-white hover:bg-red-400 disabled:opacity-40"
            >
              Next
            </button>
          )}
          {step === 2 && (
            <div className="text-[10px] text-slate-500">
              Complete payment above to activate your plan.
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

export default SubscriptionCheckout

import { useParams, useNavigate, useLocation } from 'react-router-dom'
import BackButton from '../components/BackButton'
import useUserPlan from '../hooks/useUserPlan'
import { useState, useEffect } from 'react'
import { validateCoupon, markCouponUsed } from '../services/couponsService'
import PayPalSubscriptionButtons from '../components/payments/PayPalSubscriptionButtons'

const PLAN_DETAILS = {
  free: {
    name: 'Free',
    description: 'Starter tier with 5 total uploads.'
  },
  starter: {
    name: 'Starter',
    description: 'Grow your catalog with up to 100 active beats and monthly analytics.'
  },
  pro: {
    name: 'Pro',
    description: 'Unlimited beats plus real-time sales dashboard and early features.'
  }
}

export function SubscriptionCheckout() {
  const { planId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const { user, plan, loading } = useUserPlan()
  const [processing, setProcessing] = useState(false)
  const details = PLAN_DETAILS[planId] || PLAN_DETAILS.free

  const handleUpgrade = async (appliedCode = null, paypalSubId = null) => {
    if (!user) return
    setProcessing(true)
    try {
      if (appliedCode) await markCouponUsed(appliedCode)
      // Optionally call backend to mirror subscription immediately
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
          // if this fails, webhook will still populate Supabase
        }
      }
      navigate('/producer/dashboard')
    } finally {
      setProcessing(false)
    }
  }

  // Pricing copy for plans (PayPal Subscriptions handle actual billing amount)
  const baseAmount = planId === 'starter' ? 9.99 : planId === 'pro' ? 19.99 : 0
  const [couponCode, setCouponCode] = useState('')
  const [couponResult, setCouponResult] = useState(null)
  const finalAmount = couponResult?.valid ? couponResult.final : baseAmount

  const applyCoupon = async () => {
    if (!couponCode.trim()) return
    const res = await validateCoupon({ code: couponCode, planId, amount: baseAmount })
    setCouponResult(res)
  }

  useEffect(() => { /* loader handled by component */ }, [])

  const alreadyActive = plan === planId
  const search = new URLSearchParams(location.search)
  const kind = search.get('kind') || null
  const isProducerPro = planId === 'pro' && kind === 'producer'

  return (
    <section className="bg-slate-950/95">
      <div className="mx-auto max-w-xl px-4 py-10">
        <div className="flex items-center gap-3">
          <BackButton />
          <h1 className="font-display text-2xl font-semibold text-slate-50">{details.name} Plan</h1>
        </div>
        <p className="mt-2 text-sm text-slate-300">{details.description}</p>
        {loading && <p className="mt-6 text-xs text-slate-400">Loading user...</p>}
        {!loading && !user && <p className="mt-6 text-xs text-rose-400">You need to be logged in to manage subscriptions.</p>}
        {!loading && user && (
          <div className="mt-6 space-y-4">
            {alreadyActive && (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-[11px] text-emerald-300">
                This plan is already active on your account.
              </div>
            )}
            {!alreadyActive && plan !== 'free' && planId === 'free' && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-[11px] text-amber-300">
                Downgrading will keep existing beats live but you cannot exceed Free upload limit.
              </div>
            )}
            {!alreadyActive && plan === 'free' && planId !== 'free' && (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-[11px] text-emerald-300">
                Unlock more uploads and advanced analytics by upgrading.
              </div>
            )}
            {planId !== 'free' && (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <input
                    value={couponCode}
                    onChange={e=>setCouponCode(e.target.value)}
                    placeholder="Coupon code"
                    className="flex-1 rounded-lg border border-slate-700/70 bg-slate-950/70 px-3 py-2 text-[12px] text-slate-100"
                  />
                  <button type="button" onClick={applyCoupon} className="rounded-full bg-slate-800 px-4 py-2 text-[11px] font-semibold text-slate-200 hover:bg-slate-700">Apply</button>
                </div>
                {couponResult && (
                  <div className={`rounded-lg border px-3 py-2 text-[11px] ${couponResult.valid? 'border-emerald-500/60 bg-emerald-500/10 text-emerald-300':'border-red-500/60 bg-red-500/10 text-red-300'}`}> 
                    {couponResult.valid ? `Coupon applied: -$${couponResult.discount.toFixed(2)} (New total $${couponResult.final.toFixed(2)})` : `Coupon invalid: ${couponResult.reason}`}
                  </div>
                )}
                <PayPalSubscriptionButtons
                  paypalPlanId={
                    planId === 'starter'
                      ? (import.meta.env.VITE_PAYPAL_PLAN_STARTER || '').trim()
                      : planId === 'pro' && isProducerPro
                      ? (import.meta.env.VITE_PAYPAL_PLAN_PRO_PRODUCER || '').trim()
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
                  onError={(err) => console.error('[PayPal][Sub] error', err)}
                />
              </div>
            )}
            {planId === 'free' && (
              <button
                disabled={processing || alreadyActive || !user}
                onClick={handleUpgrade}
                className="rounded-full bg-emerald-500 px-6 py-2 text-xs font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:opacity-50"
              >{alreadyActive ? 'Active Plan' : processing ? 'Processing…' : 'Confirm Downgrade'}</button>
            )}
            <button
              type="button"
              onClick={()=>navigate('/pricing')}
              className="ml-2 rounded-full border border-slate-700/70 bg-slate-800/70 px-6 py-2 text-xs font-semibold text-slate-300 hover:border-emerald-400/60 hover:text-emerald-300 transition"
            >Back to Plans</button>
          </div>
        )}
      </div>
    </section>
  )
}

export default SubscriptionCheckout

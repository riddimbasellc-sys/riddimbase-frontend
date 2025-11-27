import { useEffect, useId, useMemo, useState } from 'react'

// PayPal Subscriptions buttons for plan billing.
// Uses PayPal JS SDK with intent=subscription and vault=true.
export default function PayPalSubscriptionButtons({
  paypalPlanId,
  planId,
  userId,
  description = '',
  payerName = '',
  payerEmail = '',
  style,
  onSuccess,
  onError,
}) {
  const [ready, setReady] = useState(false)
  const containerId = useId()
  const clientId = (import.meta.env.VITE_PAYPAL_CLIENT_ID || '').trim()

  const sdkUrl = useMemo(() => {
    if (!clientId) return null
    const base = `https://www.paypal.com/sdk/js?client-id=${clientId}`
    const params = `&vault=true&intent=subscription&components=buttons`
    return base + params
  }, [clientId])

  useEffect(() => {
    if (!sdkUrl) {
      setReady(false)
      return
    }
    const existing = document.querySelector('script[data-rb-paypal-sub-sdk]')
    if (!existing) {
      const s = document.createElement('script')
      s.src = sdkUrl
      s.setAttribute('data-rb-paypal-sub-sdk', 'true')
      s.onload = () => setReady(true)
      s.onerror = () => {
        setReady(false)
        onError && onError(new Error('Failed to load PayPal SDK (subscriptions)'))
      }
      document.body.appendChild(s)
    } else {
      setReady(true)
    }
  }, [sdkUrl, onError])

  useEffect(() => {
    if (!ready || !window.paypal || !paypalPlanId) return
    const container = document.getElementById(containerId)
    if (!container) return
    container.innerHTML = ''
    try {
      window.paypal
        .Buttons({
          style: { layout: 'vertical', height: 42, ...(style || {}) },
          createSubscription: (data, actions) => {
            return actions.subscription.create({
              plan_id: paypalPlanId,
              custom_id:
                userId && planId
                  ? `user:${userId}|plan:${planId}`
                  : undefined,
              application_context:
                payerEmail || payerName
                  ? {
                      user_action: 'SUBSCRIBE_NOW',
                    }
                  : undefined,
            })
          },
          onApprove: async (data) => {
            try {
              onSuccess && onSuccess({ subscriptionId: data.subscriptionID, data })
            } catch (e) {
              onError && onError(e)
            }
          },
          onError: (err) => {
            onError && onError(err)
          },
        })
        .render('#' + containerId)
    } catch (e) {
      onError && onError(e)
    }
  }, [ready, paypalPlanId, planId, userId, payerEmail, payerName, style, onSuccess, onError, containerId])

  if (!clientId) {
    return (
      <div className="rounded-md border border-slate-800/60 bg-slate-950/60 p-3">
        <p className="text-[11px] text-red-300">
          Missing VITE_PAYPAL_CLIENT_ID; subscription buttons cannot render.
        </p>
      </div>
    )
  }

  if (!paypalPlanId) {
    return (
      <div className="rounded-md border border-slate-800/60 bg-slate-950/60 p-3">
        <p className="text-[11px] text-amber-300">
          Missing PayPal plan id for this subscription. Set VITE_PAYPAL_PLAN_STARTER /
          VITE_PAYPAL_PLAN_PRO in your environment.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {!ready && (
        <div className="rounded-md border border-slate-800/60 bg-slate-950/60 p-3">
          <p className="text-[11px] text-slate-400">Loading PayPal subscriptions…</p>
        </div>
      )}
      <div id={containerId} className="rounded-lg border border-slate-800/70 p-3" />
    </div>
  )
}

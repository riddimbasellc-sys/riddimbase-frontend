import { useEffect, useMemo, useState } from 'react'

// Reusable PayPal buttons group with SDK loader (PayPal only)
export default function PayPalButtonsGroup({
  amount,
  currency = 'USD',
  description = '',
  payerName = '',
  payerEmail = '',
  style,
  onSuccess,
  onError,
}) {
  const [ready, setReady] = useState(false)
  const [containerId] = useState(
    () => 'rb-paypal-' + Math.random().toString(36).slice(2)
  )
  const clientId = (import.meta.env.VITE_PAYPAL_CLIENT_ID || '').trim()

  const sdkUrl = useMemo(() => {
    if (!clientId) return null
    const base = `https://www.paypal.com/sdk/js?client-id=${clientId}`
    const params = `&currency=${encodeURIComponent(
      currency
    )}&intent=capture&components=buttons`
    return base + params
  }, [clientId, currency])

  useEffect(() => {
    if (!sdkUrl) {
      setReady(false)
      return
    }
    const existing = document.querySelector('script[data-rb-paypal-sdk]')
    if (!existing || !existing.src.includes(`currency=${currency}`)) {
      if (existing) existing.remove()
      const s = document.createElement('script')
      s.src = sdkUrl
      s.setAttribute('data-rb-paypal-sdk', 'true')
      s.onload = () => setReady(true)
      s.onerror = () => {
        setReady(false)
        onError && onError(new Error('Failed to load PayPal SDK'))
      }
      document.body.appendChild(s)
    } else {
      setReady(true)
    }
  }, [sdkUrl, currency, onError])

  useEffect(() => {
    if (!ready || !window.paypal || !amount) return
    const container = document.getElementById(containerId)
    if (!container) return
    container.innerHTML = ''
    const config = {
      style: { layout: 'vertical', height: 42, ...(style || {}) },
      createOrder: (data, actions) =>
        actions.order.create({
          purchase_units: [
            {
              amount: {
                value: Number(amount).toFixed(2),
                currency_code: currency,
              },
              description: description || undefined,
            },
          ],
          payer:
            payerEmail || payerName
              ? {
                  name: payerName ? { given_name: payerName } : undefined,
                  email_address: payerEmail || undefined,
                }
              : undefined,
        }),
      onApprove: async (data, actions) => {
        try {
          const capture = await actions.order.capture()
          onSuccess && onSuccess({ orderId: data.orderID, capture })
        } catch (e) {
          onError && onError(e)
        }
      },
      onError: (err) => onError && onError(err),
    }
    try {
      window.paypal.Buttons(config).render('#' + containerId)
    } catch (e) {
      onError && onError(e)
    }
  }, [ready, amount, currency, description, payerEmail, payerName, style, onSuccess, onError, containerId])

  return (
    <div className="space-y-3">
      {!clientId && (
        <div className="rounded-md border border-slate-800/60 bg-slate-950/60 p-3">
          <p className="text-[11px] text-red-300">
            Missing VITE_PAYPAL_CLIENT_ID; buttons cannot render.
          </p>
        </div>
      )}
      {!ready && clientId && (
        <div className="rounded-md border border-slate-800/60 bg-slate-950/60 p-3">
          <p className="text-[11px] text-slate-400">Loading PayPal…</p>
        </div>
      )}
      <div id={containerId} className="rounded-lg border border-slate-800/70 p-3" />
    </div>
  )
}


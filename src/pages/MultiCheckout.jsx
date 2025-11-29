import { useCart } from '../context/CartContext'
import { useState, useEffect } from 'react'
import { computeCartQuote, processPayment, generateLicense } from '../services/paymentsService'
import PayPalButtonsGroup from '../components/payments/PayPalButtonsGroup'
import { recordSale } from '../services/beatsService'
import { useNavigate } from 'react-router-dom'

export function MultiCheckout() {
  const { enriched, clearCart } = useCart()
  const navigate = useNavigate()
  const [buyerName, setBuyerName] = useState('')
  const [buyerEmail, setBuyerEmail] = useState('')
  const [coupon, setCoupon] = useState('')
  const [currency, setCurrency] = useState('USD')
  const [method, setMethod] = useState('paypal')
  const [paypalReady, setPaypalReady] = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)

  const quote = computeCartQuote({ items: enriched.map(e => ({ beat: e.beat, license: e.license })), currency, coupon })

  useEffect(() => { /* handled by reusable component */ }, [method, currency])

  const handlePay = async () => {
    if (!quote || !buyerEmail || !buyerName) return
    setLoading(true)
    const res = await processPayment({ amount: quote.grand, currency: quote.currency })
    if (res.success) {
      // Generate licenses sequentially
      const licenses = []
      for (const it of enriched) {
        const lic = await generateLicense({
          beatTitle: it.beat.title,
          license: it.license,
          buyerEmail,
          amount: quote.grand,
          buyerName,
          producerName: it.beat.producer,
          orderId: res.id,
        })
        licenses.push({ beatId: it.beat.id, license: it.license, pdf: lic })
        try { recordSale({ beatId: it.beat.id, license: it.license + ' License', buyer: buyerEmail, amount: it.quote?.total || it.beat.price, beatTitle: it.beat.title }) } catch {}
      }
      setResult({ success: true, payment: res, licenses })
      clearCart()
      setTimeout(()=> navigate('/artist/dashboard'), 3500)
    } else {
      setResult(res)
    }
    setLoading(false)
  }

  if (enriched.length < 2) {
    return <section className="min-h-screen bg-slate-950/95 flex items-center justify-center"><p className="text-sm text-slate-400">Need 2+ items in cart for multi-track checkout.</p></section>
  }

  return (
    <section className="bg-slate-950/95 py-10">
      <div className="mx-auto max-w-5xl px-4">
        <h1 className="font-display text-2xl font-semibold text-slate-50">Multi‑Track Checkout</h1>
        <p className="mt-1 text-sm text-slate-300">{enriched.length} items • Bulk discount automatically applied.</p>
        <div className="mt-8 grid gap-8 md:grid-cols-3">
          <div className="md:col-span-2 space-y-4">
            {enriched.map(it => (
              <div key={it.beatId} className="rounded-xl border border-slate-800/70 bg-slate-900/70 p-4">
                <p className="text-sm font-semibold text-slate-50">{it.beat.title}</p>
                <p className="text-[11px] text-slate-400">{it.beat.producer} • {it.beat.genre} • {it.beat.bpm} BPM</p>
                <p className="mt-1 text-[11px] text-emerald-300">License: {it.license}</p>
              </div>
            ))}
          </div>
          <div className="space-y-5">
            <div className="rounded-2xl border border-slate-800/70 bg-slate-900/80 p-4 space-y-3">
              <p className="text-xs font-semibold text-slate-100">Buyer Info</p>
              <input value={buyerName} onChange={e=>setBuyerName(e.target.value)} placeholder="Artist / Buyer name" className="w-full rounded-lg border border-slate-700/70 bg-slate-950/70 px-2 py-1.5 text-[12px] text-slate-100" />
              <input value={buyerEmail} onChange={e=>setBuyerEmail(e.target.value)} placeholder="you@example.com" className="w-full rounded-lg border border-slate-700/70 bg-slate-950/70 px-2 py-1.5 text-[12px] text-slate-100" />
              <div className="flex items-end gap-2">
                <input value={coupon} onChange={e=>setCoupon(e.target.value)} placeholder="SAVE10" className="flex-1 rounded-lg border border-slate-700/70 bg-slate-950/70 px-2 py-1.5 text-[12px] text-slate-100" />
                <select value={currency} onChange={e=>setCurrency(e.target.value)} className="rounded-lg border border-slate-700/70 bg-slate-950/70 px-2 py-1.5 text-[12px] text-slate-100">
                  {['USD','EUR','GBP','CAD','JMD','TTD'].map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              {quote && (
                <div className="space-y-1 text-[11px] text-slate-300">
                  <p>Items Total: {quote.currency} {quote.subtotal.toFixed(2)}</p>
                  {quote.couponDiscount > 0 && <p className="text-emerald-300">Coupon ({(quote.discountRate*100).toFixed(0)}%): −{quote.currency} {quote.couponDiscount.toFixed(2)}</p>}
                  <p>Service Fee: {quote.currency} {quote.serviceFee.toFixed(2)}</p>
                  <p className="font-semibold">Grand Total: <span className="text-emerald-400">{quote.currency} {quote.grand.toFixed(2)}</span></p>
                </div>
              )}
            </div>
            <div className="rounded-2xl border border-slate-800/70 bg-slate-900/80 p-4">
              <p className="text-xs font-semibold text-slate-100">Payment Method</p>
              <div className="mt-3 flex gap-2">
                <button type="button" onClick={()=>setMethod('paypal')} className={`rounded-full px-3 py-1.5 text-[11px] font-semibold ${method==='paypal' ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800/70 text-slate-300 hover:bg-slate-700/70'}`}>PayPal</button>
                <button type="button" onClick={()=>setMethod('card')} className={`rounded-full px-3 py-1.5 text-[11px] font-semibold ${method==='card' ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800/70 text-slate-300 hover:bg-slate-700/70'}`}>Card</button>
              </div>
              {method==='paypal' && quote && (
                <div className="mt-4 space-y-3">
                  <PayPalButtonsGroup
                    amount={quote.grand}
                    currency={quote.currency}
                    description={`RiddimBase Cart (${quote.items.length} items)`}
                    payerName={buyerName}
                    payerEmail={buyerEmail}
                    onSuccess={handlePay}
                    onError={(err)=> setResult({ success:false, error: err?.message || 'PayPal error' })}
                  />
                  <p className="text-[10px] text-slate-500">All beat licensing and service payments must be completed on-platform. Off‑platform transactions are prohibited and may result in account ban.</p>
                </div>
              )}
              {method==='card' && (
                <form onSubmit={(e)=>{e.preventDefault(); handlePay()}} className="mt-4 space-y-3">
                  <input required placeholder="Card Number" className="w-full rounded-lg border border-slate-700/70 bg-slate-950/70 px-3 py-2 text-[12px] text-slate-100" />
                  <div className="flex gap-3">
                    <input required placeholder="MM/YY" className="w-24 rounded-lg border border-slate-700/70 bg-slate-950/70 px-3 py-2 text-[12px] text-slate-100" />
                    <input required placeholder="CVC" className="w-20 rounded-lg border border-slate-700/70 bg-slate-950/70 px-3 py-2 text-[12px] text-slate-100" />
                  </div>
                  <input required placeholder="Cardholder Name" className="w-full rounded-lg border border-slate-700/70 bg-slate-950/70 px-3 py-2 text-[12px] text-slate-100" />
                  <button disabled={loading || !buyerEmail || !buyerName} className="w-full rounded-full bg-emerald-500 px-4 py-2 text-[11px] font-semibold text-slate-950 disabled:opacity-40">{loading ? 'Processing…' : `Pay ${quote?.currency} ${quote?.grand.toFixed(2)}`}</button>
                </form>
              )}
            </div>
            {method!=='paypal' && (
              <button disabled={loading || !buyerEmail || !buyerName} onClick={handlePay} className="w-full rounded-full bg-emerald-500 px-6 py-2 text-xs font-semibold text-slate-950 hover:bg-emerald-400 transition disabled:opacity-40">{loading ? 'Processing...' : `Pay & License (${quote?.currency} ${quote?.grand.toFixed(2)})`}</button>
            )}
            {result && (
              <div className="rounded-xl border border-slate-800/80 bg-slate-900/80 p-3 text-[11px] text-slate-300 space-y-1">
                {result.success ? <p>Payment successful. Generating {result.licenses?.length} licenses…</p> : <p>Payment failed.</p>}
                {result.success && result.licenses && result.licenses.map(l => (
                  <p key={l.beatId} className="text-emerald-300">{l.beatId}: <a className="underline" href={l.pdf?.publicUrl} target="_blank" rel="noreferrer">PDF</a></p>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

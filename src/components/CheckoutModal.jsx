import { useEffect, useState } from 'react'
import { computeBeatQuote } from '../services/paymentsService'
import { generateLicense } from '../services/paymentsService'
import PayPalButtonsGroup from './payments/PayPalButtonsGroup'

export default function CheckoutModal({ open, onClose, beat, license }) {
  const [buyerName, setBuyerName] = useState('')
  const [buyerEmail, setBuyerEmail] = useState('')
  const [currency, setCurrency] = useState('USD')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [showPayPal, setShowPayPal] = useState(false)
  const quote = beat && license ? computeBeatQuote({ beat, license, currency }) : null

  useEffect(()=> { if (!open) { setResult(null); setBuyerName(''); setBuyerEmail('') } }, [open])
  if (!open) return null

  useEffect(()=> { /* reset result when closed */ }, [])

  const initiatePayPal = () => {
    if (!quote || !buyerEmail || !buyerName) return
    setShowPayPal(true)
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-2xl border border-slate-800/80 bg-slate-900/90 p-5 shadow-xl space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-100">Checkout</h2>
          <button onClick={onClose} className="rounded-full bg-slate-800/70 px-3 py-1 text-[11px] text-slate-300 hover:bg-slate-700/70">Close</button>
        </div>
        <div className="text-[12px] text-slate-300">
          <p className="font-medium text-slate-200">{beat.title}</p>
          <p className="text-[11px] text-slate-500">{beat.producer} • {beat.genre} • {beat.bpm} BPM</p>
          <p className="mt-2 text-[11px] text-emerald-300">License: {license}</p>
          {quote && (
            <div className="mt-2 space-y-1 text-[11px]">
              <p className="flex justify-between"><span>Base ({license})</span><span>${quote.base.toFixed(2)} × {quote.multiplier}</span></p>
              <p className="flex justify-between font-semibold text-slate-50"><span>Total</span><span>{quote.currency} {quote.total.toFixed(2)}</span></p>
            </div>
          )}
        </div>
        <div className="space-y-3">
          <div className="grid gap-2 md:grid-cols-2">
            <div>
              <label className="text-[10px] font-semibold text-slate-400">Your Name</label>
              <input value={buyerName} onChange={e=>setBuyerName(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-700/70 bg-slate-950/70 px-2 py-1.5 text-[12px] text-slate-100" />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-slate-400">Email</label>
              <input value={buyerEmail} onChange={e=>setBuyerEmail(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-700/70 bg-slate-950/70 px-2 py-1.5 text-[12px] text-slate-100" />
            </div>
          </div>
          <div>
            <label className="text-[10px] font-semibold text-slate-400">Currency</label>
            <select value={currency} onChange={e=>setCurrency(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-700/70 bg-slate-950/70 px-2 py-1.5 text-[12px] text-slate-100">
              {['USD','EUR','GBP','CAD','JMD','TTD'].map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <div className="space-y-2">
          {!showPayPal && (
            <button disabled={loading || !buyerEmail || !buyerName} onClick={initiatePayPal} className="w-full rounded-full bg-emerald-500 px-4 py-2 text-[12px] font-semibold text-slate-950 disabled:opacity-40">{loading ? 'Loading…' : `Pay ${quote?.currency} ${quote?.total.toFixed(2)}`}</button>
          )}
          {showPayPal && quote && (
            <PayPalButtonsGroup
              amount={quote.total}
              currency={quote.currency}
              description={`License: ${license} • ${beat.title}`}
              payerName={buyerName}
              payerEmail={buyerEmail}
              onSuccess={async () => {
                setLoading(true)
                try {
                  const lic = await generateLicense({ beatTitle: beat.title, license, buyerEmail, amount: quote.total })
                  setResult({ success: true, license: lic })
                } catch (e) {
                  setResult({ success: false, error: e?.message || 'Approval error' })
                }
                setLoading(false)
              }}
              onError={(err) => setResult({ success:false, error: err?.message || 'PayPal error' })}
            />
          )}
          <p className="text-[10px] text-slate-500 leading-relaxed">Delivery of files and license PDF is instant after payment. Off‑platform payments are prohibited.</p>
        </div>
        {result && (
          <div className="rounded-xl border border-slate-800/70 bg-slate-950/70 p-3 text-[11px] text-slate-300 space-y-1">
            {result.success ? <p>Payment successful. License generated.</p> : <p className="text-red-300">Payment failed: {result.error || 'Error'}</p>}
            {result.success && result.license && <p className="text-emerald-300">License Ready: <a href={result.license.publicUrl} target="_blank" rel="noreferrer" className="underline">Download PDF</a></p>}
          </div>
        )}
      </div>
    </div>
  )
}

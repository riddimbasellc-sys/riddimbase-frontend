import { useState } from 'react'
import { useCart } from '../context/CartContext'
import { useNavigate } from 'react-router-dom'
import { computeCartQuote } from '../services/paymentsService'

const LICENSES = ['Basic','Premium','Unlimited','Exclusive']

export function Cart() {
  const { enriched, updateLicense, removeBeat, clearCart } = useCart()
  const navigate = useNavigate()
  const [showServiceFeeInfo, setShowServiceFeeInfo] = useState(false)
  const singleReady = enriched.length === 1 && enriched[0].beat
  const multiReady = enriched.length >= 2 && enriched.every(e => e.beat)
  const cartQuote = computeCartQuote({ items: enriched.map(e => ({ beat: e.beat, license: e.license })) })

  return (
    <section className="bg-slate-950/95 py-6 min-h-screen sm:py-10">
      <div className="mx-auto max-w-6xl px-3 flex flex-col gap-6 sm:px-4 md:flex-row md:gap-8">
        <div className="flex-1 space-y-4">
          <div className="rb-card p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-semibold text-slate-100">Billing and licensing information</p>
            <div className="flex gap-2">
              <button onClick={clearCart} className="rb-btn-outline">Clear</button>
            </div>
          </div>
          {enriched.length === 0 && (
            <div className="rb-card p-6 text-center text-sm text-slate-400">Cart empty. Browse beats to add.</div>
          )}
          {enriched.map(it => (
            <div key={it.beatId} className="rb-card p-4 space-y-3">
              <div className="flex items-start gap-4">
                <div className="h-20 w-20 rounded-xl overflow-hidden bg-gradient-to-br from-emerald-500 via-emerald-400 to-orange-500 flex-shrink-0">
                  <div className="flex h-full w-full items-center justify-center text-[10px] font-semibold text-slate-950/80">RB</div>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-50">{it.beat?.title || 'Beat unavailable'}</p>
                  <p className="text-[11px] text-slate-400">{it.beat?.producer} • {it.beat?.genre} • {it.beat?.bpm} BPM</p>
                  <div className="mt-2 flex items-center gap-2">
                    <select aria-label="License tier" value={it.license} onChange={e=>updateLicense(it.beatId, e.target.value)} className="rounded-lg border border-slate-700/70 bg-slate-950/70 px-2 py-1 text-[11px] text-slate-100 rb-focus">
                      {LICENSES.map(l => <option key={l}>{l}</option>)}
                    </select>
                    <span className="text-xs font-semibold text-emerald-400">${(it.quote?.total || 0).toFixed(2)}</span>
                    <button onClick={()=>removeBeat(it.beatId)} className="ml-auto rb-btn-outline">Remove</button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        <aside className="w-full md:w-80 mt-4 md:mt-0">
          <div className="rb-panel p-5 space-y-4">
            <p className="text-sm font-semibold text-slate-100">Cart Summary</p>
            {cartQuote && (
              <div className="space-y-1 text-[12px] text-slate-300">
                <p className="flex justify-between"><span>Items Total</span><span>${cartQuote.subtotal.toFixed(2)}</span></p>
                {cartQuote.couponDiscount > 0 && (
                  <p className="flex justify-between text-emerald-300">
                    <span>Coupon ({(cartQuote.discountRate * 100).toFixed(0)}%)</span>
                    <span>- ${cartQuote.couponDiscount.toFixed(2)}</span>
                  </p>
                )}
                {cartQuote.serviceFee > 0 && (
                  <p className="flex justify-between">
                    <span className="relative inline-flex items-center gap-1">
                      Service Fee
                      <button
                        type="button"
                        className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-slate-500 text-[9px] text-slate-200 rb-focus"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          setShowServiceFeeInfo((v) => !v)
                        }}
                        onMouseEnter={() => setShowServiceFeeInfo(true)}
                        onMouseLeave={() => setShowServiceFeeInfo(false)}
                        aria-expanded={showServiceFeeInfo}
                        aria-label="Show service fee details"
                      >
                        i
                      </button>
                      {showServiceFeeInfo && (
                        <span className="absolute left-0 top-5 z-20 w-64 rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[10px] text-slate-100 shadow-lg">
                          These fees contribute to maintaining and enhancing the platform, ensuring a seamless and secure experience for all users.
                        </span>
                      )}
                    </span>
                    <span>${cartQuote.serviceFee.toFixed(2)}</span>
                  </p>
                )}
                <p className="mt-2 flex justify-between text-[13px] font-semibold text-slate-50">
                  <span>Total ({enriched.length} {enriched.length === 1 ? 'item' : 'items'})</span>
                  <span>${cartQuote.grand.toFixed(2)}</span>
                </p>
              </div>
            )}
            <div>
              <button
                disabled={!singleReady && !multiReady}
                onClick={() => {
                  if (singleReady) {
                    const first = enriched[0]
                    const isFree = !!(first.beat && (first.beat.freeDownload || first.beat.free_download))
                    const modeParam = isFree ? 'mode=free' : `license=${first.license}`
                    navigate(
                      `/checkout/${first.beatId}?${modeParam}`,
                      {
                        state: { beat: first.beat },
                      },
                    )
                  } else if (multiReady) {
                    navigate('/checkout/cart')
                  }
                }}
                className="w-full rb-btn-primary disabled:opacity-40"
                aria-label="Proceed to checkout"
              >
                Proceed to Checkout
              </button>
              {!singleReady && !multiReady && <p className="mt-2 text-[11px] text-slate-400">Add beats to begin checkout.</p>}
            </div>
            <p className="mt-2 text-[10px] text-slate-500 leading-relaxed">By clicking the "Proceed to checkout" button, you agree to our <a href="#" className="underline">Refund Policy</a>, <a href="#" className="underline">Terms of Service</a>, and <a href="#" className="underline">Privacy Policy</a>. Taxes may apply.</p>
          </div>
        </aside>
      </div>
    </section>
  )
}

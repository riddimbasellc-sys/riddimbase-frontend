import { useCart } from '../context/CartContext'
import { Link } from 'react-router-dom'

export default function CartPanel({ onClose }) {
  const { enriched, updateLicense, removeBeat, totals } = useCart() || {}
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button onClick={onClose} className="absolute inset-0 bg-slate-950/95" aria-label="Close cart overlay" />
      <div className="relative flex h-full w-full max-w-md flex-col border-l border-slate-800/70 bg-slate-900/95 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-800/60 px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-100">Your Cart</h2>
          <button onClick={onClose} className="rounded-full bg-slate-800/70 px-3 py-1 text-[11px] text-slate-300 hover:bg-slate-700/70">Close</button>
        </div>
        <div className="flex-1 overflow-auto px-5 py-4 space-y-4">
          {enriched && enriched.map(it => (
            <div key={it.beatId} className="rounded-xl border border-slate-800/70 bg-slate-950/70 p-3 text-[12px] flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-slate-100 truncate">{it.beat?.title || 'Beat'}</p>
                <button onClick={()=>removeBeat && removeBeat(it.beatId)} className="text-[10px] text-red-300 hover:text-red-200">Remove</button>
              </div>
              <p className="text-[10px] text-slate-400 truncate">{it.beat?.genre} • {it.beat?.bpm} BPM</p>
              <div className="flex items-center gap-2">
                <select value={it.license} onChange={e=>updateLicense && updateLicense(it.beatId, e.target.value)} className="rounded-lg border border-slate-700/70 bg-slate-950/70 px-2 py-1 text-[11px] text-slate-100">
                  {['Basic','Premium','Unlimited','Exclusive'].map(l => <option key={l}>{l}</option>)}
                </select>
                <span className="ml-auto text-[11px] font-semibold text-emerald-300">${it.quote?.total.toFixed(2)}</span>
              </div>
            </div>
          ))}
          {(!enriched || enriched.length===0) && <p className="text-xs text-slate-500">Your cart is empty.</p>}
        </div>
        <div className="border-t border-slate-800/60 p-5 space-y-2 text-[12px]">
          <div className="flex justify-between">
            <span className="text-slate-400">Subtotal</span>
            <span className="font-medium text-slate-200">
              ${totals?.subtotal.toFixed(2) || '0.00'}
            </span>
          </div>
          <div className="flex justify-between text-sm font-semibold">
            <span className="text-slate-100">Grand Total</span>
            <span className="text-emerald-400">
              ${totals?.grand.toFixed(2) || '0.00'}
            </span>
          </div>
          <div className="pt-2 flex flex-col gap-2">
            <p className="text-[10px] text-slate-400">Select a beat to purchase from its detail page.</p>
            <p className="text-[10px] text-slate-500 leading-relaxed">Secure on-platform payments only. Instant file delivery & license PDF after payment.</p>
          </div>
          {enriched && enriched.length > 0 && (
            <div className="pt-3">
              <Link
                to="/cart"
                onClick={onClose}
                className="block w-full rounded-full bg-emerald-500 px-4 py-2 text-center text-[11px] font-semibold text-slate-950 shadow-rb-soft hover:bg-emerald-400 transition"
              >
                Checkout
              </Link>
              <p className="mt-2 text-[10px] text-slate-500 text-center">Review cart & finalize purchase.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

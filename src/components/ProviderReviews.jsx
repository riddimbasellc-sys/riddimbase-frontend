import { listProviderReviews } from '../services/serviceJobRequestsService'

export function ProviderReviews({ providerId }) {
  const reviews = listProviderReviews(providerId)
  if (reviews.length === 0) return null
  const avg = reviews.reduce((sum,r)=> sum + (r.rating||0),0)/reviews.length
  return (
    <div className="mt-3 rounded-xl border border-slate-800/70 bg-slate-900/70 p-3">
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-slate-100">Reviews</span>
        <span className="rounded-full border border-emerald-400/50 bg-emerald-500/10 px-2 py-[2px] text-[11px] font-semibold text-emerald-200">{avg.toFixed(1)} ★ ({reviews.length})</span>
      </div>
      <ul className="mt-2 space-y-2 text-[11px] text-slate-300">
        {reviews.slice(0,3).map(r => (
          <li key={r.id} className="rounded-lg border border-slate-800/60 bg-slate-800/40 p-2">
            <div className="flex items-center gap-2">
              <span className="text-amber-300">{'★'.repeat(r.rating)}</span>
              <span className="text-slate-400">{new Date(r.createdAt).toLocaleDateString()}</span>
            </div>
            {r.text && <p className="mt-1 text-slate-200">{r.text}</p>}
          </li>
        ))}
      </ul>
    </div>
  )
}

export default ProviderReviews

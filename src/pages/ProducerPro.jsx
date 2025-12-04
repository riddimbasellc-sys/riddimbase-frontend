import BackButton from '../components/BackButton'
import useSupabaseUser from '../hooks/useSupabaseUser'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { listPlans } from '../services/plansRepository'
import { getSubscription, cancelSubscription, isPro } from '../services/subscriptionService'

export function ProducerPro() {
  const { user, loading } = useSupabaseUser()
  const [plans, setPlans] = useState([])
  const [sub, setSub] = useState(null)
  const navigate = useNavigate()
  useEffect(()=> { (async ()=> { setPlans(await listPlans()) })() }, [])
  useEffect(()=> {
    let active = true
    if (user) {
      ;(async () => {
        const s = await getSubscription(user.id)
        if (active) setSub(s)
      })()
    } else {
      setSub(null)
    }
    return () => { active = false }
  }, [user])

  if (loading) return <section className="min-h-screen flex items-center justify-center bg-slate-950/95"><p className="text-xs text-slate-400">Loading...</p></section>
  if (!user) return <section className="min-h-screen flex items-center justify-center bg-slate-950/95"><p className="text-xs text-slate-400">Login required.</p></section>

  const proPlans = plans.filter(p => p.id === 'pro')
  // Redirect to subscription checkout using producer-specific Pro flow
  const handleActivate = () => { navigate('/subscribe/pro?kind=producer') }
  const handleCancel = async () => {
    await cancelSubscription(user.id)
    setSub(await getSubscription(user.id))
  }

  return (
    <section className="bg-slate-950/95">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="flex items-center gap-3">
          <BackButton />
          <h1 className="font-display text-2xl font-semibold text-slate-50">Producer Pro</h1>
        </div>
        <p className="mt-1 text-sm text-slate-300 max-w-2xl">Upgrade your production toolkit. Producer Pro unlocks higher visibility, unlimited uploads, advanced analytics and faster payouts.</p>
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          <div className={`relative flex flex-col rounded-2xl border ${sub?.planId === 'pro' ? 'border-emerald-500/80' : 'border-slate-800/80'} bg-slate-900/80 p-5`}>
            <div className="flex items-baseline justify-between">
              <h2 className="text-sm font-semibold text-slate-100">Producer Pro</h2>
              {sub?.planId === 'pro' && (
                <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-300">
                  Active
                </span>
              )}
            </div>
            <p className="mt-2 text-3xl font-bold tracking-tight text-emerald-400">
              $19.99<span className="ml-1 text-xs font-medium text-slate-400">/mo</span>
            </p>
            <ul className="mt-4 flex-1 space-y-2 text-[11px] text-slate-300">
              <li className="flex items-start gap-2"><span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-emerald-400/90" /><span>Unlimited active beats</span></li>
              <li className="flex items-start gap-2"><span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-emerald-400/90" /><span>Unlimited in-platform messaging with artists & clients</span></li>
              <li className="flex items-start gap-2"><span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-emerald-400/90" /><span>Upload & sell soundkits (drums, loops, samples)</span></li>
              <li className="flex items-start gap-2"><span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-emerald-400/90" /><span>Real-time sales dashboard</span></li>
              <li className="flex items-start gap-2"><span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-emerald-400/90" /><span>Priority chat support</span></li>
              <li className="flex items-start gap-2"><span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-emerald-400/90" /><span>Boosted visibility on homepage & search</span></li>
              <li className="flex items-start gap-2"><span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-emerald-400/90" /><span>Early access to new tools</span></li>
            </ul>
            {sub?.planId !== 'pro' && (
              <button
                type="button"
                onClick={handleActivate}
                className="mt-5 rounded-full bg-emerald-500 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-emerald-400 transition"
              >
                Activate Producer Pro
              </button>
            )}
            {sub?.planId === 'pro' && (
              <button
                type="button"
                onClick={handleCancel}
                className="mt-5 rounded-full border border-red-400/60 px-4 py-2 text-xs font-semibold text-red-300 hover:bg-red-500/10 transition"
              >
                Cancel Plan
              </button>
            )}
          </div>
        </div>
        <div className="mt-10 rounded-2xl border border-slate-800/80 bg-slate-900/80 p-6">
          <h3 className="text-sm font-semibold text-slate-100">Included With Pro</h3>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2 text-[11px] text-slate-300">
            {['Pro badge','Unlimited uploads','Unlimited in-platform messaging','Upload & sell soundkits','Higher visibility ranking','Custom profile banners','Advanced analytics','Automated tagging','Playlist placement','Instant payout processing'].map(x => (
              <li key={x} className="flex items-start gap-2"><span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-emerald-400/90" /><span>{x}</span></li>
            ))}
          </ul>
          <p className="mt-4 text-[10px] text-slate-500">Feature rollout is staged; some items are placeholders pending backend services.</p>
        </div>
      </div>
    </section>
  )
}

export default ProducerPro

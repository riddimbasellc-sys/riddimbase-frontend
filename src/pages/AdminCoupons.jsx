import { useAdminRole } from '../hooks/useAdminRole'
import BackButton from '../components/BackButton'
import { listCoupons, createCoupon, deleteCoupon, toggleCoupon } from '../services/couponsService'
import { listPlans } from '../services/plansRepository'
import { useEffect, useState } from 'react'

export function AdminCoupons() {
  const { isAdmin, loading } = useAdminRole()
  const [items, setItems] = useState([])
  const [code, setCode] = useState('')
  const [type, setType] = useState('fixed')
  const [value, setValue] = useState('')
  const [maxRedemptions, setMaxRedemptions] = useState('')
  const [selectedTargets, setSelectedTargets] = useState([]) // keys like starter-monthly, pro-yearly, pro-producer
  const [plans, setPlans] = useState([])

  useEffect(() => {
    if (!isAdmin) return
    ;(async () => {
      const rows = await listCoupons()
      setItems(rows || [])
      try {
        const ps = await listPlans({ includeHidden: true })
        setPlans(ps || [])
      } catch {
        setPlans([])
      }
    })()
  }, [isAdmin])
  if (loading) return <section className="min-h-screen flex items-center justify-center bg-slate-950/95"><p className="text-sm text-slate-400">Loading auth…</p></section>
  if (!isAdmin) return <section className="min-h-screen flex items-center justify-center bg-slate-950/95"><p className="text-sm text-slate-400">Access denied.</p></section>

  const create = async (e) => {
    e.preventDefault()
    if (!code || !value) return
    // Translate selected checkbox keys into planTargets
    const planTargets = selectedTargets.map(k => {
      if (k === 'starter-monthly') return { planId: 'starter', billingCycle: 'monthly' }
      if (k === 'starter-yearly') return { planId: 'starter', billingCycle: 'yearly' }
      if (k === 'pro-monthly') return { planId: 'pro', billingCycle: 'monthly' }
      if (k === 'pro-yearly') return { planId: 'pro', billingCycle: 'yearly' }
      if (k === 'pro-producer') return { planId: 'pro', kind: 'producer' }
      return null
    }).filter(Boolean)

    await createCoupon({
      code,
      type,
      value: Number(value),
      maxRedemptions: Number(maxRedemptions || 0),
      planTargets,
    })
    const rows = await listCoupons()
    setItems(rows || [])
    setCode('')
    setValue('')
    setMaxRedemptions('')
    setSelectedTargets([])
  }

  return (
    <section className="bg-slate-950/95">
      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="flex items-center gap-3">
          <BackButton />
          <h1 className="font-display text-2xl font-semibold text-slate-50">Subscription Coupons</h1>
        </div>
        <p className="mt-1 text-sm text-slate-300">Create and manage discount codes for subscription plans only.</p>
        <form onSubmit={create} className="mt-6 grid gap-3 rounded-2xl border border-slate-800/80 bg-slate-900/80 p-4 md:grid-cols-6">
          <div className="flex flex-col">
            <label className="text-[10px] font-semibold text-slate-400">Code</label>
            <input value={code} onChange={e=>setCode(e.target.value)} placeholder="SUMMER25" className="mt-1 rounded-lg border border-slate-700/70 bg-slate-950/70 px-2 py-1.5 text-[12px] text-slate-100" />
          </div>
          <div className="flex flex-col">
            <label className="text-[10px] font-semibold text-slate-400">Type</label>
            <select value={type} onChange={e=>setType(e.target.value)} className="mt-1 rounded-lg border border-slate-700/70 bg-slate-950/70 px-2 py-1.5 text-[12px] text-slate-100">
              <option value="fixed">Fixed $</option>
              <option value="percent">Percent %</option>
            </select>
          </div>
          <div className="flex flex-col">
            <label className="text-[10px] font-semibold text-slate-400">Value</label>
            <input value={value} onChange={e=>setValue(e.target.value)} type="number" min="0" step="0.01" className="mt-1 rounded-lg border border-slate-700/70 bg-slate-950/70 px-2 py-1.5 text-[12px] text-slate-100" />
          </div>
          <div className="flex flex-col">
            <label className="text-[10px] font-semibold text-slate-400">Max Uses (0=∞)</label>
            <input value={maxRedemptions} onChange={e=>setMaxRedemptions(e.target.value)} type="number" min="0" step="1" className="mt-1 rounded-lg border border-slate-700/70 bg-slate-950/70 px-2 py-1.5 text-[12px] text-slate-100" />
          </div>
          <div className="flex flex-col">
            <label className="text-[10px] font-semibold text-slate-400">Plans (leave empty = all)</label>
            <div className="mt-1 grid grid-cols-2 gap-2 md:grid-cols-3">
              {(() => {
                const nonFree = (plans || []).filter(p => p.id !== 'free')
                const hasStarter = nonFree.some(p => p.id === 'starter')
                const hasPro = nonFree.some(p => p.id === 'pro')
                const options = []
                if (hasStarter) {
                  options.push(
                    { key: 'starter-monthly', label: 'Monthly Starter' },
                    { key: 'starter-yearly', label: 'Yearly Starter' },
                  )
                }
                if (hasPro) {
                  options.push(
                    { key: 'pro-monthly', label: 'Monthly Pro' },
                    { key: 'pro-yearly', label: 'Yearly Pro' },
                    { key: 'pro-producer', label: 'Producer Pro' },
                  )
                }
                return options.map(opt => {
                  const checked = selectedTargets.includes(opt.key)
                  return (
                    <label key={opt.key} className="flex items-center gap-2 text-[12px] text-slate-200">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e)=>{
                          setSelectedTargets(prev => {
                            if (e.target.checked) return Array.from(new Set([...prev, opt.key]))
                            return prev.filter(k => k !== opt.key)
                          })
                        }}
                      />
                      <span>{opt.label}</span>
                    </label>
                  )
                })
              })()}
            </div>
          </div>
          <div className="flex items-end">
            <button type="submit" className="w-full rounded-full bg-emerald-500 px-4 py-2 text-[11px] font-semibold text-slate-950 hover:bg-emerald-400">Create</button>
          </div>
        </form>
        <div className="mt-6 space-y-3">
          {items.map(c => (
            <div key={c.id} className="rounded-xl border border-slate-800/80 bg-slate-900/80 p-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between text-[12px]">
              <div>
                <p className="font-semibold text-slate-100">{c.code}</p>
                <p className="text-[10px] text-slate-400">
                  {c.type==='fixed'?'$'+c.value: c.value+'%'} • {
                    (c.targets && c.targets.length>0)
                      ? `Plans: ${c.targets.map(t => {
                          if (t.planId==='starter' && t.billingCycle==='monthly') return 'Monthly Starter'
                          if (t.planId==='starter' && t.billingCycle==='yearly') return 'Yearly Starter'
                          if (t.planId==='pro' && t.kind==='producer') return 'Producer Pro'
                          if (t.planId==='pro' && t.billingCycle==='monthly') return 'Monthly Pro'
                          if (t.planId==='pro' && t.billingCycle==='yearly') return 'Yearly Pro'
                          return t.planId
                        }).join(', ')}`
                      : (c.planId ? `Plan: ${c.planId}` : 'All plans')
                  } • Used {c.used}{c.maxRedemptions?'/'+c.maxRedemptions:''} • {c.active?'Active':'Disabled'}
                </p>
              </div>
              <div className="flex gap-2 text-[10px]">
                <button
                  onClick={async () => {
                    await toggleCoupon(c.id)
                    const rows = await listCoupons()
                    setItems(rows || [])
                  }}
                  className="rounded-full border border-emerald-500/60 px-3 py-1 text-emerald-300 hover:bg-emerald-500/10"
                >
                  {c.active ? 'Disable' : 'Enable'}
                </button>
                <button
                  onClick={async () => {
                    await deleteCoupon(c.id)
                    const rows = await listCoupons()
                    setItems(rows || [])
                  }}
                  className="rounded-full border border-red-500/60 px-3 py-1 text-red-300 hover:bg-red-500/10"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
          {items.length===0 && <p className="text-xs text-slate-500">No coupons yet.</p>}
        </div>
        <p className="mt-6 text-[10px] text-slate-500">Coupons only apply to paid subscription plans. They cannot be used for beats or services.</p>
      </div>
    </section>
  )
}

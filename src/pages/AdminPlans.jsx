import { useAdminRole } from '../hooks/useAdminRole'
import BackButton from '../components/BackButton'
import { useState, useEffect } from 'react'
import { listPlans, createPlan, updatePlan, deletePlan, togglePlanVisibility, reorderPlans } from '../services/plansRepository'

export function AdminPlans() {
  const { isAdmin, loading } = useAdminRole()
  const [plans, setPlans] = useState([])
  const [loadingPlans, setLoadingPlans] = useState(true)
  useEffect(()=>{ (async ()=> { setPlans(await listPlans({ includeHidden:true })); setLoadingPlans(false) })() }, [])
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ name:'', monthly:'', yearly:'', badge:'', features:'', cta:'Choose Plan' })
  const [error, setError] = useState('')

  if (loading) return <section className="min-h-screen flex items-center justify-center bg-slate-950/95"><p className="text-sm text-slate-400">Loading auth…</p></section>
  if (!isAdmin) return <section className="min-h-screen flex items-center justify-center bg-slate-950/95"><p className="text-sm text-slate-400">Access denied.</p></section>

  const resetForm = () => { setForm({ name:'', monthly:'', yearly:'', badge:'', features:'', cta:'Choose Plan' }); setEditing(null); setError('') }

  const submit = async (e) => {
    e.preventDefault(); setError('')
    const payload = { name: form.name.trim(), monthly: Number(form.monthly)||0, yearly: Number(form.yearly)||0, badge: form.badge.trim()||'', cta: form.cta.trim()||'Choose Plan', features: form.features.split('\n').map(f=>f.trim()).filter(Boolean) }
    try {
      if (editing) { await updatePlan(editing, payload) } else { await createPlan(payload) }
      setPlans(await listPlans({ includeHidden:true })); resetForm()
    } catch (err) { setError(err.message) }
  }

  const startEdit = (p) => {
    setEditing(p.id); setForm({ name:p.name, monthly:String(p.monthly), yearly:String(p.yearly), badge:p.badge||'', features:p.features.join('\n'), cta:p.cta||'Choose Plan' })
  }

  const remove = async (id) => { if (!confirm('Delete plan?')) return; await deletePlan(id); setPlans(await listPlans({ includeHidden:true })) }
  const toggle = async (p) => { await togglePlanVisibility(p.id, !p.hidden); setPlans(await listPlans({ includeHidden:true })) }

  const moveUp = async (idx) => { if (idx===0) return; const ids = [...plans.map(p=>p.id)]; [ids[idx-1], ids[idx]] = [ids[idx], ids[idx-1]]; await reorderPlans(ids); setPlans(await listPlans({ includeHidden:true })) }
  const moveDown = async (idx) => { if (idx===plans.length-1) return; const ids = [...plans.map(p=>p.id)]; [ids[idx], ids[idx+1]] = [ids[idx+1], ids[idx]]; await reorderPlans(ids); setPlans(await listPlans({ includeHidden:true })) }

  return (
    <section className="bg-slate-950/95">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="flex items-center gap-3">
          <BackButton />
          <h1 className="font-display text-2xl font-semibold text-slate-50">Manage Pricing Plans</h1>
        </div>
        <p className="mt-1 text-sm text-slate-300">Create, edit, reorder and hide subscription plans.</p>
        <div className="mt-8 grid gap-8 md:grid-cols-[1.2fr,1fr]">
          <div className="space-y-4">
            {loadingPlans && <p className="text-xs text-slate-400">Loading plans…</p>}
            {!loadingPlans && plans.map((p,idx)=>(
              <div key={p.id} className="rounded-2xl border border-slate-800/80 bg-slate-900/80 p-4 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-slate-100">{p.name} {p.hidden && <span className="ml-2 rounded-full bg-slate-700 px-2 py-0.5 text-[10px] text-slate-300">Hidden</span>}</h2>
                  <div className="flex gap-2">
                    <button onClick={()=>moveUp(idx)} className="rounded-full border border-slate-700 px-2 py-1 text-[10px] text-slate-300 hover:bg-slate-800" title="Move Up">↑</button>
                    <button onClick={()=>moveDown(idx)} className="rounded-full border border-slate-700 px-2 py-1 text-[10px] text-slate-300 hover:bg-slate-800" title="Move Down">↓</button>
                    <button onClick={()=>startEdit(p)} className="rounded-full border border-emerald-500/60 px-2 py-1 text-[10px] text-emerald-300 hover:bg-emerald-500/10">Edit</button>
                    <button onClick={()=>toggle(p)} className="rounded-full border border-amber-500/60 px-2 py-1 text-[10px] text-amber-300 hover:bg-amber-500/10">{p.hidden?'Show':'Hide'}</button>
                    <button onClick={()=>remove(p.id)} className="rounded-full border border-rose-500/60 px-2 py-1 text-[10px] text-rose-300 hover:bg-rose-500/10">Delete</button>
                  </div>
                </div>
                <p className="text-xs text-emerald-300">Monthly: {p.monthly===0?'Free':`$${p.monthly}`} • Yearly: {p.yearly===0?'Free':`$${p.yearly}`}</p>
                {p.badge && <p className="text-[11px] text-slate-400">Badge: {p.badge}</p>}
                <ul className="mt-2 space-y-1 text-[11px] text-slate-300">
                  {p.features.map(f => <li key={f}>• {f}</li>)}
                </ul>
              </div>
            ))}
            {!loadingPlans && plans.length===0 && <p className="text-xs text-slate-400">No plans defined.</p>}
          </div>
          <form onSubmit={submit} className="rounded-2xl border border-slate-800/80 bg-slate-900/80 p-5 space-y-4 h-fit">
            <h2 className="text-sm font-semibold text-slate-100">{editing ? 'Edit Plan' : 'Create New Plan'}</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-[10px] font-semibold text-slate-400">Name</label>
                <input required value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100" />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-400">Badge (optional)</label>
                <input value={form.badge} onChange={e=>setForm(f=>({...f,badge:e.target.value}))} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100" />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-400">Monthly Price</label>
                <input type="number" value={form.monthly} onChange={e=>setForm(f=>({...f,monthly:e.target.value}))} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100" />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-400">Yearly Price</label>
                <input type="number" value={form.yearly} onChange={e=>setForm(f=>({...f,yearly:e.target.value}))} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100" />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-semibold text-slate-400">Call To Action Text</label>
              <input value={form.cta} onChange={e=>setForm(f=>({...f,cta:e.target.value}))} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100" />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-slate-400">Features (one per line)</label>
              <textarea rows={6} value={form.features} onChange={e=>setForm(f=>({...f,features:e.target.value}))} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100" />
            </div>
            {error && <p className="text-[11px] text-rose-400">{error}</p>}
            <div className="flex gap-3">
              <button type="submit" className="rounded-full bg-emerald-500 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-emerald-400">{editing ? 'Save Changes' : 'Create Plan'}</button>
              {editing && <button type="button" onClick={resetForm} className="rounded-full bg-slate-700 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-600">Cancel</button>}
            </div>
            <p className="mt-2 text-[10px] text-slate-500">Changes are stored locally now—connect Supabase table later for multi-admin sync.</p>
          </form>
        </div>
      </div>
    </section>
  )
}

export default AdminPlans

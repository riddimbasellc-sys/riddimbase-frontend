import { useAdminRole } from '../hooks/useAdminRole'
import BackButton from '../components/BackButton'
import { listBeats, hideBeat, deleteBeat, flagProducer } from '../services/beatsService'
import { useState } from 'react'

export function AdminBeats() {
  const { isAdmin, loading } = useAdminRole()
  const [items, setItems] = useState(listBeats({ includeHidden: true }))
  if (loading) return <section className="min-h-screen flex items-center justify-center bg-slate-950/95"><p className="text-sm text-slate-400">Loading auth…</p></section>
  if (!isAdmin) return <section className="min-h-screen flex items-center justify-center bg-slate-950/95"><p className="text-sm text-slate-400">Access denied.</p></section>

  const doHide = (id) => { hideBeat(id); setItems(listBeats({ includeHidden: true })) }
  const doDelete = (id) => { deleteBeat(id); setItems(listBeats({ includeHidden: true })) }
  const doFlag = (id) => { flagProducer(id); setItems(listBeats({ includeHidden: true })) }

  return (
    <section className="bg-slate-950/95">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="flex items-center gap-3">
          <BackButton />
          <h1 className="font-display text-2xl font-semibold text-slate-50">Manage Beats</h1>
        </div>
        <p className="mt-1 text-sm text-slate-300">Admin tools for moderation.</p>
        <div className="mt-6 space-y-3">
          {items.map(b => (
            <div key={b.id} className="rounded-xl border border-slate-800/80 bg-slate-900/80 p-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-100">{b.title} {b.hidden && <span className="text-[10px] ml-1 rounded-full bg-slate-800 px-2 py-0.5">Hidden</span>} {b.flagged && <span className="text-[10px] ml-1 rounded-full bg-red-600/20 text-red-400 px-2 py-0.5">Flagged</span>}</p>
                <p className="text-[11px] text-slate-400">{b.producer} • {b.genre} • {b.bpm} BPM</p>
              </div>
              <div className="flex gap-2 text-[11px]">
                {!b.hidden && <button onClick={()=>doHide(b.id)} className="rounded-full border border-slate-700/70 px-3 py-1 text-slate-300 hover:border-emerald-400/70">Hide</button>}
                <button onClick={()=>doFlag(b.id)} className="rounded-full border border-red-600/40 px-3 py-1 text-red-400 hover:bg-red-600/10">Flag</button>
                <button onClick={()=>doDelete(b.id)} className="rounded-full border border-slate-700/70 px-3 py-1 text-slate-300 hover:border-red-500/70">Delete</button>
              </div>
            </div>
          ))}
          {items.length === 0 && <p className="text-sm text-slate-400">No beats.</p>}
        </div>
      </div>
    </section>
  )
}

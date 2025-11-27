import { useAdminRole } from '../hooks/useAdminRole'
import BackButton from '../components/BackButton'
import { listUsers, banUser, approveProducer, resetPassword } from '../services/adminMetricsService'
import { useState } from 'react'

export function AdminUsers() {
  const { isAdmin, loading } = useAdminRole()
  const [users, setUsers] = useState(listUsers())
  if (loading) return <section className="min-h-screen flex items-center justify-center bg-slate-950/95"><p className="text-sm text-slate-400">Loading auth…</p></section>
  if (!isAdmin) return <section className="min-h-screen flex items-center justify-center bg-slate-950/95"><p className="text-sm text-slate-400">Access denied.</p></section>

  const update = () => setUsers([...listUsers()])

  return (
    <section className="bg-slate-950/95">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="flex items-center gap-3">
          <BackButton />
          <h1 className="font-display text-2xl font-semibold text-slate-50">Manage Users</h1>
        </div>
        <p className="mt-1 text-sm text-slate-300">Moderate accounts & producers.</p>
        <div className="mt-6 space-y-3">
          {users.map(u => (
            <div key={u.id} className="rounded-xl border border-slate-800/80 bg-slate-900/80 p-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-100">{u.email} {u.banned && <span className="ml-1 text-[10px] rounded-full bg-red-600/20 text-red-400 px-2 py-0.5">Banned</span>} {u.producer && !u.banned && <span className="ml-1 text-[10px] rounded-full bg-emerald-500/10 text-emerald-300 px-2 py-0.5">Producer</span>}</p>
                <p className="text-[11px] text-slate-400">ID: {u.id}</p>
              </div>
              <div className="flex gap-2 text-[11px]">
                {!u.banned && <button onClick={()=>{banUser(u.id); update()}} className="rounded-full border border-red-600/50 px-3 py-1 text-red-400 hover:bg-red-600/10">Ban</button>}
                {!u.producer && !u.banned && <button onClick={()=>{approveProducer(u.id); update()}} className="rounded-full border border-emerald-500/60 px-3 py-1 text-emerald-300 hover:bg-emerald-500/10">Approve Producer</button>}
                <button onClick={()=>{resetPassword(u.id);}} className="rounded-full border border-slate-700/70 px-3 py-1 text-slate-300 hover:border-emerald-400/70">Reset Password</button>
              </div>
            </div>
          ))}
          {users.length === 0 && <p className="text-sm text-slate-400">No users.</p>}
        </div>
      </div>
    </section>
  )
}

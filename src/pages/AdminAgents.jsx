import { useEffect, useState } from 'react'
import AdminLayout from '../components/AdminLayout'
import { fetchAgents, createAgent, toggleAgentActive, updateAgent, deleteAgent } from '../services/supportAgentService'
import useSupabaseUser from '../hooks/useSupabaseUser'
import { useAdminRole } from '../hooks/useAdminRole'
import { updateAgentStatus } from '../services/supportAgentService'
import useAutoAgentStatus from '../hooks/useAutoAgentStatus'
import { isWithinBusinessHours, isLunchBreak, nextStatusAvailability } from '../constants/agentSchedule'

export function AdminAgents() {
  const [agents, setAgents] = useState([])
  const [loading, setLoading] = useState(true)
  const [displayName, setDisplayName] = useState('')
  const [avatarVariant, setAvatarVariant] = useState('male')
  const [agentEmail, setAgentEmail] = useState('')
  const [agentPhone, setAgentPhone] = useState('')
  const [agentAddress, setAgentAddress] = useState('')
  const [agentStartDate, setAgentStartDate] = useState('')
  const [workDays, setWorkDays] = useState(['Mon','Tue','Wed','Thu','Fri'])
  const [workStart, setWorkStart] = useState('08:00')
  const [workEnd, setWorkEnd] = useState('17:00')
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(null)
  const [selectedAgent, setSelectedAgent] = useState(null)
  const { user } = useSupabaseUser()
  const { isAdmin } = useAdminRole()
  // Auto status for linked agent
  const linkedAgent = agents.find(a => a.user_id && user?.id === a.user_id)
  useAutoAgentStatus(linkedAgent, !!linkedAgent)

  const load = async () => {
    setLoading(true)
    const list = await fetchAgents()
    setAgents(list)
    setLoading(false)
  }
  useEffect(()=> { load() }, [])

  const submit = async e => {
    e.preventDefault()
    if (!displayName.trim()) return
    setSaving(true)
    if (editing) {
      await updateAgent(editing.id, {
        display_name: displayName.trim(),
        avatarVariant,
        email: agentEmail.trim() || null,
        phone: agentPhone.trim() || null,
        address: agentAddress.trim() || null,
        start_date: agentStartDate || null,
        work_days: workDays,
        work_start: workStart,
        work_end: workEnd
      })
    } else {
      await createAgent({
        displayName: displayName.trim(),
        avatarVariant,
        email: agentEmail.trim() || null,
        phone: agentPhone.trim() || null,
        address: agentAddress.trim() || null,
        startDate: agentStartDate || null,
        workDays,
        workStart,
        workEnd
      })
    }
    setDisplayName('')
    setAvatarVariant('male')
    setAgentEmail('')
    setAgentPhone('')
    setAgentAddress('')
    setAgentStartDate('')
    setWorkDays(['Mon','Tue','Wed','Thu','Fri'])
    setWorkStart('08:00')
    setWorkEnd('17:00')
    setEditing(null)
    setSaving(false)
    load()
  }

  const startEdit = agent => {
    if (!isAdmin) return // restrict editing to admins only
    setEditing(agent)
    setDisplayName(agent.display_name || '')
    setAvatarVariant(agent.avatar_url?.includes('female') ? 'female' : 'male')
    setAgentEmail(agent.email || '')
    setAgentPhone(agent.phone || '')
    setAgentAddress(agent.address || '')
    setAgentStartDate(agent.start_date || '')
    setWorkDays(agent.work_days || ['Mon','Tue','Wed','Thu','Fri'])
    setWorkStart(agent.work_start || '08:00')
    setWorkEnd(agent.work_end || '17:00')
  }

  async function changeStatus(agent, status) {
    const msg = nextStatusAvailability(status)
    if (msg) return // could surface message; minimal for now.
    await updateAgentStatus(agent.id, status)
    load()
  }

  return (
    <AdminLayout title="Support Agents" subtitle="Manage dedicated & on-demand help staff">
      <div className="space-y-8">
        {isAdmin && (
        <form onSubmit={submit} className="rounded-2xl border border-slate-800/80 bg-slate-900/80 p-6 space-y-4">
          <h2 className="text-sm font-semibold text-slate-100 tracking-wide flex items-center justify-between">
            {editing? 'Edit Agent' : 'Add New Agent'}
            {editing && (
              <button
                type="button"
                onClick={()=>{
                  setEditing(null)
                  setDisplayName('')
                  setAvatarVariant('male')
                  setAgentEmail('')
                  setAgentPhone('')
                  setAgentAddress('')
                  setAgentStartDate('')
                }}
                className="text-[10px] rounded-full border border-slate-700/70 px-2 py-1 text-slate-400 hover:border-slate-600 hover:text-slate-200"
              >
                Cancel
              </button>
            )}
          </h2>
          <div className="grid sm:grid-cols-3 gap-4 text-[11px]">
            <div className="space-y-1">
              <label className="block text-slate-400">Display Name</label>
              <input value={displayName} onChange={e=>setDisplayName(e.target.value)} placeholder="Agent name" className="w-full rounded-lg border border-slate-700/70 bg-slate-950/70 px-3 py-2 text-slate-100 focus:border-cyan-400/70 outline-none" />
            </div>
            <div className="space-y-1">
              <label className="block text-slate-400">Avatar Style</label>
              <div className="flex items-center gap-3 pt-1">
                {['male','female'].map(v => (
                  <button type="button" key={v} onClick={()=>setAvatarVariant(v)} className={`flex items-center gap-2 rounded-lg border px-3 py-2 transition ${avatarVariant===v? 'border-cyan-400/70 bg-cyan-500/10 text-cyan-300':'border-slate-700/70 text-slate-300 hover:border-slate-600'}`}>
                    <img src={v==='male'? '/agent-male.svg':'/agent-female.svg'} alt={v} className="h-6 w-6 rounded" />
                    <span className="text-[10px] font-medium capitalize">{v}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <label className="block text-slate-400">Email</label>
              <input
                type="email"
                value={agentEmail}
                onChange={e=>setAgentEmail(e.target.value)}
                placeholder="agent@riddimbase.com"
                className="w-full rounded-lg border border-slate-700/70 bg-slate-950/70 px-3 py-2 text-slate-100 focus:border-cyan-400/70 outline-none"
              />
            </div>
          </div>
          <div className="grid sm:grid-cols-3 gap-4 text-[11px]">
            <div className="space-y-1">
              <label className="block text-slate-400">Phone</label>
              <input
                value={agentPhone}
                onChange={e=>setAgentPhone(e.target.value)}
                placeholder="+1 (876) 000-0000"
                className="w-full rounded-lg border border-slate-700/70 bg-slate-950/70 px-3 py-2 text-slate-100 focus:border-cyan-400/70 outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-slate-400">Address</label>
              <input
                value={agentAddress}
                onChange={e=>setAgentAddress(e.target.value)}
                placeholder="City, Country or Office"
                className="w-full rounded-lg border border-slate-700/70 bg-slate-950/70 px-3 py-2 text-slate-100 focus:border-cyan-400/70 outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-slate-400">Start Date</label>
              <input
                type="date"
                value={agentStartDate}
                onChange={e=>setAgentStartDate(e.target.value)}
                className="w-full rounded-lg border border-slate-700/70 bg-slate-950/70 px-3 py-2 text-slate-100 focus:border-cyan-400/70 outline-none"
              />
            </div>
          </div>
          <div className="grid sm:grid-cols-3 gap-4 text-[11px]">
            <div className="space-y-1 sm:col-span-2">
              <label className="block text-slate-400">Working Days</label>
              <div className="flex flex-wrap gap-1.5">
                {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(day => {
                  const active = workDays.includes(day)
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={()=>{
                        setWorkDays(prev=>{
                          if (prev.includes(day)) return prev.filter(d=>d!==day)
                          return [...prev, day].sort((a,b)=>['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].indexOf(a)-['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].indexOf(b))
                        })
                      }}
                      className={`rounded-full border px-2.5 py-1 text-[10px] font-medium transition ${
                        active
                          ? 'border-emerald-400/70 bg-emerald-500/10 text-emerald-200'
                          : 'border-slate-700/70 text-slate-300 hover:border-slate-500'
                      }`}
                    >
                      {day}
                    </button>
                  )
                })}
              </div>
            </div>
            <div className="space-y-1">
              <label className="block text-slate-400">Working Hours</label>
              <div className="flex items-center gap-1.5">
                <input
                  type="time"
                  value={workStart}
                  onChange={e=>setWorkStart(e.target.value)}
                  className="w-[4.8rem] rounded-lg border border-slate-700/70 bg-slate-950/70 px-2 py-1.5 text-[10px] text-slate-100 focus:border-cyan-400/70 outline-none"
                />
                <span className="text-[10px] text-slate-500">to</span>
                <input
                  type="time"
                  value={workEnd}
                  onChange={e=>setWorkEnd(e.target.value)}
                  className="w-[4.8rem] rounded-lg border border-slate-700/70 bg-slate-950/70 px-2 py-1.5 text-[10px] text-slate-100 focus:border-cyan-400/70 outline-none"
                />
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-slate-500">Add contact details so you can reach agents quickly.</p>
            <button disabled={saving || !displayName.trim()} className="rounded-full bg-cyan-500 hover:bg-cyan-400 px-5 py-2 text-[11px] font-semibold text-slate-950 disabled:opacity-40">{editing? 'Save Changes':'Create Agent'}</button>
          </div>
        </form>
        )}
        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/80 p-6">
          <h2 className="text-sm font-semibold text-slate-100 tracking-wide mb-4">Agents ({agents.length})</h2>
          {loading && <p className="text-[11px] text-slate-400">Loading agents…</p>}
          {!loading && agents.length===0 && <p className="text-[11px] text-slate-500">No agents yet.</p>}
          <ul className="space-y-3">
            {agents.map(a => (
              <li key={a.id} className="group rounded-xl border border-slate-800/70 bg-slate-950/70 p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    {a.avatar_url ? (
                      <img src={a.avatar_url} alt="avatar" className="h-8 w-8 rounded-lg object-cover" />
                    ) : (
                      <div className="h-8 w-8 rounded-lg bg-cyan-500/20 flex items-center justify-center text-[11px] font-bold text-cyan-300">{(a.display_name||'A').slice(0,2).toUpperCase()}</div>
                    )}
                    <div className="space-y-0.5">
                      <p className="text-[12px] font-semibold text-slate-100 flex items-center gap-2">
                        {a.display_name}
                        <span className={`inline-flex items-center rounded-full px-2 py-[2px] text-[9px] font-semibold border ${a.status==='present' ? 'border-emerald-400/60 text-emerald-300' : a.status==='lunch' ? 'border-amber-400/60 text-amber-300' : a.status==='eod' ? 'border-indigo-400/60 text-indigo-300' : 'border-slate-600 text-slate-400'}`}>{a.status || 'offline'}</span>
                      </p>
                      <p className="text-[10px] text-slate-500">{a.user_id? 'Linked' : 'Unlinked'} • {a.active? 'Active':'Inactive'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isAdmin && (
                      <>
                        <button onClick={()=>setSelectedAgent(a)} className="rounded-full border border-slate-600 px-3 py-1 text-[10px] font-medium text-slate-200 hover:bg-slate-700/80">View</button>
                        <button onClick={()=>startEdit(a)} className="rounded-full border border-cyan-400/50 px-3 py-1 text-[10px] font-medium text-cyan-300 hover:bg-cyan-500/10">Edit</button>
                        <button onClick={async ()=>{ await toggleAgentActive(a.id, !a.active); load() }} className={`rounded-full border px-3 py-1 text-[10px] font-medium transition ${a.active? 'border-rose-400/60 text-rose-300 hover:bg-rose-500/10':'border-emerald-400/60 text-emerald-300 hover:bg-emerald-500/10'}`}>{a.active? 'Deactivate':'Activate'}</button>
                        <button
                          onClick={async () => {
                            if (!window.confirm('Delete this agent?')) return
                            await deleteAgent(a.id)
                            load()
                          }}
                          className="rounded-full border border-red-500/70 px-3 py-1 text-[10px] font-medium text-red-300 hover:bg-red-500/10"
                        >
                          Delete
                        </button>
                      </>
                    )}
                    {user?.id === a.user_id && (
                      <div className="flex items-center gap-2">
                        <button disabled={!!nextStatusAvailability('present') || a.status==='present'} onClick={()=>changeStatus(a,'present')} className="rounded-full border border-emerald-400/60 px-3 py-1 text-[10px] font-medium text-emerald-300 disabled:opacity-40 hover:bg-emerald-500/10">Present</button>
                        <button disabled={!!nextStatusAvailability('lunch') || a.status==='lunch'} onClick={()=>changeStatus(a,'lunch')} className="rounded-full border border-amber-400/60 px-3 py-1 text-[10px] font-medium text-amber-300 disabled:opacity-40 hover:bg-amber-500/10">Lunch</button>
                        <button disabled={!!nextStatusAvailability('eod') || a.status==='eod'} onClick={()=>changeStatus(a,'eod')} className="rounded-full border border-indigo-400/60 px-3 py-1 text-[10px] font-medium text-indigo-300 disabled:opacity-40 hover:bg-indigo-500/10">EOD</button>
                      </div>
                    )}
                  </div>
                </div>
                {a.user_id && user?.id === a.user_id && (
                  <div className="text-[10px] text-emerald-400/80">You are linked to this agent entry.</div>
                )}
                {user?.id === a.user_id && (
                  <div className="text-[9px] text-slate-500 flex flex-wrap gap-2">
                    <span>{isWithinBusinessHours() ? 'Within hours' : 'Outside hours'};</span>
                    <span>{isLunchBreak() ? 'Lunch window' : 'Not lunch window'}</span>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
        {selectedAgent && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 px-4">
            <div className="w-full max-w-md rounded-2xl border border-slate-800/90 bg-slate-950/95 p-6 shadow-2xl">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex items-center gap-3">
                  {selectedAgent.avatar_url ? (
                    <img src={selectedAgent.avatar_url} alt="avatar" className="h-10 w-10 rounded-xl object-cover" />
                  ) : (
                    <div className="h-10 w-10 rounded-xl bg-cyan-500/20 flex items-center justify-center text-[12px] font-bold text-cyan-300">
                      {(selectedAgent.display_name || 'A').slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                      {selectedAgent.display_name}
                      <span className={`inline-flex items-center rounded-full px-2 py-[2px] text-[9px] font-semibold border ${selectedAgent.status==='present' ? 'border-emerald-400/60 text-emerald-300' : selectedAgent.status==='lunch' ? 'border-amber-400/60 text-amber-300' : selectedAgent.status==='eod' ? 'border-indigo-400/60 text-indigo-300' : 'border-slate-600 text-slate-400'}`}>
                        {selectedAgent.status || 'offline'}
                      </span>
                    </p>
                    <p className="text-[10px] text-slate-500">{selectedAgent.active ? 'Active agent' : 'Inactive agent'}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedAgent(null)}
                  className="rounded-full border border-slate-700/80 px-2 py-1 text-[10px] text-slate-400 hover:border-slate-500 hover:text-slate-100"
                >
                  Close
                </button>
              </div>
              <div className="space-y-3 text-[11px] text-slate-100">
                <div className="grid grid-cols-3 gap-2">
                  <p className="text-slate-400">Email</p>
                  <p className="col-span-2 text-slate-100 break-words">{selectedAgent.email || '—'}</p>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <p className="text-slate-400">Phone</p>
                  <p className="col-span-2 text-slate-100 break-words">{selectedAgent.phone || '—'}</p>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <p className="text-slate-400">Address</p>
                  <p className="col-span-2 text-slate-100 break-words">{selectedAgent.address || '—'}</p>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <p className="text-slate-400">Start Date</p>
                  <p className="col-span-2 text-slate-100">
                    {selectedAgent.start_date
                      ? new Date(selectedAgent.start_date).toLocaleDateString()
                      : '—'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}

export default AdminAgents

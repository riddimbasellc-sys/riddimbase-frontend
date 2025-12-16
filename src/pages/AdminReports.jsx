import { useEffect, useState } from 'react'
import { sendReportChatEmail } from '../services/notificationService'
import { getProducerContact } from '../services/profileService'
import { sendMessage } from '../services/socialService'
import useSupabaseUser from '../hooks/useSupabaseUser'
import AdminChatPanel from '../components/AdminChatPanel'
import AdminLayout from '../components/AdminLayout'
import { listReports, updateReportStatus } from '../services/reportService'
import { fetchAssignments } from '../services/supportAgentService'
import { supabase } from '../lib/supabaseClient'

function timeAgo(ts) {
  if (!ts) return '—'
  const diff = Date.now() - new Date(ts).getTime()
  const m = Math.floor(diff/60000)
  if (m < 60) return m + 'm'
  const h = Math.floor(m/60)
  if (h < 48) return h + 'h'
  const d = Math.floor(h/24)
  return d + 'd'
}

export function AdminReports() {
  const [reports, setReports] = useState([])
  const [filter, setFilter] = useState('open')
  const [assignFilter, setAssignFilter] = useState('all') // 'all' | 'assigned' | 'unassigned'
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [working, setWorking] = useState(null)
  const [search, setSearch] = useState('')
  const [chatOpen, setChatOpen] = useState(null)
  const [threads, setThreads] = useState({})
  const [assignments, setAssignments] = useState({}) // key: report id -> assignment
  const { user } = useSupabaseUser()

  useEffect(() => {
    try { setThreads(JSON.parse(localStorage.getItem('rb_report_threads') || '{}')) } catch {}
  }, [])

  const [contactInfo, setContactInfo] = useState({}) // { rid: { email, phone, loaded } }

  const ensureContactInfo = async (r) => {
    const rid = r.id || r.created_at
    if (contactInfo[rid]?.loaded) return
    if (r.type === 'producer') {
      const info = await getProducerContact(r.target_id)
      setContactInfo(prev => ({ ...prev, [rid]: { ...(info||{}), loaded: true } }))
    } else {
      setContactInfo(prev => ({ ...prev, [rid]: { loaded: true } }))
    }
  }

  const addMessage = async (rid, kind, text, attachment) => {
    if (!text && !attachment) return
    setThreads(prev => {
      const list = prev[rid] ? [...prev[rid]] : []
      list.push({
        id: 'm_' + Date.now(),
        ts: Date.now(),
        kind,
        text,
        attachmentUrl: attachment?.url || null,
        attachmentType: attachment?.type || null,
        attachmentName: attachment?.name || null,
      })
      const next = { ...prev, [rid]: list }
      try { localStorage.setItem('rb_report_threads', JSON.stringify(next)) } catch {}
      return next
    })
    if (kind === 'chat') {
      const info = contactInfo[rid]
      if (info?.email) {
        try { await sendReportChatEmail({ reportId: rid, message: text, recipientEmail: info.email }) } catch {}
      }
      // Direct site message if producer type and we have admin user id
      const report = reports.find(r => (r.id || r.created_at) === rid)
      if (report && report.type === 'producer' && user?.id) {
        try { await sendMessage({ senderId: user.id, recipientId: report.target_id, content: `[Report ${rid}] ${text}` }) } catch {}
      }
    }
  }

  useEffect(()=> { (async () => { try { setLoading(true); setReports(await listReports()) } catch(e){ setError(e.message) } finally { setLoading(false) } })() }, [])
  useEffect(()=> { (async () => {
    const list = await fetchAssignments()
    const map = {}
    list.filter(a => a.kind === 'report' && a.status !== 'released').forEach(a => { map[a.target_id] = a })
    setAssignments(map)
  })() }, [reports])
  // Real-time subscription for new inserts
  useEffect(()=> {
    const channel = supabase.channel('reports-admin-feed')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'reports' }, (payload) => {
        setReports(prev => {
          const exists = prev.some(r => (r.id && payload.new.id && r.id === payload.new.id) || r.created_at === payload.new.created_at)
          if (exists) return prev
          return [payload.new, ...prev]
        })
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  const filtered = reports.filter(r => {
    if (filter !== 'all' && r.status !== filter) return false
    const rid = r.id || r.created_at
    const hasAssign = !!assignments[rid]
    if (assignFilter === 'assigned' && !hasAssign) return false
    if (assignFilter === 'unassigned' && hasAssign) return false
    if (search) {
      const hay = (r.reason + ' ' + (r.details||'') + ' ' + r.target_id).toLowerCase()
      if (!hay.includes(search.toLowerCase())) return false
    }
    return true
  })

  const setStatus = async (id, status) => {
    setWorking(id+status)
    await updateReportStatus(id, status)
    setReports(await listReports())
    setWorking(null)
  }

  return (
    <AdminLayout
      title="Reports Review"
      subtitle="Moderate community safety submissions"
    >
      <div className="rounded-2xl border border-slate-800/80 bg-slate-900/80 p-5 space-y-5">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex gap-2">
            {['open','resolved','dismissed','all'].map(f => (
              <button key={f} onClick={()=>setFilter(f)} className={`rounded-full px-3 py-1 text-[11px] font-medium border transition ${filter===f? 'border-emerald-400/70 bg-emerald-500/10 text-emerald-300':'border-slate-700/70 text-slate-300 hover:border-slate-600'}`}>{f.charAt(0).toUpperCase()+f.slice(1)}</button>
            ))}
          </div>
          <div className="flex gap-2">
            {['all','assigned','unassigned'].map(a => (
              <button key={a} onClick={()=>setAssignFilter(a)} className={`rounded-full px-3 py-1 text-[11px] font-medium border transition ${assignFilter===a? 'border-cyan-400/70 bg-cyan-500/10 text-cyan-300':'border-slate-700/70 text-slate-300 hover:border-slate-600'}`}>{a.charAt(0).toUpperCase()+a.slice(1)}</button>
            ))}
          </div>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search reason or target" className="flex-1 min-w-[12rem] rounded-full border border-slate-700/70 bg-slate-950/70 px-3 py-1.5 text-[11px] text-slate-100" />
          <button onClick={async ()=>{ setLoading(true); setReports(await listReports()); setLoading(false) }} className="rounded-full border border-slate-700/70 px-3 py-1 text-[11px] text-slate-300 hover:border-emerald-400/60 hover:text-emerald-300 transition">Refresh</button>
        </div>
        {loading && <p className="text-[11px] text-slate-400">Loading reports…</p>}
        {error && <p className="text-[11px] text-rose-400">{error}</p>}
        {!loading && filtered.length===0 && <p className="text-[11px] text-slate-500">No reports to show.</p>}
        <div className="flex gap-6">
          <div className={`flex-1 space-y-3 ${chatOpen? 'lg:pr-4':''}`}>
          {filtered.map(r => {
            const rid = r.id || r.created_at
            const msgs = threads[rid] || []
            const assigned = assignments[rid]
            return (
            <li key={rid} className="rounded-xl border border-slate-800/70 bg-slate-950/70 p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-[10px]">
                  <span className={`rounded-full px-2 py-0.5 font-medium border ${r.type==='beat'? 'border-blue-400/50 text-blue-300':'border-fuchsia-400/50 text-fuchsia-300'}`}>{r.type}</span>
                  <span className={`rounded-full px-2 py-0.5 font-medium border ${r.status==='open'?'border-rose-400/60 text-rose-300':r.status==='resolved'?'border-emerald-400/60 text-emerald-300':'border-slate-600 text-slate-400'}`}>{r.status}</span>
                  {assigned ? (
                    <span className="rounded-full px-2 py-0.5 font-medium border border-cyan-400/50 text-cyan-300">Assigned</span>
                  ) : (
                    <span className="rounded-full px-2 py-0.5 font-medium border border-slate-700/70 text-slate-400">Unassigned</span>
                  )}
                  <span className="text-slate-500">{timeAgo(r.created_at)}</span>
                </div>
                <div className="flex gap-2">
                  {r.status==='open' && (
                    <>
                      <button disabled={!!working} onClick={()=>setStatus(rid,'resolved')} className="rounded-full border border-emerald-400/60 px-3 py-1 text-[10px] font-medium text-emerald-300 hover:bg-emerald-500/10 disabled:opacity-40">Resolve</button>
                      <button disabled={!!working} onClick={()=>setStatus(rid,'dismissed')} className="rounded-full border border-slate-600 px-3 py-1 text-[10px] font-medium text-slate-300 hover:bg-slate-700/40 disabled:opacity-40">Dismiss</button>
                    </>
                  )}
                  <button onClick={()=> { const open = chatOpen===rid? null : rid; setChatOpen(open); if (open) ensureContactInfo(r) }} className="rounded-full border border-cyan-400/50 px-3 py-1 text-[10px] font-medium text-cyan-300 hover:bg-cyan-500/10">Open Panel</button>
                </div>
              </div>
              <div className="text-[11px] text-slate-200 font-medium">Reason: <span className="text-rose-300">{r.reason}</span></div>
              {r.details && <div className="text-[11px] text-slate-300 whitespace-pre-wrap">{r.details}</div>}
              <div className="text-[10px] text-slate-500">Target: {r.target_id}</div>
            </li>
          )})}
          </div>
          {chatOpen && (
            <AdminChatPanel
              title="Report Panel"
              subtitle="Chat & Contact"
              mode="report"
              messages={threads[chatOpen] || []}
              contact={contactInfo[chatOpen] || {}}
              onSend={(text, attachment) => addMessage(chatOpen,'chat',text, attachment)}
              onLogContact={text => addMessage(chatOpen,'contact',text)}
              onClose={()=> setChatOpen(null)}
              contextKind="report"
              contextId={chatOpen}
              currentUser={user}
            />
          )}
        </div>
      </div>
    </AdminLayout>
  )
}


export default AdminReports

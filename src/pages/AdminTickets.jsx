import { useEffect, useState } from 'react'
import { sendSupportChatEmail } from '../services/notificationService'
import { sendMessage, findUserByEmail } from '../services/socialService'
import useSupabaseUser from '../hooks/useSupabaseUser'
import AdminChatPanel from '../components/AdminChatPanel'
import AdminLayout from '../components/AdminLayout'
import { listSupportTickets, updateSupportTicket, listTicketMessages, addTicketMessage } from '../services/supportTicketService'
import { fetchAssignments } from '../services/supportAgentService'

function timeAgo(ts) {
  if (!ts) return '—'
  const diff = Date.now() - (typeof ts === 'number' ? ts : new Date(ts).getTime())
  const m = Math.floor(diff / 60000)
  if (m < 60) return m + 'm'
  const h = Math.floor(m / 60)
  if (h < 48) return h + 'h'
  const d = Math.floor(h / 24)
  return d + 'd'
}

export function AdminTickets() {
  const [tickets, setTickets] = useState([])
  const [statusFilter, setStatusFilter] = useState('open')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [assignFilter, setAssignFilter] = useState('all') // 'all' | 'assigned' | 'unassigned'
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState(null)
  const [chatOpen, setChatOpen] = useState(null)
  const [threads, setThreads] = useState({})
  const [assignments, setAssignments] = useState({}) // key: ticket id -> assignment
  const { user } = useSupabaseUser()

  const addMessage = async (tid, kind, text) => {
    if (!text) return
    // Persist in Supabase support_messages
    const senderType = kind === 'chat' ? 'agent' : 'system'
    try {
      const saved = await addTicketMessage({
        ticketId: tid,
        senderId: user?.id || null,
        senderType,
        message: text,
      })
      setThreads(prev => {
        const list = prev[tid] ? [...prev[tid]] : []
        list.push({
          id: saved?.id || 'm_' + Date.now(),
          ts: saved?.created_at || Date.now(),
          kind,
          text,
        })
        return { ...prev, [tid]: list }
      })
    } catch {
      // Fallback to in-memory only if Supabase fails
      setThreads(prev => {
        const list = prev[tid] ? [...prev[tid]] : []
        list.push({ id: 'm_'+Date.now(), ts: Date.now(), kind, text })
        return { ...prev, [tid]: list }
      })
    }
    if (kind === 'chat') {
      const ticket = tickets.find(t => t.id === tid)
      if (ticket?.contactEmail) {
        try { await sendSupportChatEmail({ ticketId: tid, message: text, contactEmail: ticket.contactEmail }) } catch {}
      }
      // Direct site message to ticket owner if possible
      if (user?.id) {
        let recipientId = ticket?.userId || null
        if (!recipientId && ticket?.contactEmail) {
          try { const found = await findUserByEmail(ticket.contactEmail); recipientId = found?.id || null } catch {}
        }
        if (recipientId) {
          try { await sendMessage({ senderId: user.id, recipientId, content: `[Ticket ${tid}] ${text}` }) } catch {}
        }
      }
    }
  }

  const refresh = async () => {
    setLoading(true)
    const list = await listSupportTickets()
    setTickets(list || [])
    setLoading(false)
  }

  useEffect(() => { refresh() }, [])
  useEffect(() => {
    // When a chat is opened, load its history from Supabase
    if (!chatOpen) return
    ;(async () => {
      const msgs = await listTicketMessages(chatOpen)
      if (!msgs) return
      setThreads(prev => ({
        ...prev,
        [chatOpen]: msgs.map(m => ({
          id: m.id,
          ts: m.created_at,
          kind: m.sender_type === 'system' ? 'contact' : 'chat',
          text: m.message,
        })),
      }))
    })()
  }, [chatOpen])
  useEffect(()=> { (async () => {
    const list = await fetchAssignments()
    const map = {}
    list.filter(a => a.kind === 'ticket' && a.status !== 'released').forEach(a => { map[a.target_id] = a })
    setAssignments(map)
  })() }, [tickets])

  const filtered = tickets.filter(t => {
    if (statusFilter !== 'all' && t.status !== statusFilter) return false
    if (categoryFilter !== 'all' && t.category !== categoryFilter) return false
    const hasAssign = !!assignments[t.id]
    if (assignFilter === 'assigned' && !hasAssign) return false
    if (assignFilter === 'unassigned' && hasAssign) return false
    if (search) {
      const hay = (t.subject + ' ' + t.message + ' ' + t.category).toLowerCase()
      if (!hay.includes(search.toLowerCase())) return false
    }
    return true
  })

  const setStatus = async (id, status) => {
    setWorking(id+status)
    await updateSupportTicket(id, { status })
    refresh()
    setWorking(null)
  }

  return (
    <AdminLayout title="Support Tickets" subtitle="User-submitted help requests">
      <div className="rounded-2xl border border-slate-800/80 bg-slate-900/80 p-5 space-y-5">
          <div className="flex flex-wrap gap-3 items-center">
          <div className="flex gap-2">
            {['open','resolved','closed','all'].map(s => (
              <button key={s} onClick={()=>setStatusFilter(s)} className={`rounded-full px-3 py-1 text-[11px] font-medium border transition ${statusFilter===s? 'border-emerald-400/70 bg-emerald-500/10 text-emerald-300':'border-slate-700/70 text-slate-300 hover:border-slate-600'}`}>{s.charAt(0).toUpperCase()+s.slice(1)}</button>
            ))}
          </div>
          <div className="flex gap-2">
            {['all','general','licensing','earnings','safety','other'].map(c => (
              <button key={c} onClick={()=>setCategoryFilter(c)} className={`rounded-full px-3 py-1 text-[11px] font-medium border transition ${categoryFilter===c? 'border-cyan-400/70 bg-cyan-500/10 text-cyan-300':'border-slate-700/70 text-slate-300 hover:border-slate-600'}`}>{c.charAt(0).toUpperCase()+c.slice(1)}</button>
            ))}
          </div>
          <div className="flex gap-2">
            {['all','assigned','unassigned'].map(a => (
              <button key={a} onClick={()=>setAssignFilter(a)} className={`rounded-full px-3 py-1 text-[11px] font-medium border transition ${assignFilter===a? 'border-indigo-400/70 bg-indigo-500/10 text-indigo-300':'border-slate-700/70 text-slate-300 hover:border-slate-600'}`}>{a.charAt(0).toUpperCase()+a.slice(1)}</button>
            ))}
          </div>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search subject or message" className="flex-1 min-w-[12rem] rounded-full border border-slate-700/70 bg-slate-950/70 px-3 py-1.5 text-[11px] text-slate-100" />
          <button onClick={refresh} className="rounded-full border border-slate-700/70 px-3 py-1 text-[11px] text-slate-300 hover:border-emerald-400/60 hover:text-emerald-300 transition">Refresh</button>
        </div>
        {loading && <p className="text-[11px] text-slate-400">Loading tickets…</p>}
        {!loading && filtered.length===0 && <p className="text-[11px] text-slate-500">No tickets found.</p>}
        <div className="flex gap-6">
          <div className={`flex-1 space-y-3 ${chatOpen? 'lg:pr-4':''}`}>
          {filtered.map(t => {
            const tid = t.id
            const msgs = threads[tid] || []
            const assigned = assignments[tid]
            return (
            <li key={tid} className="rounded-xl border border-slate-800/70 bg-slate-950/70 p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-[10px]">
                  <span className={`rounded-full px-2 py-0.5 font-medium border ${t.category==='general'? 'border-emerald-400/50 text-emerald-300': t.category==='licensing'? 'border-indigo-400/50 text-indigo-300': t.category==='earnings'? 'border-amber-400/50 text-amber-300': t.category==='safety'? 'border-rose-400/50 text-rose-300':'border-slate-600 text-slate-400'}`}>{t.category}</span>
                  <span className={`rounded-full px-2 py-0.5 font-medium border ${t.status==='open'? 'border-rose-400/60 text-rose-300' : t.status==='resolved'? 'border-emerald-400/60 text-emerald-300' : 'border-slate-600 text-slate-400'}`}>{t.status}</span>
                  {assigned ? (
                    <span className="rounded-full px-2 py-0.5 font-medium border border-cyan-400/50 text-cyan-300">Assigned</span>
                  ) : (
                    <span className="rounded-full px-2 py-0.5 font-medium border border-slate-700/70 text-slate-400">Unassigned</span>
                  )}
                  <span className="text-slate-500">{timeAgo(t.createdAt)}</span>
                </div>
                <div className="flex gap-2">
                  {t.status==='open' && (
                    <button disabled={!!working} onClick={()=>setStatus(t.id,'resolved')} className="rounded-full border border-emerald-400/60 px-3 py-1 text-[10px] font-medium text-emerald-300 hover:bg-emerald-500/10 disabled:opacity-40">Resolve</button>
                  )}
                  {t.status!=='open' && (
                    <button disabled={!!working} onClick={()=>setStatus(t.id,'open')} className="rounded-full border border-rose-400/60 px-3 py-1 text-[10px] font-medium text-rose-300 hover:bg-rose-500/10 disabled:opacity-40">Reopen</button>
                  )}
                  <button onClick={()=> setChatOpen(chatOpen===tid? null : tid)} className="rounded-full border border-cyan-400/50 px-3 py-1 text-[10px] font-medium text-cyan-300 hover:bg-cyan-500/10">Open Panel</button>
                </div>
              </div>
              <div className="text-[11px] font-semibold text-slate-200 truncate" title={t.subject}>{t.subject}</div>
              <div className="text-[11px] text-slate-300 whitespace-pre-wrap max-h-40 overflow-auto">{t.message}</div>
              {(t.contactEmail || t.contactPhone) && (
                <div className="flex flex-wrap gap-2 text-[10px] text-slate-400">
                  {t.contactEmail && <a href={`mailto:${t.contactEmail}?subject=Support%20Response:%20${encodeURIComponent(t.subject)}`} className="rounded-full border border-emerald-400/50 px-2 py-[2px] text-emerald-300 hover:bg-emerald-500/10">{t.contactEmail}</a>}
                  {t.contactPhone && <a href={`tel:${t.contactPhone}`} className="rounded-full border border-cyan-400/50 px-2 py-[2px] text-cyan-300 hover:bg-cyan-500/10">{t.contactPhone}</a>}
                </div>
              )}
            </li>
          )})}
          </div>
          {chatOpen && (
            <AdminChatPanel
              title="Ticket Panel"
              subtitle="Chat & Contact"
              mode="ticket"
              messages={threads[chatOpen] || []}
              contact={(tickets.find(t=>t.id===chatOpen) || { contactEmail:null, contactPhone:null }) && {
                email: (tickets.find(t=>t.id===chatOpen)||{}).contactEmail,
                phone: (tickets.find(t=>t.id===chatOpen)||{}).contactPhone,
              }}
              onSend={text => addMessage(chatOpen,'chat',text)}
              onLogContact={text => addMessage(chatOpen,'contact',text)}
              onClose={()=> setChatOpen(null)}
              contextKind="ticket"
              contextId={chatOpen}
              currentUser={user}
              ticketStatus={(tickets.find(t=>t.id===chatOpen)||{}).status}
              onResolveTicket={async () => {
                await updateSupportTicket(chatOpen, { status: 'resolved' })
                refresh()
                setChatOpen(null)
              }}
            />
          )}
        </div>
      </div>
    </AdminLayout>
  )
}

export default AdminTickets

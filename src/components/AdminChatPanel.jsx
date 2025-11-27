import { useEffect, useRef, useState } from 'react'
import { fetchAgents, getAssignment, assignAgent, releaseAssignment, claimAssignment } from '../services/supportAgentService'
import useAutoAgentStatus from '../hooks/useAutoAgentStatus'
import { isAgentAvailable, isBusinessDay, isWithinBusinessHours } from '../constants/agentSchedule'

function formatTime(ts) {
  try {
    const d = typeof ts === 'number' ? new Date(ts) : new Date(ts)
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } catch { return '—' }
}

export default function AdminChatPanel({
  title,
  subtitle,
  messages,
  mode, // 'report' | 'ticket'
  contact,
  onSend,
  onLogContact,
  onClose,
  contextKind, // 'report' | 'ticket'
  contextId, // id of report or ticket
  currentUser, // supabase user
  ticketStatus, // optional: current status for ticket (open/closed)
  onResolveTicket, // optional callback for resolving ticket
}) {
  const [val, setVal] = useState('')
  const [contactVal, setContactVal] = useState('')
  const [typing, setTyping] = useState(false)
  const typingTimer = useRef(null)
  const listRef = useRef(null)
  const [agents, setAgents] = useState([])
  const [assignment, setAssignment] = useState(null)
  const [assigning, setAssigning] = useState(false)

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight
    }
  }, [messages])

  // Load agents + existing assignment
  useEffect(() => {
    async function load() {
      if (!contextKind || !contextId) return
      const a = await getAssignment(contextKind, contextId)
      setAssignment(a || null)
      const list = await fetchAgents()
      setAgents(list.filter(x => x.active))
    }
    load()
  }, [contextKind, contextId])

  async function handleAssign(agentId) {
    if (!agentId) return
    setAssigning(true)
    const a = await assignAgent({ agentId, kind: contextKind, targetId: contextId })
    setAssignment(a)
    setAssigning(false)
  }

  async function handleRelease() {
    if (!assignment) return
    setAssigning(true)
    await releaseAssignment(assignment.id)
    setAssignment(null)
    setAssigning(false)
  }

  async function handleClaim() {
    if (!currentUser) return
    // Claim by matching agent user_id
    const myAgent = agents.find(a => a.user_id === currentUser.id)
    if (!myAgent) return
    setAssigning(true)
    const a = await claimAssignment({ agentId: myAgent.id, kind: contextKind, targetId: contextId })
    setAssignment(a)
    setAssigning(false)
  }

  const onChange = e => {
    setVal(e.target.value)
    if (!typing) setTyping(true)
    if (typingTimer.current) clearTimeout(typingTimer.current)
    typingTimer.current = setTimeout(()=> setTyping(false), 1200)
  }

  const submit = e => {
    e.preventDefault()
    const text = val.trim()
    if (!text) return
    onSend(text)
    setVal('')
    setTyping(false)
  }

  const submitContactLog = e => {
    e.preventDefault()
    const text = contactVal.trim()
    if (!text) return
    onLogContact(text)
    setContactVal('')
  }

  const assignedAgent = assignment ? agents.find(a => a.id === assignment.agent_id) : null
  const available = assignedAgent ? isAgentAvailable(assignedAgent) : false
  const showUnavailableBanner = !available
  const selfAssigned = assignedAgent && currentUser && assignedAgent.user_id === currentUser.id ? assignedAgent : null
  useAutoAgentStatus(selfAssigned, !!selfAssigned)

  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-[340px] shrink-0 border-l border-slate-900/80 bg-slate-950/90 backdrop-blur rounded-none">
      <div className="px-5 pt-5 pb-4 border-b border-slate-900/80 space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xs font-semibold text-slate-50 tracking-wide">{title}</h2>
            {subtitle && <p className="mt-0.5 text-[10px] text-slate-400">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="rounded-md border border-slate-700/70 px-2 py-1 text-[10px] text-slate-400 hover:text-slate-200 hover:border-slate-600">Close</button>
        </div>
        {contextKind === 'ticket' && ticketStatus === 'open' && onResolveTicket && (
          <div className="pt-2">
            <button
              type="button"
              onClick={() => {
                const closure = 'Issue resolved: This support ticket has been marked as resolved. If anything changes or you need further assistance, please open a new ticket or reply to this thread. Thank you for contacting support.'
                try { onSend(closure) } catch {}
                try { onResolveTicket() } catch {}
              }}
              className="rounded-full bg-emerald-500/90 hover:bg-emerald-400 px-3 py-1.5 text-[10px] font-semibold text-slate-950 shadow-sm"
            >
              Mark Issue Resolved
            </button>
          </div>
        )}
        {contextKind && (
          <div className="flex items-center justify-between gap-3">
            {assignment ? (
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-300">Assigned:</span>
                <span className="text-[10px] font-semibold text-cyan-300">
                  {agents.find(a => a.id === assignment.agent_id)?.display_name || 'Agent'}
                </span>
                <button disabled={assigning} onClick={handleRelease} className="rounded border border-slate-700/70 px-2 py-[2px] text-[10px] text-slate-400 hover:text-slate-200 disabled:opacity-40">Release</button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <select disabled={assigning} onChange={e=>handleAssign(e.target.value)} className="bg-slate-900/80 border border-slate-700/70 rounded px-2 py-[4px] text-[10px] text-slate-200 focus:outline-none focus:border-cyan-400/70">
                  <option value="">Assign agent…</option>
                  {agents.map(a => <option key={a.id} value={a.id}>{a.display_name}</option>)}
                </select>
                {currentUser && agents.some(a => a.user_id === currentUser.id) && (
                  <button disabled={assigning} onClick={handleClaim} className="rounded bg-cyan-500/80 hover:bg-cyan-400 px-2 py-[3px] text-[10px] font-medium text-slate-950 disabled:opacity-40">Claim</button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3" ref={listRef}>
          {showUnavailableBanner && (
            <div className="rounded-lg border border-amber-400/50 bg-amber-500/10 px-3 py-2 text-[10px] text-amber-300 flex flex-col gap-1">
              <span className="font-semibold">Agent Unavailable</span>
              {!assignedAgent && <span>No agent is currently assigned to this conversation.</span>}
              {assignedAgent && assignedAgent.status === 'lunch' && <span>The assigned agent is on lunch (12:30–1:30 ET). Please expect a response after the break.</span>}
              {assignedAgent && assignedAgent.status === 'eod' && <span>The assigned agent has ended their day. A follow-up will occur next business day.</span>}
              {assignedAgent && assignedAgent.status === 'offline' && <span>The assigned agent is offline. A response will be provided during business hours.</span>}
              {(!isBusinessDay() || !isWithinBusinessHours()) && <span>Support hours: Mon–Fri 8:00–17:00 ET (Lunch 12:30–13:30).</span>}
              <span className="text-amber-400/80">You can still leave messages; they will be reviewed promptly.</span>
            </div>
          )}
          {messages.filter(m=>m.kind==='chat').map(m => {
            const agent = assignment ? agents.find(a => a.id === assignment.agent_id) : null
            const isOwn = agent && selfAssigned && m.agent_id && m.agent_id === selfAssigned.id
            const showAgentAvatar = agent && !isOwn && m.agent_id && m.agent_id === agent.id
            return (
              <div
                key={m.id}
                className={`group flex w-full ${isOwn ? 'justify-end' : 'justify-start'} gap-2`}
              >
                {/* Left side avatar for respondent (agent when not self) */}
                {!isOwn && showAgentAvatar && (
                  agent.avatar_url ? (
                    <img src={agent.avatar_url} alt="avatar" className="h-7 w-7 rounded-lg object-cover" />
                  ) : (
                    <div className="h-7 w-7 rounded-lg bg-cyan-500/20 flex items-center justify-center text-[10px] font-bold text-cyan-300">{(agent.display_name||'A').slice(0,2).toUpperCase()}</div>
                  )
                )}
                {/* Message bubble */}
                <div className={`max-w-[75%] flex flex-col ${isOwn ? 'items-end text-right' : 'items-start text-left'}`}>
                  <p className={`px-3 py-2 rounded-lg text-[11px] leading-snug ${isOwn ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800/60 text-cyan-200'}`}>{m.text}</p>
                  <span className="mt-1 text-[9px] text-slate-500">{formatTime(m.ts)}</span>
                </div>
                {/* Right side avatar for own (self) messages if desired */}
                {isOwn && agent && (
                  agent.avatar_url ? (
                    <img src={agent.avatar_url} alt="avatar" className="h-7 w-7 rounded-lg object-cover" />
                  ) : (
                    <div className="h-7 w-7 rounded-lg bg-cyan-500/20 flex items-center justify-center text-[10px] font-bold text-cyan-300">{(agent.display_name||'A').slice(0,2).toUpperCase()}</div>
                  )
                )}
              </div>
            )
          })}
          {messages.filter(m=>m.kind==='chat').length === 0 && (
            <p className="text-[10px] text-slate-500">No messages yet.</p>
          )}
          {typing && available && <p className="text-[10px] italic text-cyan-400/80">Typing…</p>}
        </div>
        <form onSubmit={submit} className="p-4 border-t border-slate-900/80 space-y-2">
          <textarea value={val} onChange={onChange} rows={3} placeholder="Write a message" className="w-full resize-none rounded-lg border border-slate-700/70 bg-slate-900/80 px-3 py-2 text-[11px] text-slate-100 placeholder:text-slate-500 focus:border-cyan-400/70 focus:outline-none" />
          <div className="flex items-center justify-between gap-2">
            <span className="text-[9px] text-slate-500">Shift+Enter for newline</span>
            <button type="submit" disabled={!val.trim()} className="rounded-full bg-cyan-500 px-4 py-1.5 text-[11px] font-semibold text-slate-950 disabled:opacity-40 hover:bg-cyan-400">Send</button>
          </div>
        </form>
        <div className="border-t border-slate-900/80">
          <details className="group">
            <summary className="cursor-pointer px-4 py-3 text-[10px] font-semibold tracking-wide text-indigo-300 flex items-center justify-between">
              <span>Contact Log</span>
              <span className="text-slate-500 group-open:hidden">+</span>
              <span className="text-slate-500 hidden group-open:inline">−</span>
            </summary>
            <div className="px-4 pb-4 space-y-3">
              {contact?.email || contact?.phone ? (
                <div className="flex flex-wrap gap-2 text-[10px]">
                  {contact.email && <a href={`mailto:${contact.email}`} className="rounded-full border border-emerald-400/50 px-2 py-[2px] text-emerald-300 hover:bg-emerald-500/10">{contact.email}</a>}
                  {contact.phone && <a href={`tel:${contact.phone}`} className="rounded-full border border-cyan-400/50 px-2 py-[2px] text-cyan-300 hover:bg-cyan-500/10">{contact.phone}</a>}
                </div>
              ) : <p className="text-[10px] text-slate-500">No contact details.</p>}
              <div className="max-h-32 overflow-y-auto space-y-2 pr-1">
                {messages.filter(m=>m.kind==='contact').map(m => (
                  <div key={m.id} className="flex items-start gap-2">
                    <div className="mt-1 h-2 w-2 rounded-full bg-indigo-400/70" />
                    <div className="flex-1">
                      <p className="text-[10px] text-indigo-200 leading-snug">{m.text}</p>
                      <span className="text-[8px] text-slate-500">{formatTime(m.ts)}</span>
                    </div>
                  </div>
                ))}
                {messages.filter(m=>m.kind==='contact').length===0 && <p className="text-[10px] text-slate-500">No contact notes.</p>}
              </div>
              <form onSubmit={submitContactLog} className="space-y-2">
                <textarea value={contactVal} onChange={e=>setContactVal(e.target.value)} rows={2} placeholder="Log contact attempt" className="w-full resize-none rounded-lg border border-slate-700/70 bg-slate-900/80 px-3 py-2 text-[10px] text-slate-100 placeholder:text-slate-500 focus:border-indigo-400/70 focus:outline-none" />
                <button disabled={!contactVal.trim()} className="rounded-full bg-indigo-500 px-3 py-1 text-[10px] font-medium text-slate-950 disabled:opacity-40 hover:bg-indigo-400">Add Note</button>
              </form>
            </div>
          </details>
        </div>
      </div>
    </aside>
  )
}

import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import ProducerLayout from '../components/ProducerLayout'
import useSupabaseUser from '../hooks/useSupabaseUser'
import { fetchThreads, fetchProfilesByIds, fetchMessages, sendMessage, markThreadRead } from '../services/socialService'

function formatTime(ts) {
  try { return new Date(ts).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' }) } catch { return '—' }
}

export function ProducerInbox() {
  const { user } = useSupabaseUser()
  const userId = user?.id
  const [threads, setThreads] = useState([])
  const [profiles, setProfiles] = useState({})
  const [active, setActive] = useState(null)
  const [messages, setMessages] = useState([])
  const [val, setVal] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const location = useLocation()

  useEffect(() => { (async () => {
    if (!userId) return
    setLoading(true)
    const th = await fetchThreads({ userId })
    setThreads(th)
    const ids = th.map(t => t.otherUserId)
    const profRows = await fetchProfilesByIds(ids)
    const map = {}
    profRows.forEach(p => { map[p.id] = p })
    setProfiles(map)
    setLoading(false)
    const params = new URLSearchParams(location.search || '')
    const to = params.get('to')
    if (to) {
      setActive(to)
    }
  })() }, [userId, location.search])

  useEffect(() => { (async () => {
    if (!active || !userId) { setMessages([]); return }
    setMessages(await fetchMessages({ userId, otherUserId: active, limit: 200 }))
    await markThreadRead({ userId, otherUserId: active })
  })() }, [active, userId])

  const send = async e => {
    e.preventDefault()
    if (!val.trim() || !userId || !active) return
    setSending(true)
    const res = await sendMessage({ senderId: userId, recipientId: active, content: val.trim() })
    if (res.success && res.message) setMessages(prev => [...prev, res.message])
    setVal('')
    setSending(false)
  }

  return (
    <ProducerLayout title="Inbox" subtitle="Direct messages & admin chats">
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="lg:w-72 shrink-0">
          <div className="rounded-xl border border-slate-800/80 bg-slate-900/70 p-4 space-y-3">
            <h2 className="text-xs font-semibold text-slate-200 tracking-wide">Threads</h2>
            {loading && <p className="text-[10px] text-slate-500">Loading…</p>}
            {!loading && threads.length===0 && <p className="text-[10px] text-slate-500">No conversations yet.</p>}
            <ul className="space-y-2">
              {threads.map(t => {
                const p = profiles[t.otherUserId]
                const last = t.last
                return (
                  <li key={t.otherUserId}>
                    <button onClick={()=> setActive(t.otherUserId)} className={`w-full text-left rounded-lg px-3 py-2 border text-[11px] transition ${active===t.otherUserId? 'border-emerald-400/60 bg-emerald-500/10 text-emerald-200':'border-slate-700/70 hover:border-slate-600 text-slate-300'}`}> 
                      <div className="flex justify-between items-center">
                        <span className="font-medium truncate">{p?.display_name || p?.email || t.otherUserId.slice(0,8)}</span>
                        <span className="text-[9px] text-slate-500 ml-2">{formatTime(last.created_at)}</span>
                      </div>
                      <div className="mt-0.5 text-[10px] text-slate-400 truncate">{last.content}</div>
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        </div>
        <div className="flex-1">
          <div className="rounded-xl border border-slate-800/80 bg-slate-900/70 flex flex-col h-[520px]">
            <div className="px-5 py-4 border-b border-slate-800/70 flex items-center justify-between">
              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-slate-100 truncate">{active? (profiles[active]?.display_name || profiles[active]?.email || 'Conversation') : 'Select a thread'}</h2>
                {active && <p className="text-[10px] text-slate-500 truncate">Messages are private & instant</p>}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {active && messages.map(m => {
                const mine = m.sender_id === userId
                return (
                  <div key={m.id} className={`max-w-[70%] ${mine? 'ml-auto text-right':'text-left'}`}>
                    <div className={`rounded-lg px-3 py-2 text-[11px] leading-snug border ${mine? 'bg-emerald-500/10 border-emerald-400/50 text-emerald-200':'bg-slate-800/60 border-slate-700/60 text-slate-200'}`}>{m.content}</div>
                    <span className="mt-1 block text-[8px] text-slate-500">{formatTime(m.created_at)}</span>
                  </div>
                )
              })}
              {active && messages.length===0 && <p className="text-[10px] text-slate-500">No messages yet. Say hi!</p>}
              {!active && <p className="text-[10px] text-slate-500">Choose a thread to view messages.</p>}
            </div>
            <form onSubmit={send} className="border-t border-slate-800/70 p-4 space-y-2">
              <textarea disabled={!active} value={val} onChange={e=>setVal(e.target.value)} rows={3} placeholder={active? 'Type a message…':'Select a thread first'} className="w-full resize-none rounded-lg border border-slate-700/70 bg-slate-950/70 px-3 py-2 text-[11px] text-slate-100 placeholder:text-slate-500 focus:border-emerald-400/70 focus:outline-none disabled:opacity-40" />
              <div className="flex justify-between items-center">
                <span className="text-[9px] text-slate-500">Shift+Enter for newline</span>
                <button type="submit" disabled={!active || !val.trim() || sending} className="rounded-full bg-emerald-500 px-4 py-1.5 text-[11px] font-semibold text-slate-950 disabled:opacity-40 hover:bg-emerald-400 transition">Send</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </ProducerLayout>
  )
}

export default ProducerInbox

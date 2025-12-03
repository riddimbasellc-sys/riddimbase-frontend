import { useEffect, useState, useRef } from 'react'
import useSupabaseUser from '../hooks/useSupabaseUser'
import { getUnreadCount as getUnreadLocal } from '../services/notificationsService'
import { listNotifications, markAllRead, realtimeSubscribe } from '../services/notificationsRepository'

function timeAgo(ts) {
  const diff = Date.now() - ts
  const m = Math.floor(diff/60000)
  if (m < 1) return 'just now'
  if (m < 60) return m + 'm'
  const h = Math.floor(m/60)
  if (h < 24) return h + 'h'
  const d = Math.floor(h/24)
  return d + 'd'
}

const ICONS = {
  like: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-pink-400">
      <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z" />
    </svg>
  ),
  comment: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-cyan-400">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z" />
    </svg>
  ),
  sale: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-emerald-400">
      <path d="M3 3v18h18" />
      <path d="M8 16l4-4 4 4 5-5" />
      <path d="M16 7h.01" />
    </svg>
  ),
  follow: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-indigo-400">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  message: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-red-400">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-4.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z" />
    </svg>
  )
}

export default function NotificationsBell() {
  const { user } = useSupabaseUser()
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState([])
  const [unread, setUnread] = useState(0)
  const ref = useRef(null)

  useEffect(() => {
    refresh()
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    if (!user) return
    const unsubscribe = realtimeSubscribe(user.id, () => refresh())
    return unsubscribe
  }, [user])

  async function refresh() {
    if (user) {
      const rows = await listNotifications(user.id)
      setItems(rows)
      setUnread(rows.filter(r=> !r.read).length)
    } else {
      // local fallback
      const rows = []
      setItems(rows)
      setUnread(getUnreadLocal())
    }
  }
  function openBell() {
    setOpen(o=>!o)
    if (!open) refresh()
  }
  async function markRead() { if (user) await markAllRead(user.id); else markAllRead(); refresh() }

  return (
    <div className="relative" ref={ref}>
      <button onClick={openBell} className="relative flex h-10 w-10 items-center justify-center text-slate-300 hover:text-emerald-400 transition" aria-label="Notifications">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-slate-300">
          <path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10 22h4" />
        </svg>
        {unread>0 && <span className="absolute -top-1 -right-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-slate-950">{unread}</span>}
      </button>
      {open && (
        <div className="absolute right-0 top-[46px] w-72 rounded-2xl border border-slate-800/70 bg-slate-900/90 p-3 shadow-xl backdrop-blur-md">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] font-semibold text-slate-200">Notifications</p>
            {unread>0 && <button onClick={markRead} className="text-[10px] text-emerald-400 hover:text-emerald-300">Mark all read</button>}
          </div>
          <ul className="max-h-72 overflow-auto space-y-2">
            {items.slice(0,25).map(n => (
              <li key={n.id} className={`flex gap-2 rounded-lg border border-slate-800/60 p-2 ${!n.read? 'bg-slate-800/40':'bg-slate-900/40'}`}>
                {ICONS[n.type]}
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] text-slate-200 truncate">
                    {n.type === 'sale' && <>Sale: <span className="text-emerald-300">{n.data.currency} {n.data.amount.toFixed(2)}</span> {n.data.beatTitle && <>• {n.data.beatTitle}</>} </>}
                    {n.type === 'like' && <>Like: {n.data.user || 'Someone'} liked <span className="text-pink-300">{n.data.beatTitle}</span></>}
                    {n.type === 'comment' && <>Comment: {n.data.user || 'User'} "{n.data.text}"</>}
                    {n.type === 'follow' && <>New follower: <span className="text-indigo-300">{n.data.user}</span></>}
                    {n.type === 'message' && <>Message: {n.data.from} "{n.data.snippet}"</>}
                  </p>
                  <p className="text-[9px] text-slate-500 mt-0.5">{timeAgo(n.ts)}</p>
                </div>
              </li>
            ))}
            {items.length===0 && <li className="text-[11px] text-slate-500">No notifications yet.</li>}
          </ul>
        </div>
      )}
    </div>
  )
}

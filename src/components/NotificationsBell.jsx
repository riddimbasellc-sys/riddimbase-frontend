import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import useSupabaseUser from '../hooks/useSupabaseUser'
import {
  listNotifications,
  markAllRead,
  realtimeSubscribe,
} from '../services/notificationsRepository'

function timeAgo(ts) {
  const diff = Date.now() - ts
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return m + 'm'
  const h = Math.floor(m / 60)
  if (h < 24) return h + 'h'
  const d = Math.floor(h / 24)
  return d + 'd'
}

const jobIcon = (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="h-4 w-4 text-sky-400"
  >
    <path d="M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z" />
    <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
    <path d="M3 11h18" />
  </svg>
)

const payoutIcon = (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="h-4 w-4 text-emerald-400"
  >
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="M16 12h.01" />
    <path d="M7 12h5" />
  </svg>
)

const ICONS = {
  like: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4 text-pink-400"
    >
      <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z" />
    </svg>
  ),
  comment: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4 text-cyan-400"
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z" />
    </svg>
  ),
  sale: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4 text-emerald-400"
    >
      <path d="M3 3v18h18" />
      <path d="M8 16l4-4 4 4 5-5" />
      <path d="M16 7h.01" />
    </svg>
  ),
  follow: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4 text-indigo-400"
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  message: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4 text-red-400"
    >
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-4.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z" />
    </svg>
  ),
  favorite: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4 text-amber-300"
    >
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 6 3.5 4 5.5 3.5 7 3.2 8.5 4 9.3 5.2L12 9l2.7-3.8C15.5 4 17 3.2 18.5 3.5 20.5 4 22 6 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
    </svg>
  ),
  'job-approved': jobIcon,
  'job-denied': jobIcon,
  'job-accepted': jobIcon,
  'job-files': jobIcon,
  'job-paid': payoutIcon,
  'payout-completed': payoutIcon,
}

export default function NotificationsBell() {
  const { user } = useSupabaseUser()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState([])
  const [unread, setUnread] = useState(0)
  const [actorNames, setActorNames] = useState({})
  const ref = useRef(null)

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    if (!user) {
      setItems([])
      setUnread(0)
      return
    }
    // Load existing notifications on login
    refresh()
    // Realtime subscription for instant badge updates
    const unsubscribe = realtimeSubscribe(user.id, (n) => {
      setItems((prev) => {
        const idx = prev.findIndex((row) => row.id === n.id)
        if (idx === -1) return [n, ...prev]
        const copy = [...prev]
        copy[idx] = n
        return copy
      })
      setUnread((prev) => {
        if (n.read) return Math.max(0, prev - 1)
        return prev + 1
      })
    })
    return unsubscribe
  }, [user])

  async function refresh() {
    if (user) {
      const rows = await listNotifications(user.id)
      setItems(rows)
      setUnread(rows.filter((r) => !r.read).length)
    } else {
      // guests do not have stored notifications
      setItems([])
      setUnread(0)
    }
  }

  function openBell() {
    setOpen((o) => !o)
    if (!open) refresh()
  }

  async function markRead() {
    if (user) await markAllRead(user.id)
    else markAllRead()
    refresh()
  }

  // Resolve actor display names where the stored data.user/from is generic
  useEffect(() => {
    const missingIds = Array.from(
      new Set(
        (items || [])
          .filter(
            (n) =>
              n.actorId &&
              !actorNames[n.actorId] &&
              (!n.data?.user || n.data.user === 'User' || n.data.user === 'Someone'),
          )
          .map((n) => n.actorId),
      ),
    )

    if (!missingIds.length) return

    let cancelled = false
    ;(async () => {
      try {
        const { supabase } = await import('../lib/supabaseClient')
        const { data, error } = await supabase
          .from('profiles')
          .select('id,display_name,email')
          .in('id', missingIds)

        if (error || !data || cancelled) return
        const next = {}
        for (const row of data) {
          const name = row.display_name || row.email || null
          if (row.id && name) next[row.id] = name
        }
        if (Object.keys(next).length) {
          setActorNames((prev) => ({ ...prev, ...next }))
        }
      } catch {
        // ignore lookup failures
      }
    })()

    return () => {
      cancelled = true
    }
  }, [items, actorNames])

  function handleClick(n) {
    const beatId = n.data?.beatId
    const jobId = n.data?.jobId

    if (
      n.type === 'like' ||
      n.type === 'favorite' ||
      n.type === 'comment' ||
      n.type === 'repost' ||
      n.type === 'sale'
    ) {
      if (beatId) navigate(`/beat/${beatId}`)
      return
    }

    if (n.type === 'message') {
      const email = n.data?.email
      if (email) navigate(`/chat?email=${encodeURIComponent(email)}`)
      else navigate('/chat')
      return
    }

    if (
      n.type === 'job-approved' ||
      n.type === 'job-denied' ||
      n.type === 'job-accepted' ||
      n.type === 'job-files' ||
      n.type === 'job-paid' ||
      n.type === 'job-proposal' ||
      n.type === 'job-assigned' ||
      n.type === 'job-released'
    ) {
      if (jobId) navigate(`/jobs/${jobId}`)
      else navigate('/jobs')
      return
    }

    if (n.type === 'follow' && n.actorId) {
      navigate(`/producer/${n.actorId}`)
      return
    }

    if (n.type === 'payout-completed') {
      navigate('/producer/withdraw')
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={openBell}
        className="relative flex h-10 w-10 items-center justify-center text-slate-300 hover:text-emerald-400 transition"
        aria-label="Notifications"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-5 w-5 text-slate-300"
        >
          <path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10 22h4" />
        </svg>
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-slate-950">
            {unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-[46px] w-72 rounded-2xl border border-slate-800/70 bg-slate-900/90 p-3 shadow-xl backdrop-blur-md">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[11px] font-semibold text-slate-200">
              Notifications
            </p>
            {unread > 0 && (
              <button
                onClick={markRead}
                className="text-[10px] text-emerald-400 hover:text-emerald-300"
              >
                Mark all read
              </button>
            )}
          </div>
          <ul className="max-h-72 space-y-2 overflow-auto">
            {items.slice(0, 25).map((n) => {
              const baseName =
                n.data?.user &&
                n.data.user !== 'User' &&
                n.data.user !== 'Someone'
                  ? n.data.user
                  : n.data?.from &&
                    n.data.from !== 'User' &&
                    n.data.from !== 'Someone'
                  ? n.data.from
                  : n.actorId && actorNames[n.actorId]
                  ? actorNames[n.actorId]
                  : n.data?.user || n.data?.from || 'Someone'

              const data = { ...n.data, user: baseName, from: baseName }

              return (
                <li
                  key={n.id}
                  onClick={() => handleClick(n)}
                  className={`flex cursor-pointer gap-2 rounded-lg border border-slate-800/60 p-2 transition hover:border-emerald-400/60 ${
                    !n.read ? 'bg-slate-800/40' : 'bg-slate-900/40'
                  }`}
                >
                  {ICONS[n.type]}
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] text-slate-200 truncate">
                      {n.type === 'sale' && (
                        <>
                          Sale:{' '}
                          <span className="text-emerald-300">
                            {data.currency}{' '}
                            {Number(data.amount || 0).toFixed(2)}
                          </span>
                          {data.beatTitle && <> • {data.beatTitle}</>}
                        </>
                      )}
                      {n.type === 'like' && (
                        <>
                          Like: {data.user} liked{' '}
                          <span className="text-pink-300">
                            {data.beatTitle || 'your beat'}
                          </span>
                        </>
                      )}
                      {n.type === 'favorite' && (
                        <>
                          Favorite: {data.user} saved{' '}
                          <span className="text-amber-300">
                            {data.beatTitle || 'your beat'}
                          </span>
                        </>
                      )}
                      {n.type === 'comment' && (
                        <>
                          Comment: {data.user} "{data.text}"
                        </>
                      )}
                      {n.type === 'follow' && (
                        <>
                          New follower:{' '}
                          <span className="text-indigo-300">{data.user}</span>
                        </>
                      )}
                      {n.type === 'message' && (
                        <>
                          Message from {data.from}: "{data.snippet || ''}"
                        </>
                      )}
                      {n.type === 'job-approved' && (
                        <>
                          Job approved:{' '}
                          <span className="text-slate-100">
                            {data.title || 'Your job post'}
                          </span>
                        </>
                      )}
                      {n.type === 'job-denied' && (
                        <>
                          Job not approved:{' '}
                          <span className="text-slate-100">
                            {data.title || 'Your job post'}
                          </span>
                        </>
                      )}
                      {n.type === 'job-accepted' && (
                        <>
                          Proposal accepted for{' '}
                          <span className="text-slate-100">
                            {data.title || 'a job'}
                          </span>
                          {typeof data.amount !== 'undefined' && (
                            <>
                              {' '}
                              •{' '}
                              <span className="text-emerald-300">
                                ${Number(data.amount || 0).toFixed(2)}
                              </span>
                            </>
                          )}
                        </>
                      )}
                      {n.type === 'job-files' && (
                        <>
                          Files shared for job{' '}
                          <span className="text-slate-100">
                            {data.title || ''}
                          </span>
                        </>
                      )}
                      {n.type === 'job-paid' && (
                        <>
                          Job paid:{' '}
                          <span className="text-emerald-300">
                            {(data.currency || 'USD')}{' '}
                            {Number(data.amount || 0).toFixed(2)}
                          </span>{' '}
                          for{' '}
                          <span className="text-slate-100">
                            {data.title || 'a job'}
                          </span>
                        </>
                      )}
                      {n.type === 'payout-completed' && (
                        <>
                          Payout completed:{' '}
                          <span className="text-emerald-300">
                            {(data.currency || 'USD')}{' '}
                            {Number(data.amount || 0).toFixed(2)}
                          </span>
                        </>
                      )}
                    </p>
                  <p className="mt-0.5 text-[9px] text-slate-500">
                    {timeAgo(n.ts)}
                  </p>
                </div>
              </li>
            ))}
            {items.length === 0 && (
              <li className="text-[11px] text-slate-500">
                No notifications yet.
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  )
}

import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import AdminLayout from '../components/AdminLayout'
import useSupabaseUser from '../hooks/useSupabaseUser'
import { fetchThreads, fetchProfilesByIds } from '../services/socialService'
import ChatWidget from '../components/ChatWidget'
import { supabase } from '../lib/supabaseClient'

export function AdminChat() {
  const { user } = useSupabaseUser()
  const location = useLocation()
  const emailFromQuery = new URLSearchParams(location.search).get('email') || ''
  const [threads, setThreads] = useState([])
  const [profiles, setProfiles] = useState([])
  const [selected, setSelected] = useState(null)
  const [searchEmail, setSearchEmail] = useState(emailFromQuery)
  const [searchSuggestions, setSearchSuggestions] = useState([])

  useEffect(() => {
    ;(async () => {
      if (!user) return
      const t = await fetchThreads({ userId: user.id })
      setThreads(t)
      const ids = t.map((th) => th.otherUserId)
      if (ids.length) setProfiles(await fetchProfilesByIds(ids))
    })()
  }, [user])

  useEffect(() => {
    if (emailFromQuery) {
      setSearchEmail(emailFromQuery)
    }
  }, [emailFromQuery])

  useEffect(() => {
    const term = searchEmail.trim()
    if (!term) {
      setSearchSuggestions([])
      return
    }
    ;(async () => {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('id, display_name, email, role')
          .or(`email.ilike.%${term}%,display_name.ilike.%${term}%`)
          .limit(8)
        setSearchSuggestions(data || [])
      } catch {
        setSearchSuggestions([])
      }
    })()
  }, [searchEmail])

  const profileFor = (id) => profiles.find((p) => p.id === id)
  const recipient = selected
    ? {
        id: selected.otherUserId,
        email: profileFor(selected.otherUserId)?.email || 'user',
      }
    : null

  return (
    <AdminLayout
      title="Admin Chat"
      subtitle="Search users by email or username and reply to conversations."
    >
      <div className="grid gap-6 md:grid-cols-[260px,1fr] lg:grid-cols-[260px,1.4fr,260px]">
        <aside className="rounded-2xl border border-slate-800/80 bg-slate-900/80 p-4 h-fit space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">
            Threads
          </h2>
          <div className="space-y-2">
            {!user && (
              <p className="text-[11px] text-slate-500">Log in as admin to view threads.</p>
            )}
            {user && threads.length === 0 && (
              <p className="text-[11px] text-slate-500">
                No conversations yet. Use the search panel on the right to find a user by email or
                username and start a chat.
              </p>
            )}
            {user &&
              threads.map((th) => {
                const prof = profileFor(th.otherUserId)
                return (
                  <button
                    key={th.otherUserId}
                    onClick={() => setSelected(th)}
                    className={`w-full rounded-lg border px-3 py-2 text-left text-[11px] transition ${
                      selected && selected.otherUserId === th.otherUserId
                        ? 'border-emerald-400/70 bg-emerald-500/10 text-emerald-200'
                        : 'border-slate-800/70 bg-slate-950/70 text-slate-300 hover:border-emerald-400/50'
                    }`}
                  >
                    <p className="font-semibold">
                      {prof?.display_name || prof?.email || 'User'}
                    </p>
                    <p className="mt-0.5 line-clamp-1 text-[10px] text-slate-500">
                      {th.last.content ||
                        (th.last.attachment_name
                          ? `[Attachment] ${th.last.attachment_name}`
                          : '[Attachment]')}
                    </p>
                  </button>
                )
              })}
          </div>
        </aside>
        <div className="min-h-[480px]">
          <ChatWidget recipientExternal={recipient} initialEmail={searchEmail} />
        </div>
        <aside className="hidden lg:block rounded-2xl border border-slate-800/80 bg-slate-900/80 p-4 space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">
            Search users
          </h2>
          <div className="relative">
            <input
              value={searchEmail}
              onChange={(e) => setSearchEmail(e.target.value)}
              placeholder="Search by email or username"
              className="w-full rounded-lg border border-slate-700/70 bg-slate-950/80 px-3 py-2 text-[12px] text-slate-100"
            />
            {searchSuggestions.length > 0 && (
              <div className="absolute z-20 mt-1 w-full max-h-60 overflow-auto rounded-xl border border-slate-800/80 bg-slate-950/95 text-[11px] text-slate-100 shadow-lg">
                {searchSuggestions.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      if (!p.email) return
                      setSearchEmail(p.email)
                      setSearchSuggestions([])
                      setSelected(null)
                    }}
                    className="flex w-full flex-col items-start px-3 py-2 text-left hover:bg-slate-900/90"
                  >
                    <span className="w-full truncate font-semibold">
                      {p.display_name || p.email || 'User'}
                    </span>
                    <span className="mt-0.5 w-full truncate text-[10px] text-slate-400">
                      {p.role || 'Member'}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <p className="text-[10px] text-slate-500">
            Start typing to see live suggestions. Click a result to prefill the email in the main
            chat panel.
          </p>
        </aside>
      </div>
    </AdminLayout>
  )
}

export default AdminChat

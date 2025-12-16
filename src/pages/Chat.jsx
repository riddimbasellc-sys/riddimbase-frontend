import ChatWidget from '../components/ChatWidget'
import BackButton from '../components/BackButton'
import useSupabaseUser from '../hooks/useSupabaseUser'
import { useEffect, useState } from 'react'
import { fetchThreads, fetchProfilesByIds } from '../services/socialService'
import { useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

export function Chat() {
  const { user } = useSupabaseUser()
  const [threads, setThreads] = useState([])
  const [profiles, setProfiles] = useState([])
  const [selected, setSelected] = useState(null)
  const location = useLocation()
  const emailFromQuery = new URLSearchParams(location.search).get('email') || ''
  const [searchEmail, setSearchEmail] = useState(emailFromQuery)
  const [suggested, setSuggested] = useState([])
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
    ;(async () => {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('id, display_name, email, role')
          .or('role.eq.producer,role.eq.artist,role.eq.service')
          .limit(6)
        setSuggested(data || [])
      } catch {
        setSuggested([])
      }
    })()
  }, [])

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
          .or(
            `email.ilike.%${term}%,display_name.ilike.%${term}%`,
          )
          .limit(8)
        setSearchSuggestions(data || [])
      } catch {
        setSearchSuggestions([])
      }
    })()
  }, [searchEmail])

  const profileFor = (id) => profiles.find((p) => p.id === id)
  const recipientProfile = selected ? profileFor(selected.otherUserId) : null
  const recipient = selected
    ? {
        id: selected.otherUserId,
        email: recipientProfile?.email || 'user',
        display_name: recipientProfile?.display_name || null,
      }
    : null

  return (
    <section className="bg-slate-950/95 min-h-screen">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="flex items-center gap-3 mb-6">
          <BackButton />
          <h1 className="font-display text-2xl font-semibold text-slate-50">Chat</h1>
        </div>
        <div className="mb-4 rounded-2xl border border-slate-800/80 bg-slate-900/80 p-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-300">
              Start a conversation
            </p>
            <p className="mt-1 text-[11px] text-slate-400">
              Search by email or username, or pick a recommended producer, artist or service provider.
            </p>
          </div>
          <div className="mt-2 flex w-full max-w-sm gap-2 md:mt-0">
            <div className="relative flex-1">
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
            <button
              type="button"
              onClick={() => {
                if (!searchEmail.trim()) return
                setSelected(null)
              }}
              className="rounded-full bg-emerald-500 px-4 py-2 text-[11px] font-semibold text-slate-950 hover:bg-emerald-400"
            >
              Start chatting
            </button>
          </div>
        </div>
        <div className="grid gap-6 md:grid-cols-[260px,1fr,320px]">
          <aside className="rounded-2xl border border-slate-800/80 bg-slate-900/80 p-4 h-fit space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">
              Threads
            </h2>
            <div className="space-y-2">
              {!user && (
                <p className="text-[11px] text-slate-500">Log in to view threads.</p>
              )}
              {user && threads.length === 0 && (
                <p className="text-[11px] text-slate-500">No conversations yet.</p>
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
            <ChatWidget
              recipientExternal={recipient}
              initialEmail={searchEmail || emailFromQuery}
            />
          </div>
          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/80 p-4 space-y-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-100">Suggested contacts</h2>
              <ul className="mt-2 space-y-2 text-[11px] text-slate-300">
                {suggested.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center justify-between rounded-lg border border-slate-800/80 bg-slate-950/80 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-100 truncate">
                        {p.display_name || p.email || 'User'}
                      </p>
                      <p className="text-[10px] text-slate-500">
                        {p.role || 'Member'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (!p.email) return
                        setSelected(null)
                        setSearchEmail(p.email)
                      }}
                      className="rounded-full border border-emerald-400/70 bg-emerald-500/10 px-3 py-1 text-[10px] font-semibold text-emerald-200 hover:bg-emerald-500/20"
                    >
                      Chat
                    </button>
                  </li>
                ))}
                {suggested.length === 0 && (
                  <li className="text-[11px] text-slate-500">
                    Suggested producers and providers will appear here.
                  </li>
                )}
              </ul>
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-100">Tips</h2>
              <ul className="text-[11px] text-slate-400 space-y-1 mt-2">
                <li>• Chats are private between two users.</li>
                <li>• Do not exchange off-platform payment info.</li>
                <li>• Keep conversations professional and respectful.</li>
                <li>• Use the search bar to start a new chat by email.</li>
              </ul>
              <p className="text-[10px] text-slate-500 mt-2">
                Group rooms & attachments coming soon.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

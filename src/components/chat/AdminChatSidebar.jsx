import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

export function AdminChatSidebar({
  conversations,
  activeConversationId,
  onSelectConversation,
  onStartConversationWithUser,
}) {
  const [search, setSearch] = useState('')
  const [suggestions, setSuggestions] = useState([])

  useEffect(() => {
    const term = search.trim()
    if (!term) {
      setSuggestions([])
      return
    }

    ;(async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, display_name, email')
        .or(`email.ilike.%${term}%,display_name.ilike.%${term}%`)
        .limit(10)

      if (!error) {
        setSuggestions(data || [])
      }
    })()
  }, [search])

  return (
    <aside className="w-72 border-r border-slate-800/70 bg-slate-950/80 backdrop-blur-xl flex flex-col">
      <div className="px-4 pt-4 pb-3 border-b border-slate-800/70">
        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-rose-400">
          RiddimBase · Inbox
        </p>
        <h2 className="mt-1 text-sm font-semibold text-slate-50">Conversations</h2>
        <div className="mt-3 relative">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search user by email or name…"
            className="w-full rounded-xl border border-slate-700/70 bg-slate-950/70 px-3 py-1.5 text-[11px] text-slate-100 placeholder:text-slate-500 focus:border-rose-500/70 focus:outline-none"
          />
          {suggestions.length > 0 && (
            <div className="absolute z-20 mt-1 w-full rounded-xl border border-slate-800/80 bg-slate-950/95 max-h-60 overflow-y-auto text-[11px]">
              {suggestions.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => {
                    if (onStartConversationWithUser) {
                      onStartConversationWithUser(u)
                    } else {
                      setSearch(u.email || '')
                    }
                    setSuggestions([])
                  }}
                  className="flex w-full flex-col items-start px-3 py-2 hover:bg-slate-900/80"
                >
                  <span className="truncate font-semibold text-slate-50">
                    {u.display_name || u.email}
                  </span>
                  <span className="truncate text-[10px] text-slate-400">{u.email}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1 text-[11px]">
        {conversations.map((c) => {
          const active = c.id === activeConversationId
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => onSelectConversation(c.id)}
              className={`w-full rounded-2xl px-3 py-2 text-left flex items-center justify-between gap-2 transition ${
                active
                  ? 'bg-gradient-to-r from-rose-600/70 to-amber-500/50 text-slate-50 shadow-[0_0_20px_rgba(248,113,113,0.35)]'
                  : 'bg-slate-900/70 border border-slate-800/80 text-slate-200 hover:border-rose-500/60'
              }`}
            >
              <div className="flex-1 min-w-0">
                <p className="truncate font-semibold text-[11px]">
                  {c.subject || 'Conversation'}
                </p>
                <p className="mt-0.5 truncate text-[10px] text-slate-400">
                  {c.last_message_preview || 'No messages yet'}
                </p>
              </div>
              <span className="ml-1 inline-flex items-center justify-center rounded-full bg-rose-500/90 text-[9px] px-1.5 py-[1px] text-slate-950">
                0
              </span>
            </button>
          )
        })}
        {conversations.length === 0 && (
          <p className="px-3 py-4 text-[11px] text-slate-500">
            No chats yet. Start by searching for a user.
          </p>
        )}
      </div>
    </aside>
  )
}

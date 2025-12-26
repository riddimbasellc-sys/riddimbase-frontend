import { useMemo, useState } from 'react'

export function ConversationList({
  conversations,
  loading,
  activeConversationId,
  onSelectConversation,
}) {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return conversations
    return conversations.filter(
      (c) =>
        c.otherUserName.toLowerCase().includes(q) ||
        (c.lastMessagePreview ?? '').toLowerCase().includes(q),
    )
  }, [conversations, query])

  return (
    <aside className="w-[280px] lg:w-[300px] xl:w-[320px] flex flex-col bg-slate-950/90 border-r border-slate-900/80">
      <div className="px-4 pt-4 pb-3 border-b border-slate-900/80 bg-slate-950/95">
        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-rose-400">
          Inbox
        </p>
        <h2 className="mt-1 text-sm font-semibold text-slate-50">Messages</h2>
        <div className="mt-3 relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[11px] text-slate-500">
            🔍
          </span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search conversations"
            className="w-full rounded-xl bg-slate-900/80 border border-slate-800/80 pl-8 pr-3 py-1.5 text-[11px] text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-rose-500/80 focus:ring-0"
            aria-label="Search conversations"
          />
        </div>
      </div>

      <div
        className="flex-1 overflow-y-auto px-2 py-2 space-y-1"
        aria-label="Conversation list"
      >
        {loading && (
          <>
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-2 rounded-2xl bg-slate-900/80 border border-slate-900/90 px-3 py-2 animate-pulse"
              >
                <div className="h-8 w-8 rounded-full bg-slate-800/80" />
                <div className="flex-1 space-y-1">
                  <div className="h-2.5 w-2/3 rounded-full bg-slate-800/80" />
                  <div className="h-2 w-1/2 rounded-full bg-slate-900/80" />
                </div>
              </div>
            ))}
          </>
        )}

        {!loading && filtered.length === 0 && (
          <div className="mt-6 text-center text-[11px] text-slate-500 px-4">
            <p className="font-medium text-slate-400 mb-1">No conversations yet</p>
            <p>When artists message you, they will appear here.</p>
          </div>
        )}

        {!loading &&
          filtered.map((c) => {
            const isActive = c.id === activeConversationId
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => onSelectConversation(c.id)}
                className={`group w-full flex items-center gap-2 rounded-2xl px-3 py-2 text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-rose-500/80 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${
                  isActive
                    ? 'bg-gradient-to-r from-rose-600/70 to-amber-500/50 border border-rose-400/70 shadow-[0_0_20px_rgba(248,113,113,0.40)]'
                    : 'bg-slate-950/40 border border-slate-900/80 hover:border-rose-500/60 hover:bg-slate-900/80'
                }`}
                aria-current={isActive ? 'page' : undefined}
              >
                <div className="relative shrink-0">
                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center text-[11px] font-semibold text-slate-100">
                    {c.otherUserAvatarUrl ? (
                      <img
                        src={c.otherUserAvatarUrl}
                        alt={c.otherUserName}
                        className="h-full w-full rounded-full object-cover"
                      />
                    ) : (
                      c.otherUserName
                        .split(' ')
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join('')
                        .toUpperCase()
                    )}
                  </div>
                  {c.unreadCount && c.unreadCount > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 inline-flex h-2 w-2 rounded-full bg-rose-400 shadow-[0_0_0_2px_rgba(15,23,42,1)]" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-[12px] font-semibold text-slate-50">
                    {c.otherUserName}
                  </p>
                  <p className="truncate text-[11px] text-slate-400">
                    {c.lastMessagePreview || 'No messages yet'}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  {c.lastMessageAt && (
                    <span className="text-[10px] text-slate-500">
                      {new Date(c.lastMessageAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  )}
                  {c.unreadCount && c.unreadCount > 0 && (
                    <span className="inline-flex items-center justify-center rounded-full bg-rose-500/90 px-1.5 py-[1px] text-[10px] font-semibold text-slate-950">
                      {c.unreadCount > 9 ? '9+' : c.unreadCount}
                    </span>
                  )}
                </div>
              </button>
            )
          })}
      </div>
    </aside>
  )
}

export default ConversationList

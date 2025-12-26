import { useEffect, useRef, useState } from 'react'
import { MessageBubble } from './MessageBubble.jsx'

export function ChatWindow({
  currentUserId,
  conversation,
  messages,
  loading,
  hasMore,
  onLoadMore,
  typingUsers,
  onBlockUser,
  onOpenReport,
  onClearChat,
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const listRef = useRef(null)

  useEffect(() => {
    const el = listRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [messages.length])

  const handleScroll = (e) => {
    const el = e.currentTarget
    if (el.scrollTop === 0 && hasMore && !loading) {
      onLoadMore()
    }
  }

  if (!conversation) {
    return (
      <section className="flex flex-1 flex-col items-center justify-center bg-gradient-to-br from-slate-950 via-slate-950/95 to-slate-950/98 text-center px-6">
        <div className="max-w-xs">
          <p className="text-[12px] font-semibold text-slate-100 mb-1">
            No conversation selected
          </p>
          <p className="text-[11px] text-slate-500">
            Choose a conversation from the left to view messages, or wait
            for new inquiries from artists.
          </p>
        </div>
      </section>
    )
  }

  const typingLabel =
    typingUsers && typingUsers.length > 0
      ? `${typingUsers[0].display_name || 'Someone'} is typing…`
      : null

  return (
    <section className="flex flex-1 flex-col bg-gradient-to-b from-slate-950 via-slate-950/96 to-slate-950/98 relative">
      <header className="flex items-center justify-between border-b border-slate-900/80 bg-slate-950/95 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="relative h-9 w-9 rounded-full bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center text-[12px] font-semibold text-slate-100">
            {conversation.otherUserAvatarUrl ? (
              <img
                src={conversation.otherUserAvatarUrl}
                alt={conversation.otherUserName}
                className="h-full w-full rounded-full object-cover"
              />
            ) : (
              conversation.otherUserName
                .split(' ')
                .map((n) => n[0])
                .slice(0, 2)
                .join('')
                .toUpperCase()
            )}
            {conversation.isOnline && (
              <span className="absolute -right-0.5 -bottom-0.5 inline-flex h-2.5 w-2.5 items-center justify-center rounded-full bg-emerald-400 ring-2 ring-slate-950">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-900" />
              </span>
            )}
          </div>
          <div>
            <p className="text-[13px] font-semibold text-slate-50">
              {conversation.otherUserName}
            </p>
            <p className="text-[11px] text-slate-400">
              {conversation.isOnline ? 'Online now' : 'Last seen recently'}
            </p>
          </div>
        </div>
        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-900/80 border border-slate-800/80 text-slate-300 hover:text-rose-300 hover:border-rose-500/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/80 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
            aria-label="Conversation actions"
          >
            <span className="text-lg leading-none">⋮</span>
          </button>
          {menuOpen && (
            <div className="absolute right-0 mt-2 w-44 rounded-2xl border border-slate-800/90 bg-slate-950/95 py-1 text-[11px] text-slate-100 shadow-xl z-20">
              <button
                type="button"
                className="flex w-full items-center justify-between px-3 py-1.5 hover:bg-slate-900/90"
                onClick={() => {
                  // TODO: open profile drawer for this user
                  setMenuOpen(false)
                }}
              >
                View profile
              </button>
              <button
                type="button"
                className="flex w-full items-center justify-between px-3 py-1.5 text-rose-300 hover:bg-rose-500/10"
                onClick={() => {
                  onBlockUser(conversation.otherUserId)
                  setMenuOpen(false)
                }}
              >
                Block user
              </button>
              <button
                type="button"
                className="flex w-full items-center justify-between px-3 py-1.5 text-amber-200 hover:bg-amber-500/10"
                onClick={() => {
                  onOpenReport(conversation.otherUserId, conversation.id)
                  setMenuOpen(false)
                }}
              >
                Report user
              </button>
              <button
                type="button"
                className="flex w-full items-center justify-between px-3 py-1.5 text-slate-300 hover:bg-slate-900/90"
                onClick={() => {
                  onClearChat(conversation.id)
                  setMenuOpen(false)
                }}
              >
                Clear chat
              </button>
            </div>
          )}
        </div>
      </header>

      <div
        ref={listRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-3"
        aria-label="Messages"
      >
        {loading && (
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}
              >
                <div className="h-10 w-32 rounded-2xl bg-slate-900/80 border border-slate-900/90 animate-pulse" />
              </div>
            ))}
          </div>
        )}

        {!loading && hasMore && (
          <div className="flex justify-center py-1">
            <span className="text-[10px] text-slate-500">
              Scroll up to load earlier messages
            </span>
          </div>
        )}

        {!loading && messages.length === 0 && (
          <div className="mt-10 text-center text-[11px] text-slate-500">
            No messages yet. Say hi and start the conversation.
          </div>
        )}

        {!loading &&
          messages.map((m) => (
            <MessageBubble
              key={m.id}
              message={m}
              isOwn={m.sender_id === currentUserId}
            />
          ))}

        {typingLabel && (
          <div className="mt-1 text-[10px] text-slate-400">{typingLabel}</div>
        )}
      </div>
    </section>
  )
}

export default ChatWindow

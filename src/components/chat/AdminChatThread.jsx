import { useEffect, useRef, useState } from 'react'
import { uploadChatAttachment } from '../../services/storageService'

const EMOJIS = ['🔥', '🎧', '🎵', '😂', '🙏', '❤️', '💽', '💬']

export function AdminChatThread({
  activeConversationId,
  messages,
  hasMore,
  loadMore,
  sendMessage,
  typingUsers,
  setTyping,
}) {
  const listRef = useRef(null)

  useEffect(() => {
    const el = listRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [messages.length])

  const handleScroll = (e) => {
    const el = e.currentTarget
    if (el.scrollTop === 0 && hasMore) {
      loadMore()
    }
  }

  const handleSend = async ({ text, file }) => {
    if (!text && !file) return
    let type = 'text'
    let attachment = null
    if (file) {
      const { publicUrl } = await uploadChatAttachment(file)
      const mime = file.type || 'application/octet-stream'
      attachment = { publicUrl, name: file.name, mime }
      if (mime.startsWith('image/')) type = 'image'
      else if (mime.startsWith('audio/')) type = 'audio'
      else type = 'file'
    }
    await sendMessage({ conversationId: activeConversationId, type, content: text || null, attachment })
  }

  return (
    <section className="flex-1 flex flex-col bg-gradient-to-b from-slate-950 via-slate-950/95 to-slate-950/98 relative">
      {!activeConversationId ? (
        <div className="flex flex-1 items-center justify-center text-[12px] text-slate-500">
          Select a conversation to start chatting.
        </div>
      ) : (
        <>
          <div
            ref={listRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto px-5 py-4 space-y-3"
          >
            {hasMore && (
              <div className="flex justify-center py-1">
                <span className="text-[10px] text-slate-500">
                  Scroll up to load earlier messages
                </span>
              </div>
            )}
            {messages.map((m) => (
              <MessageBubble key={m.id} message={m} />
            ))}
          </div>
          <div className="px-5 pb-4">
            {typingUsers?.length > 0 && (
              <div className="mb-1 text-[10px] text-slate-400">
                {typingUsers[0].display_name || 'User'} is typing…
              </div>
            )}
            <FloatingInput
              disabled={!activeConversationId}
              onSend={handleSend}
              onTyping={setTyping}
            />
          </div>
        </>
      )}
    </section>
  )
}

function MessageBubble({ message }) {
  const isAdmin = message.meta?.sender_role === 'admin'
  const isDeleted = !!message.deleted_at

  const base =
    'relative max-w-[72%] rounded-2xl px-3 py-2 text-[12px] shadow-md backdrop-blur bg-slate-900/80 border'
  const cls = isAdmin
    ? `${base} ml-auto border-rose-500/70 bg-gradient-to-br from-rose-600/80 to-amber-500/60 text-slate-50`
    : `${base} mr-auto border-slate-800/80 bg-slate-900/80 text-slate-50`

  let body = null
  if (isDeleted) {
    body = (
      <span className="italic text-slate-400 text-[11px]">
        This message was deleted.
      </span>
    )
  } else if (message.type === 'image' && message.attachment_url) {
    body = (
      <div className="space-y-1">
        {message.content && (
          <p className="whitespace-pre-wrap">{message.content}</p>
        )}
        <img
          src={message.attachment_url}
          alt={message.attachment_name || 'Image'}
          className="rounded-xl max-h-64 object-cover border border-black/20"
        />
      </div>
    )
  } else if (message.type === 'audio' && message.attachment_url) {
    body = (
      <div className="space-y-1">
        {message.content && (
          <p className="whitespace-pre-wrap">{message.content}</p>
        )}
        <audio controls src={message.attachment_url} className="w-full mt-1" />
      </div>
    )
  } else if (message.type === 'file' && message.attachment_url) {
    body = (
      <div className="space-y-1">
        {message.content && (
          <p className="whitespace-pre-wrap">{message.content}</p>
        )}
        <a
          href={message.attachment_url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-full bg-slate-900/80 border border-slate-600/70 px-3 py-1 text-[11px] text-rose-300 hover:border-rose-400/80"
        >
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-rose-500" />
          {message.attachment_name || 'Download file'}
        </a>
      </div>
    )
  } else {
    body = <p className="whitespace-pre-wrap">{message.content}</p>
  }

  const statusLabel = 'Seen'

  return (
    <div className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}>
      <div className={cls}>
        {body}
        <div className="mt-1 flex items-center justify-end gap-2 text-[9px] text-slate-300/80">
          <span>
            {new Date(message.created_at).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
          <span className="text-emerald-300/90">{statusLabel}</span>
        </div>
      </div>
    </div>
  )
}

function FloatingInput({ disabled, onSend, onTyping }) {
  const [val, setVal] = useState('')
  const [emojiOpen, setEmojiOpen] = useState(false)
  const fileInputRef = useRef(null)

  const submit = async (e) => {
    e.preventDefault()
    if (!val.trim() && !(fileInputRef.current?.files?.[0])) return
    const file = fileInputRef.current?.files?.[0] || null
    await onSend({ text: val.trim(), file })
    setVal('')
    if (fileInputRef.current) fileInputRef.current.value = ''
    setEmojiOpen(false)
    onTyping(false)
  }

  return (
    <form
      onSubmit={submit}
      className="relative rounded-2xl border border-slate-800/80 bg-slate-950/80 backdrop-blur-xl shadow-[0_18px_60px_rgba(15,23,42,0.95)] px-3 py-2 flex items-center gap-2"
    >
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className="shrink-0 inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-900/80 text-slate-300 hover:text-rose-300 hover:border-rose-400/80 border border-slate-700/70 text-[14px]"
        title="Attach file"
      >
        ⬆
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,audio/*,application/pdf"
        className="hidden"
      />
      <textarea
        disabled={disabled}
        value={val}
        onChange={(e) => {
          setVal(e.target.value)
          onTyping(true)
        }}
        rows={1}
        placeholder="Type a message…"
        className="flex-1 resize-none bg-transparent border-none text-[12px] text-slate-100 placeholder:text-slate-500 focus:outline-none"
      />
      <div className="relative">
        <button
          type="button"
          onClick={() => setEmojiOpen((v) => !v)}
          className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-900/80 border border-slate-700/70 text-[15px] text-slate-300 hover:text-rose-300"
          title="Emoji"
        >
          🙂
        </button>
        {emojiOpen && (
          <div className="absolute bottom-full right-0 mb-2 rounded-2xl border border-slate-800/80 bg-slate-950/95 px-2 py-1 text-[16px] flex flex-wrap gap-1 shadow-xl">
            {EMOJIS.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => {
                  setVal((prev) => (prev || '') + e)
                  setEmojiOpen(false)
                }}
                className="hover:bg-slate-800/80 rounded-lg px-1"
              >
                {e}
              </button>
            ))}
          </div>
        )}
      </div>
      <button
        type="submit"
        disabled={disabled}
        className="shrink-0 inline-flex items-center justify-center rounded-full bg-rose-600 px-4 py-1.5 text-[11px] font-semibold text-slate-50 hover:bg-rose-500 disabled:opacity-40"
      >
        Send
      </button>
    </form>
  )
}

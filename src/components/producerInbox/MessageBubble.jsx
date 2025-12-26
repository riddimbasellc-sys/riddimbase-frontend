import React from 'react'

export function MessageBubble({ message, isOwn }) {
  const base =
    'relative max-w-[75%] rounded-2xl px-3 py-2 text-[12px] shadow-md backdrop-blur border'
  const cls = isOwn
    ? `${base} ml-auto bg-gradient-to-br from-rose-600/80 to-amber-500/60 border-rose-400/80 text-slate-50`
    : `${base} mr-auto bg-slate-900/90 border-slate-800/90 text-slate-50`

  const time = new Date(message.created_at).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })

  let body = null

  if (message.type === 'image' && message.attachment_url) {
    body = (
      <div className="space-y-1">
        {message.content && (
          <p className="whitespace-pre-wrap text-[12px]">{message.content}</p>
        )}
        <div className="overflow-hidden rounded-xl border border-black/20 bg-slate-950/40">
          <img
            src={message.attachment_url}
            alt={message.attachment_name || 'Image attachment'}
            className="max-h-72 w-full object-cover"
          />
        </div>
      </div>
    )
  } else if (message.type === 'audio' && message.attachment_url) {
    body = (
      <div className="space-y-1">
        {message.content && (
          <p className="whitespace-pre-wrap text-[12px]">{message.content}</p>
        )}
        <div className="flex items-center gap-2 rounded-xl bg-slate-950/60 border border-slate-800/90 px-2 py-1.5">
          <span className="text-rose-300 text-sm">🎧</span>
          <audio controls src={message.attachment_url} className="flex-1" />
        </div>
      </div>
    )
  } else if (message.type === 'file' && message.attachment_url) {
    body = (
      <div className="space-y-1">
        {message.content && (
          <p className="whitespace-pre-wrap text-[12px]">{message.content}</p>
        )}
        <a
          href={message.attachment_url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-full bg-slate-950/70 border border-slate-700/80 px-3 py-1 text-[11px] text-rose-200 hover:border-rose-400/80"
        >
          <span className="text-xs">📄</span>
          <span>{message.attachment_name || 'Download file'}</span>
        </a>
      </div>
    )
  } else {
    body = (
      <p className="whitespace-pre-wrap text-[12px]">
        {message.content || ''}
      </p>
    )
  }

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
      <div className={cls}>
        {body}
        <div className="mt-1 flex items-center justify-end gap-1 text-[9px] text-slate-200/80">
          <span>{time}</span>
          {isOwn && (
            <span className="inline-flex items-center gap-0.5 text-emerald-300/90">
              ✓✓
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

export default MessageBubble

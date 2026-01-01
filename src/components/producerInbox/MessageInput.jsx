import { useRef, useState } from 'react'

const EMOJI_PICKER_EMOJIS = [
  '😀',
  '😃',
  '😄',
  '😁',
  '😆',
  '😎',
  '😍',
  '🤩',
  '🔥',
  '🎧',
  '🎵',
  '🎶',
  '🥁',
  '💰',
  '✅',
  '❌',
]

export function MessageInput({ disabled, onSend }) {
  const [text, setText] = useState('')
  const [attachment, setAttachment] = useState(null)
  const [emojiOpen, setEmojiOpen] = useState(false)
  const fileInputRef = useRef(null)

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleSubmit = async () => {
    if (!text.trim() && !attachment) return
    await onSend({ text: text.trim(), attachment })
    setText('')
    setAttachment(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const mime = file.type
    let type = 'file'
    if (mime.startsWith('image/')) type = 'image'
    else if (mime.startsWith('audio/')) type = 'audio'
    setAttachment({ file, type })
  }

  const triggerFile = () => {
    fileInputRef.current?.click()
  }

  const handleEmoji = () => {
    setEmojiOpen((open) => !open)
  }

  const handleEmojiSelect = (emoji) => {
    setText((prev) => `${prev || ''}${emoji}`)
    setEmojiOpen(false)
  }

  return (
    <div className="relative flex items-end gap-2 rounded-2xl bg-slate-950/90 border border-slate-900/80 px-3 py-2 shadow-[0_18px_60px_rgba(15,23,42,0.95)]">
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={handleEmoji}
          className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-900/80 border border-slate-800/80 text-[15px] text-slate-300 hover:text-rose-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/80 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
          aria-label="Add emoji"
        >
          <span className="text-sm">🙂</span>
        </button>
        {emojiOpen && (
          <div className="absolute bottom-full left-0 mb-2 w-64 rounded-2xl border border-slate-800/80 bg-slate-950/95 p-2 text-lg shadow-xl z-20">
            <div className="flex flex-wrap gap-1">
              {EMOJI_PICKER_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => handleEmojiSelect(emoji)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900/80 hover:bg-slate-800/90"
                >
                  <span>{emoji}</span>
                </button>
              ))}
            </div>
          </div>
        )}
        <button
          type="button"
          onClick={triggerFile}
          className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-900/80 border border-slate-800/80 text-[15px] text-slate-300 hover:text-rose-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/80 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
          aria-label="Attach file"
        >
          <span className="text-sm">📎</span>
        </button>
        <button
          type="button"
          disabled
          className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-900/80 border border-slate-800/80 text-[15px] text-slate-500 cursor-not-allowed"
          aria-label="Record voice note (coming soon)"
        >
          <span className="text-sm">🎙</span>
        </button>
      </div>

      <div className="flex-1 min-w-0">
        {attachment && (
          <div className="mb-1 inline-flex items-center gap-2 rounded-full bg-slate-900/80 border border-slate-800/90 px-2 py-0.5 text-[10px] text-slate-200">
            <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-rose-500/90 text-[9px] text-slate-950">
              {attachment.type === 'image' && 'IMG'}
              {attachment.type === 'audio' && 'AUD'}
              {attachment.type === 'file' && 'DOC'}
            </span>
            <span className="max-w-[140px] truncate">{attachment.file.name}</span>
            <button
              type="button"
              onClick={() => setAttachment(null)}
              className="ml-1 text-slate-400 hover:text-rose-300"
              aria-label="Remove attachment"
            >
              ×
            </button>
          </div>
        )}
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          placeholder="Type a message"
          className="block w-full resize-none border-none bg-transparent text-[12px] text-slate-100 placeholder:text-slate-500 focus:outline-none"
          aria-label="Message input"
          disabled={disabled}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,audio/*,application/pdf"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      <div className="flex items-center">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={disabled || (!text.trim() && !attachment)}
          className="inline-flex items-center gap-1 rounded-full bg-rose-600 px-4 py-1.5 text-[11px] font-semibold text-slate-50 hover:bg-rose-500 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/80 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
        >
          <span>Send</span>
        </button>
      </div>
    </div>
  )
}

export default MessageInput

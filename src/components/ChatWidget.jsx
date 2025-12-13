import { useState, useEffect, useRef } from 'react'
import useSupabaseUser from '../hooks/useSupabaseUser'
import { sendMessage, fetchMessages, subscribeMessages, findUserByEmail } from '../services/socialService'

export default function ChatWidget({ recipientExternal, initialEmail }) {
  const { user } = useSupabaseUser()
  const [recipientEmail, setRecipientEmail] = useState(initialEmail || '')
  const [recipient, setRecipient] = useState(recipientExternal || null)
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const listRef = useRef(null)

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight
  }, [messages])

  useEffect(() => {
    if (initialEmail && initialEmail !== recipientEmail) {
      setRecipientEmail(initialEmail)
    }
  }, [initialEmail])

  useEffect(() => {
    if (!user || !recipient) return
    let unsub = () => {}
    ;(async () => {
      setMessages(await fetchMessages({ userId: user.id, otherUserId: recipient.id, limit: 100 }))
      unsub = subscribeMessages({ userId: user.id, otherUserId: recipient.id, onMessage: (m) => {
        setMessages(prev => [...prev, m])
      }})
    })()
    return () => unsub()
  }, [user, recipient])

  const handleResolveRecipient = async () => {
    if (!recipientEmail.trim()) return
    const u = await findUserByEmail(recipientEmail.trim())
    setRecipient(u)
  }

  useEffect(() => {
    if (!user || !initialEmail || recipient) return
    ;(async () => {
      const u = await findUserByEmail(initialEmail.trim())
      if (u) setRecipient(u)
    })()
  }, [user, initialEmail, recipient])

  const handleSend = async (e) => {
    e.preventDefault()
    if (!user || !recipient || !text.trim()) return
    const res = await sendMessage({ senderId: user.id, recipientId: recipient.id, content: text.trim() })
    if (res.success) {
      setMessages(prev => [...prev, res.message])
      setText('')
    } else if (res.limitReached) {
      alert(
        res.error ||
          'You have reached the monthly messaging limit on the Free plan. Upgrade to a paid plan for unlimited chat.',
      )
    }
  }

  return (
    <div className="rounded-2xl border border-slate-800/80 bg-slate-900/80 p-4 flex flex-col h-full">
      <h2 className="text-sm font-semibold text-slate-100">Direct Messages</h2>
      {!user && <p className="mt-2 text-xs text-slate-400">Log in to use chat.</p>}
      {user && !recipient && (
        <div className="mt-3 space-y-2">
          <input value={recipientEmail} onChange={e=>setRecipientEmail(e.target.value)} placeholder="Email or username" className="w-full rounded-lg border border-slate-700/70 bg-slate-950/70 px-3 py-2 text-[12px] text-slate-100" />
          <button onClick={handleResolveRecipient} className="w-full rounded-full bg-emerald-500 px-4 py-2 text-[11px] font-semibold text-slate-950">Start Chat</button>
          <p className="text-[10px] text-slate-500">Enter the user’s email or display name to start a chat.</p>
        </div>
      )}
      {user && recipient && (
        <div className="mt-3 flex flex-col h-full">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[11px] text-slate-300">Chatting with <span className="font-medium text-slate-200">{recipient.email}</span></p>
            <button onClick={()=>setRecipient(null)} className="text-[10px] text-slate-400 hover:text-red-300">End</button>
          </div>
          <div ref={listRef} className="flex-1 overflow-y-auto space-y-2 pr-1">
            {messages.map(m => {
              const mine = m.sender_id === user.id
              return (
                <div key={m.id} className={`max-w-[75%] rounded-xl px-3 py-2 text-[11px] ${mine ? 'ml-auto bg-emerald-500/20 text-emerald-200' : 'bg-slate-800/80 text-slate-200'}`}> {m.content} </div>
              )
            })}
            {messages.length===0 && <p className="text-[10px] text-slate-500">No messages yet.</p>}
          </div>
          <form onSubmit={handleSend} className="mt-3 flex items-end gap-2">
            <div className="flex flex-1 items-end gap-2 rounded-lg border border-slate-700/70 bg-slate-950/70 px-2 py-1">
              <button
                type="button"
                className="flex h-8 w-8 items-center justify-center rounded-full text-lg text-slate-400 hover:text-emerald-300 hover:bg-slate-800/80"
                aria-label="Add emoji"
              >
                <span>😊</span>
              </button>
              <button
                type="button"
                className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:text-emerald-300 hover:bg-slate-800/80"
                aria-label="Attach file"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4"
                >
                  <path d="M21 15V6.5A4.5 4.5 0 0 0 16.5 2h0A4.5 4.5 0 0 0 12 6.5v9a3 3 0 0 1-6 0V8" />
                </svg>
              </button>
              <textarea
                value={text}
                onChange={e=>setText(e.target.value)}
                placeholder="Type a message"
                rows={1}
                className="flex-1 resize-none bg-transparent px-1 py-1 text-[12px] text-slate-100 placeholder:text-slate-500 focus:outline-none"
              />
            </div>
            <button
              disabled={!text.trim()}
              className="inline-flex items-center justify-center rounded-full bg-emerald-500 px-4 py-2 text-[11px] font-semibold text-slate-950 disabled:opacity-40 hover:bg-emerald-400 transition"
            >
              Send
            </button>
          </form>
        </div>
      )}
    </div>
  )
}

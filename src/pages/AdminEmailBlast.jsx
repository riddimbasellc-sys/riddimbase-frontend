import { useEffect, useState } from 'react'
import AdminLayout from '../components/AdminLayout'
import { listEmailBlasts, fetchAllUsers, sendEmailBlast, createEmailBlast, saveBlastRecipients } from '../services/emailBlastService'
import { useAdminRole } from '../hooks/useAdminRole'

export function AdminEmailBlast() {
  const { isAdmin, loading } = useAdminRole()
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [users, setUsers] = useState([])
  const [blasts, setBlasts] = useState([])
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [previewMode, setPreviewMode] = useState('plain') // plain | formatted
  const [includeFooter, setIncludeFooter] = useState(true)
  const [htmlMode, setHtmlMode] = useState(false)
  const [attachments, setAttachments] = useState([]) // { name, type, size, base64 }

  useEffect(() => {
    ;(async () => {
      const [existingBlasts, allUsers] = await Promise.all([
        listEmailBlasts(),
        fetchAllUsers(),
      ])
      setBlasts(existingBlasts || [])
      setUsers(allUsers || [])
    })()
  }, [])

  const canSend = subject.trim() && body.trim() && !sending

  async function handleFiles(e) {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    const readAsBase64 = (file) =>
      new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => {
          const result = reader.result || ''
          const base64 = typeof result === 'string' ? result.split(',')[1] || '' : ''
          resolve({
            name: file.name,
            type: file.type,
            size: file.size,
            base64,
          })
        }
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
    try {
      const list = await Promise.all(files.map(readAsBase64))
      setAttachments(list)
    } catch {
      // ignore read errors
    }
  }

  async function handleSend(e) {
    e.preventDefault()
    if (!canSend) return
    setSending(true)
    setError(null); setSuccess(null)
    const recipients = users
    try {
      const ok = await sendEmailBlast({ subject, body, recipients, includeFooter, html: htmlMode, attachments })
      if (!ok) throw new Error('Failed to dispatch email blast.')
      const blast = await createEmailBlast({ subject, body, totalRecipients: recipients.length, includeFooter, html: htmlMode })
      if (blast) {
        // Log recipients per blast in Supabase
        await saveBlastRecipients(blast.id, recipients)
      }
      setBlasts(prev => [blast, ...prev])
      setSuccess(`Sent to ${recipients.length} recipient${recipients.length===1?'':'s'}.`)
      setSubject(''); setBody(''); setAttachments([])
    } catch (e) {
      setError(e.message || 'Unexpected error sending blast.')
    } finally { setSending(false) }
  }

  function resend(blast) {
    setSubject(blast.subject)
    setBody(blast.body)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (loading) return <section className="min-h-screen flex items-center justify-center bg-slate-950/95"><p className="text-sm text-slate-400">Loading auth…</p></section>
  if (!isAdmin) return <section className="min-h-screen flex items-center justify-center bg-slate-950/95"><p className="text-sm text-slate-400">Access denied.</p></section>

  return (
    <AdminLayout title="Email Blast" subtitle="Send a branded announcement to all users">
      <div className="space-y-8">
        <form onSubmit={handleSend} className="rounded-2xl border border-slate-800/80 bg-slate-900/80 p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-100 tracking-wide">Compose Blast</h2>
            <div className="flex items-center gap-3 text-[10px] text-slate-400">
              <span>Recipients: <span className="text-emerald-300 font-semibold">{users.length}</span></span>
              <select value={previewMode} onChange={e=>setPreviewMode(e.target.value)} className="rounded border border-slate-700/70 bg-slate-950/70 px-2 py-1 text-[10px] text-slate-200">
                <option value="plain">Plain</option>
                <option value="formatted">Formatted</option>
              </select>
              <label className="flex items-center gap-1 cursor-pointer">
                <input type="checkbox" checked={htmlMode} onChange={e=>setHtmlMode(e.target.checked)} className="h-3 w-3 rounded border-slate-600 bg-slate-800" />
                <span className="text-[10px]">HTML Mode</span>
              </label>
              <label className="flex items-center gap-1 cursor-pointer">
                <input type="checkbox" checked={includeFooter} onChange={e=>setIncludeFooter(e.target.checked)} className="h-3 w-3 rounded border-slate-600 bg-slate-800" />
                <span className="text-[10px]">Unsubscribe Footer</span>
              </label>
            </div>
          </div>
          {error && <div className="rounded-lg border border-rose-500/60 bg-rose-500/10 px-3 py-2 text-[11px] text-rose-300">{error}</div>}
          {success && <div className="rounded-lg border border-emerald-500/60 bg-emerald-500/10 px-3 py-2 text-[11px] text-emerald-300">{success}</div>}
          <div className="space-y-2">
            <label className="text-[10px] font-semibold text-slate-400 tracking-wide">
              Attachments
            </label>
            <input
              type="file"
              multiple
              onChange={handleFiles}
              className="text-[11px] text-slate-300"
            />
            {attachments.length > 0 && (
              <ul className="mt-1 flex flex-wrap gap-2 text-[10px] text-slate-300">
                {attachments.map((a) => (
                  <li
                    key={a.name + a.size}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-700/70 bg-slate-950/80 px-3 py-1"
                  >
                    <span className="truncate max-w-[140px]">{a.name}</span>
                    <button
                      type="button"
                      onClick={() =>
                        setAttachments((prev) => prev.filter((x) => x.name !== a.name || x.size !== a.size))
                      }
                      className="text-slate-400 hover:text-rose-300"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <p className="text-[10px] text-slate-500">
              Attachments are sent with the blast to every recipient. Keep files reasonably small
              for best deliverability.
            </p>
          </div>
          <div className="flex flex-col">
            <label className="text-[10px] font-semibold text-slate-400 tracking-wide">Subject</label>
            <input value={subject} onChange={e=>setSubject(e.target.value)} placeholder="Launch Announcement, Maintenance Window, Promo…" className="mt-1 rounded-lg border border-slate-700/70 bg-slate-950/70 px-3 py-2 text-[12px] text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-400/70" />
          </div>
          <div className="flex flex-col">
            <label className="text-[10px] font-semibold text-slate-400 tracking-wide">Body</label>
            <textarea value={body} onChange={e=>setBody(e.target.value)} rows={8} placeholder="Write your message…" className="mt-1 rounded-lg border border-slate-700/70 bg-slate-950/70 px-3 py-2 text-[12px] text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-400/70" />
            <p className="mt-1 text-[10px] text-slate-500">Variables: {'{{display_name}}'} will personalize per user. Line breaks preserved. HTML mode sends raw markup.</p>
          </div>
          <div className="space-y-3">
            <h3 className="text-[11px] font-semibold text-slate-300 tracking-wide">Live Preview</h3>
            <div className="rounded-xl border border-slate-700/70 bg-gradient-to-br from-slate-950/90 to-slate-900/70 p-5 shadow-inner">
              <div className="space-y-2">
                <div className="text-[13px] font-bold tracking-wide text-emerald-300">{subject || 'Subject preview'}</div>
                {(() => {
                  const sampleUser = users[0] || { display_name: 'Producer', email: 'user@example.com' }
                  const replaced = (body || 'Body preview…').replace(/{{\s*display_name\s*}}/gi, sampleUser.display_name || sampleUser.email || 'there')
                  const footer = includeFooter ? '\n\n—\nYou are receiving this email because you have an account on RiddimBase. To unsubscribe from future promotional emails, update your notification preferences in your profile.' : ''
                  const finalText = replaced + footer
                  if (htmlMode) {
                    return <div className="text-[12px] leading-relaxed font-medium text-slate-200" dangerouslySetInnerHTML={{ __html: finalText.replace(/\n/g,'<br/>') }} />
                  }
                  if (previewMode === 'plain') {
                    return <pre className="whitespace-pre-wrap text-[12px] leading-relaxed font-medium text-slate-200">{finalText}</pre>
                  }
                  return (
                    <div className="prose prose-invert max-w-none text-[13px]">
                      {finalText.split(/\n\n+/).map((block,i) => (
                        <p key={i} className="mb-3">{block}</p>
                      ))}
                    </div>
                  )
                })()}
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={!canSend} className="rounded-full bg-emerald-500 px-6 py-2 text-[11px] font-semibold text-slate-950 disabled:opacity-30 hover:bg-emerald-400 transition">{sending? 'Sending…':'Send Blast'}</button>
            <button type="button" onClick={()=>{setSubject('');setBody('');}} disabled={sending || (!subject && !body)} className="rounded-full bg-slate-700/70 px-6 py-2 text-[11px] font-semibold text-slate-200 disabled:opacity-30 hover:bg-slate-600/80 transition">Clear</button>
          </div>
        </form>
        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-6">
          <h2 className="text-sm font-semibold text-slate-100 tracking-wide mb-4">Past Blasts ({blasts.length})</h2>
          {blasts.length === 0 && <p className="text-[11px] text-slate-500">No blasts sent yet.</p>}
          <ul className="space-y-3">
            {blasts.map(b => (
              <li key={b.id} className="rounded-xl border border-slate-800/70 bg-slate-950/70 p-4 flex flex-col gap-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-[11px] font-semibold text-emerald-300 truncate" title={b.subject}>{b.subject}</div>
                  <div className="flex items-center gap-2">
                      <span className="rounded-full border border-cyan-400/50 px-2 py-[2px] text-[10px] font-medium text-cyan-300">{b.totalRecipients} recipients</span>
                      {b.includeFooter && <span className="rounded-full border border-emerald-400/50 px-2 py-[2px] text-[10px] font-medium text-emerald-300">Footer</span>}
                      {b.html && <span className="rounded-full border border-indigo-400/50 px-2 py-[2px] text-[10px] font-medium text-indigo-300">HTML</span>}
                    <span className="text-[10px] text-slate-500">{new Date(b.createdAt).toLocaleString([], { hour:'2-digit', minute:'2-digit', month:'short', day:'numeric' })}</span>
                    <button onClick={()=>resend(b)} className="rounded-full border border-emerald-400/60 px-3 py-1 text-[10px] font-medium text-emerald-300 hover:bg-emerald-500/10">Load</button>
                  </div>
                </div>
                  <div className="text-[11px] text-slate-300 max-h-32 overflow-y-auto whitespace-pre-wrap">{b.body}{b.includeFooter && '\n\n—\n(Unsubscribe footer included when sent)'}{b.html && '\n[HTML mode]'}</div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </AdminLayout>
  )
}

export default AdminEmailBlast

import { useEffect, useState } from 'react'
import AdminLayout from '../components/AdminLayout'
import { listEmailBlasts, fetchAllUsers, sendEmailBlast, createEmailBlast, saveBlastRecipients } from '../services/emailBlastService'
import { useAdminRole } from '../hooks/useAdminRole'
import useSupabaseUser from '../hooks/useSupabaseUser'

const CAMPAIGN_TEMPLATES = [
  {
    id: 'announcement',
    label: 'Product announcement',
    description: 'New feature launches, platform updates and roadmap notes.',
    subject: "What's new on RiddimBase this week",
    body:
      "Hey {{display_name}},\n\nWe just shipped a fresh set of updates on RiddimBase - including new producer features, Recording Lab improvements and marketplace polish.\n\nJump in, explore what's new and let us know what you'd like to see next.\n\n- The RiddimBase team",
  },
  {
    id: 'promo',
    label: 'Promo / offer',
    description: 'Limited-time discounts, bundles or seasonal campaigns.',
    subject: 'Limited-time offer for the RiddimBase community',
    body:
      "Hey {{display_name}},\n\nFor a limited time, we're running a special offer on select beats, services and Recording Lab credits. It's a chance to stock up, save and get your next release moving.\n\nTap in now before the campaign ends.\n\n- The RiddimBase team",
  },
  {
    id: 'maintenance',
    label: 'Maintenance window',
    description: 'Planned downtime or reliability notifications.',
    subject: 'Planned maintenance window for RiddimBase',
    body:
      "Hey {{display_name}},\n\nWe're scheduling a short maintenance window to keep RiddimBase fast and reliable. During this time, some features may be temporarily unavailable.\n\nWe'll share another update once everything is back online. Thanks for your patience.\n\n- The RiddimBase team",
  },
]

export function AdminEmailBlast() {
  const { isAdmin, loading } = useAdminRole()
  const { user: authUser } = useSupabaseUser()
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
  const [audienceFilter, setAudienceFilter] = useState('all') // all | producers | artists | services | custom
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedIds, setSelectedIds] = useState([])
  const [previewDevice, setPreviewDevice] = useState('desktop') // desktop | mobile
  const [previewTheme, setPreviewTheme] = useState('dark') // dark | light
  const [testEmail, setTestEmail] = useState('')
  const [sendingTest, setSendingTest] = useState(false)
  const [activeTemplateId, setActiveTemplateId] = useState(null)

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

  const parsedUsers = Array.isArray(users) ? users : []

  const resolveRecipients = () => {
    const term = searchTerm.trim().toLowerCase()
    const base = parsedUsers.filter((u) => {
      const role = (u.role || '').toLowerCase()
      const tokens = role.split(/[+\s,\/]+/).filter(Boolean)
      if (audienceFilter === 'producers') {
        if (!tokens.includes('producer')) return false
      } else if (audienceFilter === 'artists') {
        if (!tokens.includes('artist')) return false
      } else if (audienceFilter === 'services') {
        if (!tokens.includes('service')) return false
      } else if (audienceFilter === 'custom') {
        if (!selectedIds.includes(u.id)) return false
      }
      if (!term) return true
      const haystack = `${u.email || ''} ${u.display_name || ''} ${u.role || ''}`.toLowerCase()
      return haystack.includes(term)
    })
    return base
  }

  const recipients = resolveRecipients()
  const totalRecipients = recipients.length
  const canSend = subject.trim() && body.trim() && !sending && totalRecipients > 0

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
    const recipientsToSend = recipients
    try {
      if (!window.confirm(`Send this campaign to ${recipientsToSend.length} recipient${recipientsToSend.length === 1 ? '' : 's'}? This cannot be undone.`)) {
        setSending(false)
        return
      }
      const ok = await sendEmailBlast({ subject, body, recipients: recipientsToSend, includeFooter, html: htmlMode, attachments })
      if (!ok) throw new Error('Failed to dispatch email blast.')
      const blast = await createEmailBlast({ subject, body, totalRecipients: recipientsToSend.length, includeFooter, html: htmlMode })
      if (blast) {
        // Log recipients per blast in Supabase
        await saveBlastRecipients(blast.id, recipientsToSend)
      }
      setBlasts(prev => [blast, ...prev])
      setSuccess(`Sent to ${recipientsToSend.length} recipient${recipientsToSend.length===1?'':'s'}.`)
      setSubject(''); setBody(''); setAttachments([])
    } catch (e) {
      setError(e.message || 'Unexpected error sending blast.')
    } finally { setSending(false) }
  }

  async function handleTestSend(e) {
    e.preventDefault()
    const email = (testEmail || authUser?.email || '').trim()
    if (!email || !subject.trim() || !body.trim() || sendingTest) return
    setSendingTest(true)
    setError(null); setSuccess(null)
    try {
      const ok = await sendEmailBlast({
        subject,
        body,
        recipients: [{ id: null, email, display_name: 'Test Recipient' }],
        includeFooter,
        html: htmlMode,
        attachments,
      })
      if (!ok) throw new Error('Failed to dispatch test email.')
      setSuccess(`Test email sent to ${email}.`)
    } catch (e) {
      setError(e.message || 'Unexpected error sending test email.')
    } finally {
      setSendingTest(false)
    }
  }

  function resend(blast) {
    setSubject(blast.subject)
    setBody(blast.body)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (loading) return <section className="min-h-screen flex items-center justify-center bg-slate-950/95"><p className="text-sm text-slate-400">Loading auth…</p></section>
  if (!isAdmin) return <section className="min-h-screen flex items-center justify-center bg-slate-950/95"><p className="text-sm text-slate-400">Access denied.</p></section>

  return (
    <AdminLayout title="Email Blast" subtitle="Design and send branded campaigns to targeted audiences">
      <div className="space-y-8">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr),minmax(0,0.9fr)] items-start">
          <form onSubmit={handleSend} className="rounded-2xl border border-slate-800/80 bg-slate-900/80 p-6 space-y-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-100 tracking-wide">Compose Campaign</h2>
                <p className="mt-1 text-[11px] text-slate-400">Subject, content and attachments for this blast.</p>
              </div>
              <div className="flex flex-col items-end gap-1 text-[10px] text-slate-400">
                <span>
                  Targeting
                  <span className="ml-1 rounded-full border border-emerald-400/60 px-2 py-[1px] text-[10px] font-semibold text-emerald-300">
                    {totalRecipients} recipient{totalRecipients === 1 ? '' : 's'}
                  </span>
                </span>
                <span className="text-[10px] text-slate-500">Audience: {audienceFilter === 'all' ? 'Everyone' : audienceFilter === 'producers' ? 'Producers' : audienceFilter === 'artists' ? 'Artists' : audienceFilter === 'services' ? 'Service providers' : 'Custom selection'}</span>
              </div>
            </div>
            {error && <div className="rounded-lg border border-rose-500/60 bg-rose-500/10 px-3 py-2 text-[11px] text-rose-300">{error}</div>}
            {success && <div className="rounded-lg border border-emerald-500/60 bg-emerald-500/10 px-3 py-2 text-[11px] text-emerald-300">{success}</div>}

            <div className="space-y-3">
              <p className="text-[10px] font-semibold text-slate-400 tracking-wide">Audience</p>
              <div className="flex flex-wrap gap-2 text-[11px]">
                {[
                  { id: 'all', label: 'Everyone' },
                  { id: 'producers', label: 'Producers' },
                  { id: 'artists', label: 'Artists' },
                  { id: 'services', label: 'Service providers' },
                  { id: 'custom', label: 'Custom list' },
                ].map((opt) => {
                  const active = audienceFilter === opt.id
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setAudienceFilter(opt.id)}
                      className={`rounded-full border px-3 py-1.5 font-medium transition ${
                        active
                          ? 'border-emerald-400/70 bg-emerald-500/10 text-emerald-300'
                          : 'border-slate-700/70 bg-slate-950/70 text-slate-300 hover:border-slate-500'
                      }`}
                    >
                      {opt.label}
                    </button>
                  )
                })}
              </div>
              <div className="mt-2 flex items-center gap-2 text-[11px]">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search recipients by email, name or role…"
                  className="w-full rounded-lg border border-slate-700/70 bg-slate-950/70 px-3 py-1.5 text-[11px] text-slate-100 placeholder:text-slate-500 focus:border-emerald-400/70 focus:outline-none"
                />
              </div>
              {audienceFilter === 'custom' && (
                <div className="mt-2 rounded-xl border border-slate-800/80 bg-slate-950/80 p-3 max-h-40 overflow-y-auto text-[11px] text-slate-200">
                  {recipients.length === 0 && (
                    <p className="text-[10px] text-slate-500">Search and click to add recipients to this custom list.</p>
                  )}
                  {parsedUsers
                    .filter((u) => {
                      const term = searchTerm.trim().toLowerCase()
                      if (!term) return true
                      const haystack = `${u.email || ''} ${u.display_name || ''} ${u.role || ''}`.toLowerCase()
                      return haystack.includes(term)
                    })
                    .slice(0, 80)
                    .map((u) => {
                      const active = selectedIds.includes(u.id)
                      return (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() =>
                            setSelectedIds((prev) =>
                              prev.includes(u.id) ? prev.filter((id) => id !== u.id) : [...prev, u.id],
                            )
                          }
                          className={`flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left transition ${
                            active
                              ? 'bg-emerald-500/10 text-emerald-200'
                              : 'bg-transparent hover:bg-slate-900/80 text-slate-200'
                          }`}
                        >
                          <span className="truncate mr-2">{u.display_name || u.email}</span>
                          <span className="truncate text-[10px] text-slate-400">{u.email}</span>
                        </button>
                      )
                    })}
                </div>
              )}
              <p className="mt-1 text-[10px] text-slate-500">
                Audience is resolved at send time. Use custom lists for small targeted sends.
              </p>
            </div>

            <div className="space-y-2 pt-2">
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

            <div className="flex flex-col pt-2">
              <label className="text-[10px] font-semibold text-slate-400 tracking-wide">Subject</label>
              <input
                value={subject}
                onChange={e=>setSubject(e.target.value)}
                placeholder="Launch Announcement, Maintenance Window, Promo…"
                className="mt-1 rounded-lg border border-slate-700/70 bg-slate-950/70 px-3 py-2 text-[12px] text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-400/70"
              />
            </div>
            <div className="space-y-2">
              <p className="text-[10px] font-semibold text-slate-400 tracking-wide">Templates</p>
              <div className="flex gap-2 overflow-x-auto pb-1 text-[11px]">
                {CAMPAIGN_TEMPLATES.map((tpl) => {
                  const active = activeTemplateId === tpl.id
                  return (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => {
                        setActiveTemplateId(tpl.id)
                        setSubject((prev) => prev || tpl.subject)
                        setBody((prev) => prev || tpl.body)
                      }}
                      className={`min-w-[180px] rounded-xl border px-3 py-2 text-left transition ${
                        active
                          ? 'border-emerald-400/70 bg-emerald-500/10 text-emerald-200'
                          : 'border-slate-700/70 bg-slate-950/70 text-slate-200 hover:border-slate-500'
                      }`}
                    >
                      <div className="text-[11px] font-semibold truncate">{tpl.label}</div>
                      <div className="mt-0.5 text-[10px] text-slate-400 truncate">{tpl.description}</div>
                    </button>
                  )
                })}
              </div>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-semibold text-slate-400 tracking-wide">Body</label>
                <div className="flex items-center gap-3 text-[10px] text-slate-400">
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
              <textarea
                value={body}
                onChange={e=>setBody(e.target.value)}
                rows={8}
                placeholder="Write your message…"
                className="mt-1 rounded-lg border border-slate-700/70 bg-slate-950/70 px-3 py-2 text-[12px] text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-400/70"
              />
              <p className="mt-1 text-[10px] text-slate-500">Variables: {'{{display_name}}'} will personalize per user. Line breaks are preserved; HTML mode sends raw markup.</p>
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <button type="submit" disabled={!canSend} className="rounded-full bg-emerald-500 px-6 py-2 text-[11px] font-semibold text-slate-950 disabled:opacity-30 hover:bg-emerald-400 transition">{sending? 'Sending…':'Send campaign'}</button>
              <button type="button" onClick={()=>{setSubject('');setBody('');}} disabled={sending || (!subject && !body)} className="rounded-full bg-slate-700/70 px-6 py-2 text-[11px] font-semibold text-slate-200 disabled:opacity-30 hover:bg-slate-600/80 transition">Clear</button>
            </div>
          </form>

          <div className="space-y-4 rounded-2xl border border-slate-800/80 bg-slate-900/80 p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-100 tracking-wide">Preview & Testing</h3>
                <p className="mt-1 text-[11px] text-slate-400">See how this campaign will render and send yourself a test.</p>
              </div>
              <div className="flex flex-col items-end gap-1 text-[10px] text-slate-400">
                <div className="inline-flex rounded-full border border-slate-700/80 bg-slate-950/80 p-1 text-[10px]">
                  <button
                    type="button"
                    onClick={() => setPreviewDevice('desktop')}
                    className={`px-2 py-[2px] rounded-full ${previewDevice === 'desktop' ? 'bg-slate-100 text-slate-900' : 'text-slate-300'}`}
                  >
                    Desktop
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewDevice('mobile')}
                    className={`px-2 py-[2px] rounded-full ${previewDevice === 'mobile' ? 'bg-slate-100 text-slate-900' : 'text-slate-300'}`}
                  >
                    Mobile
                  </button>
                </div>
                <div className="inline-flex rounded-full border border-slate-700/80 bg-slate-950/80 p-1 text-[10px]">
                  <button
                    type="button"
                    onClick={() => setPreviewTheme('light')}
                    className={`px-2 py-[2px] rounded-full ${previewTheme === 'light' ? 'bg-slate-100 text-slate-900' : 'text-slate-300'}`}
                  >
                    Light
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewTheme('dark')}
                    className={`px-2 py-[2px] rounded-full ${previewTheme === 'dark' ? 'bg-slate-100 text-slate-900' : 'text-slate-300'}`}
                  >
                    Dark
                  </button>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800/80 bg-gradient-to-br from-slate-950/90 to-slate-900/80 p-4 shadow-inner">
              <div className="mx-auto w-full" style={{ maxWidth: previewDevice === 'mobile' ? 360 : 720 }}>
                <div className="rounded-xl border border-slate-800/80 bg-slate-950/90 px-4 py-2 flex items-center justify-between text-[10px] text-slate-400">
                  <span className="font-semibold text-slate-200">RiddimBase Inbox</span>
                  <span>{totalRecipients} recipient{totalRecipients === 1 ? '' : 's'}</span>
                </div>
                <div className={`mt-2 rounded-xl border ${previewTheme === 'dark' ? 'border-slate-700 bg-slate-950 text-slate-100' : 'border-slate-200 bg-white text-slate-900'} p-4 text-[12px] leading-relaxed`}>
                  <div className="mb-3 border-b border-slate-700/60 pb-2 text-[11px]">
                    <div className="font-semibold truncate">{subject || 'Subject preview'}</div>
                    <div className="mt-0.5 text-[10px] text-slate-400">from RiddimBase &lt;notifications@riddimbase.app&gt;</div>
                  </div>
                  {(() => {
                    const sampleUser = recipients[0] || parsedUsers[0] || { display_name: 'Producer', email: 'user@example.com' }
                    const replaced = (body || 'Body preview…').replace(/{{\s*display_name\s*}}/gi, sampleUser.display_name || sampleUser.email || 'there')
                    const footer = includeFooter ? '\n\n—\nYou are receiving this email because you have an account on RiddimBase. To unsubscribe from future promotional emails, update your notification preferences in your profile.' : ''
                    const finalText = replaced + footer
                    if (htmlMode) {
                      return <div className="text-[12px]" dangerouslySetInnerHTML={{ __html: finalText.replace(/\n/g,'<br/>') }} />
                    }
                    if (previewMode === 'plain') {
                      return <pre className="whitespace-pre-wrap text-[12px]">{finalText}</pre>
                    }
                    return (
                      <div className="prose max-w-none text-[13px] prose-p:mb-3 prose-headings:mt-4 prose-headings:mb-2">
                        {finalText.split(/\n\n+/).map((block,i) => (
                          <p key={i}>{block}</p>
                        ))}
                      </div>
                    )
                  })()}
                </div>
              </div>
            </div>

            <form onSubmit={handleTestSend} className="mt-2 flex flex-col gap-2 rounded-xl border border-slate-800/80 bg-slate-950/80 p-3 text-[11px] text-slate-200">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-slate-200">Test send</span>
                <span className="text-[10px] text-slate-500">Send this campaign to a single address before sending to all recipients.</span>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <input
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder={authUser?.email || 'your@test-address.com'}
                  className="w-full rounded-lg border border-slate-700/70 bg-slate-950/70 px-3 py-1.5 text-[11px] text-slate-100 placeholder:text-slate-500 focus:border-emerald-400/70 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={sendingTest || !subject.trim() || !body.trim()}
                  className="shrink-0 rounded-full bg-slate-100 px-4 py-1.5 text-[11px] font-semibold text-slate-900 disabled:opacity-40 hover:bg-white/90 transition"
                >
                  {sendingTest ? 'Sending test…' : 'Send test email'}
                </button>
              </div>
            </form>
          </div>
        </div>

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

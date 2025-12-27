import { useState, useEffect } from 'react'
import { openTawk } from '../services/tawkService'
import useSupabaseUser from '../hooks/useSupabaseUser'
import { createSupportTicket } from '../services/supportTicketService'

export default function SupportBubbleWidget() {
  const [open, setOpen] = useState(false)
  const [ticketOpen, setTicketOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const { user } = useSupabaseUser()

  const [form, setForm] = useState({
    name: '',
    username: '',
    email: '',
    phone: '',
    issue: '',
  })

  useEffect(() => {
    if (!ticketOpen) return
    setForm((prev) => ({
      ...prev,
      username: prev.username || user?.user_metadata?.display_name || '',
      email: prev.email || user?.email || '',
    }))
  }, [ticketOpen, user])

  const onChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmitTicket = async (e) => {
    e.preventDefault()
    if (submitting) return

    const name = form.name.trim()
    const username = form.username.trim()
    const email = form.email.trim()
    const phone = form.phone.trim()
    const issue = form.issue.trim()

    if (!issue || !email) {
      // eslint-disable-next-line no-alert
      alert('Please provide at least your email and a short description of the issue.')
      return
    }

    const emailOk = /.+@.+\..+/.test(email)
    if (!emailOk) {
      // eslint-disable-next-line no-alert
      alert('Please enter a valid email address.')
      return
    }

    setSubmitting(true)
    try {
      const subjectBase = name || username || 'Guest user'
      const subject = `Support request - ${subjectBase}`.slice(0, 120)
      const metaLines = [
        name ? `Name: ${name}` : null,
        username ? `Username: ${username}` : null,
        email ? `Email: ${email}` : null,
        phone ? `Phone: ${phone}` : null,
      ].filter(Boolean)

      const messageBody = [
        metaLines.join('\n'),
        metaLines.length ? '' : null,
        'Issue:',
        issue,
      ]
        .filter(Boolean)
        .join('\n')

      await createSupportTicket({
        subject,
        category: 'general',
        message: messageBody,
        contactEmail: email,
        contactPhone: phone || null,
        userId: user?.id || null,
      })

      setSubmitted(true)
      setTimeout(() => {
        setSubmitted(false)
        setTicketOpen(false)
        setForm({ name: '', username: '', email: '', phone: '', issue: '' })
      }, 1600)
    } catch (err) {
      // eslint-disable-next-line no-alert
      alert(err?.message || 'Failed to submit support ticket. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }
  const whatsappHref = 'https://wa.me/18762797956'

  const hasTawkConfig =
    Boolean(import.meta.env.VITE_TAWK_PROPERTY_ID) &&
    Boolean(import.meta.env.VITE_TAWK_WIDGET_ID)

  return (
    <div className="pointer-events-none fixed bottom-24 right-4 z-40 md:bottom-8 md:right-8">
      {open && (
        <div className="pointer-events-auto mb-3 w-64 rounded-2xl border border-slate-800/80 bg-slate-950/95 p-3 shadow-rb-gloss-panel">
          <p className="mb-1 text-[11px] font-semibold text-slate-100">Get help</p>
          <p className="mb-3 text-[10px] text-slate-400">
            Send us a support ticket or reach out on WhatsApp.
          </p>
          <div className="space-y-2 text-[11px] font-medium">
            <button
              type="button"
              onClick={() => {
                setTicketOpen(true)
              }}
              className="flex w-full items-center justify-between rounded-xl bg-red-500/90 px-3 py-2 text-slate-50 hover:bg-red-400 transition"
            >
              <span className="inline-flex items-center gap-2">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-black/30 text-xs">
                  💬
                </span>
                <span>Create support ticket</span>
              </span>
            </button>
            <a
              href={whatsappHref}
              target="_blank"
              rel="noreferrer"
              onClick={() => setOpen(false)}
              className="flex items-center justify-between rounded-xl bg-[#25D366] px-3 py-2 text-slate-950 hover:bg-[#1ebe5a] transition"
            >
              <span className="inline-flex items-center gap-2">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-black/10 text-xs">
                  ☎
                </span>
                <span>Chat on WhatsApp</span>
              </span>
            </a>
          </div>
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="pointer-events-auto inline-flex items-center gap-2 rounded-full bg-red-500 px-4 py-2 text-[11px] font-semibold text-slate-50 shadow-rb-gloss-btn hover:bg-red-400 transition"
        aria-label="Get help"
      >
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-black/30 text-xs">
          ?
        </span>
        <span>Get help</span>
      </button>

      {ticketOpen && (
        <div className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm px-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-800/80 bg-slate-900/95 p-5 text-[12px] text-slate-100">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Support ticket
                </p>
                <h2 className="text-sm font-semibold text-slate-50">Tell us what&apos;s going on</h2>
              </div>
              <button
                type="button"
                onClick={() => setTicketOpen(false)}
                className="rounded-full border border-slate-700/80 px-2 py-0.5 text-[10px] text-slate-300 hover:border-slate-500/80"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleSubmitTicket} className="mt-4 space-y-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-slate-400">
                    Name
                  </label>
                  <input
                    name="name"
                    value={form.name}
                    onChange={onChange}
                    className="w-full rounded-lg border border-slate-700/70 bg-slate-950/70 px-3 py-1.5 text-[12px] text-slate-100 placeholder:text-slate-500 focus:border-emerald-400/70 focus:outline-none"
                    placeholder="Your name"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-slate-400">
                    Username (optional)
                  </label>
                  <input
                    name="username"
                    value={form.username}
                    onChange={onChange}
                    className="w-full rounded-lg border border-slate-700/70 bg-slate-950/70 px-3 py-1.5 text-[12px] text-slate-100 placeholder:text-slate-500 focus:border-emerald-400/70 focus:outline-none"
                    placeholder="RiddimBase username"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-slate-400">
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={onChange}
                    required
                    className="w-full rounded-lg border border-slate-700/70 bg-slate-950/70 px-3 py-1.5 text-[12px] text-slate-100 placeholder:text-slate-500 focus:border-emerald-400/70 focus:outline-none"
                    placeholder="you@example.com"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-slate-400">
                    Phone (optional)
                  </label>
                  <input
                    name="phone"
                    value={form.phone}
                    onChange={onChange}
                    className="w-full rounded-lg border border-slate-700/70 bg-slate-950/70 px-3 py-1.5 text-[12px] text-slate-100 placeholder:text-slate-500 focus:border-emerald-400/70 focus:outline-none"
                    placeholder="e.g. +1 555 123 4567"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-slate-400">
                  What issue are you having?
                </label>
                <textarea
                  name="issue"
                  value={form.issue}
                  onChange={onChange}
                  required
                  rows={4}
                  className="w-full resize-none rounded-lg border border-slate-700/70 bg-slate-950/70 px-3 py-2 text-[12px] text-slate-100 placeholder:text-slate-500 focus:border-emerald-400/70 focus:outline-none"
                  placeholder="Describe what&apos;s happening so we can help."
                />
              </div>

              <div className="mt-2 flex items-center justify-between gap-2">
                <p className="text-[10px] text-slate-500">
                  Your request will appear in the admin ticket queue so our team can reply.
                </p>
                <button
                  type="submit"
                  disabled={submitting || submitted}
                  className="rounded-full bg-emerald-500 px-4 py-1.5 text-[11px] font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-60"
                >
                  {submitted ? 'Submitted' : submitting ? 'Sending…' : 'Send ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}


import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import useSupabaseUser from '../../hooks/useSupabaseUser'
import BackButton from '../../components/BackButton'
import { createSupportTicket } from '../../services/supportTicketService'

export function SupportGeneral() {
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [form, setForm] = useState({ subject:'', category:'general', message:'', contactEmail:'', contactPhone:'' })
  const { user } = useSupabaseUser()
  const location = useLocation()
  const onChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  const submit = async (e) => {
    e.preventDefault()
    if (!form.subject || !form.message || !form.contactEmail || !form.contactPhone) return
    const emailOk = /.+@.+\..+/.test(form.contactEmail)
    const phoneOk = /[0-9]{6,}/.test(form.contactPhone.replace(/[^0-9]/g,''))
    if (!emailOk || !phoneOk) return
    setSubmitting(true)
    await createSupportTicket({ ...form, createdAt: Date.now(), userId: user?.id || null })
    setSubmitting(false)
    setDone(true)
    setTimeout(()=> { setDone(false); setOpen(false); setForm({ subject:'', category:'general', message:'', contactEmail:'', contactPhone:'' }) }, 1600)
  }

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    if (params.get('ticket') === '1') {
      setOpen(true)
    }
  }, [location.search])
  return (
    <section className="mx-auto max-w-4xl px-4 py-12">
      <BackButton />
      <h1 className="mt-2 font-display text-2xl font-semibold text-slate-50">General Inquiries</h1>
      <p className="mt-3 text-sm leading-relaxed text-slate-300">Overview of onboarding, account setup and navigating RiddimBase features.</p>
      <div className="mt-6 space-y-5">
        <div className="rounded-xl border border-slate-800/70 bg-slate-900/60 p-5">
          <h2 className="text-sm font-semibold text-slate-200">Getting Started</h2>
          <p className="mt-1 text-sm text-slate-400">Create a producer or artist account, customize your profile and upload your first beat. Use clear cover art and accurate tags.</p>
        </div>
        <div className="rounded-xl border border-slate-800/70 bg-slate-900/60 p-5">
          <h2 className="text-sm font-semibold text-slate-200">Navigation Tips</h2>
          <p className="mt-1 text-sm text-slate-400">Browse beats, refine with tags, view producer profiles, license beats and monitor updates via your dashboard.</p>
        </div>
        <div className="rounded-xl border border-slate-800/70 bg-slate-900/60 p-5">
          <h2 className="text-sm font-semibold text-slate-200">Contact</h2>
          <p className="mt-1 text-sm text-slate-400">
            For questions not covered here, email support@riddimbaseglobal.com or open a ticket via the Support form.
          </p>
        </div>
      </div>
      <div className="mt-8 flex flex-wrap items-center gap-3">
        <button
          onClick={()=> setOpen(true)}
          className="rounded-full bg-emerald-500 px-5 py-2 text-[12px] font-semibold text-slate-950 shadow hover:bg-emerald-400 transition"
        >
          Create Support Ticket
        </button>
        <a
          href="https://wa.me/18762797956"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-full bg-[#25D366] px-5 py-2 text-[12px] font-semibold text-slate-950 shadow hover:bg-[#1ebe5a] transition"
        >
          <span className="inline-flex h-4 w-4 items-center justify-center">
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
              <path d="M12.04 2A9.9 9.9 0 0 0 2 11.93a9.8 9.8 0 0 0 1.35 5l-1.4 5.1 5.2-1.36A10 10 0 1 0 12.04 2Zm0 2a8 8 0 0 1 0 16 8.1 8.1 0 0 1-4.08-1.1l-.3-.18-3 0.8 0.8-2.9-.2-.31A7.9 7.9 0 0 1 4 11.93 8 8 0 0 1 12.04 4Zm-3 3.3c-.2 0-.5 0-.7.4-.2.5-.7 1.4-.7 2.3s.5 2 1.1 2.7 1.6 1.7 3.1 2.3c1.5.6 2 .5 2.4.4.4 0 1.3-.5 1.4-1s.1-1 .1-1-.1-.1-.3-.2l-1.4-.7c-.2-.1-.4-.2-.6 0l-.5.6c-.1.1-.3.2-.5.1-.2-.1-.9-.3-1.7-1.1-.6-.5-1-1.5-1.1-1.7-.1-.2 0-.3.1-.4l.4-.5c.1-.2.1-.3 0-.5l-.6-1.5C12 7.4 11.9 7.3 11.8 7.3Z" />
            </svg>
          </span>
          <span>Chat now on WhatsApp</span>
        </a>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-800/70 bg-slate-900/80 p-6">
            <h2 className="text-sm font-semibold text-slate-100">New Ticket</h2>
            <p className="mt-1 text-[11px] text-slate-400">Provide clear details so we can assist quickly.</p>
            <form onSubmit={submit} className="mt-4 space-y-4">
              <div>
                <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-slate-400">Subject</label>
                <input name="subject" value={form.subject} onChange={onChange} required className="w-full rounded-lg border border-slate-700/70 bg-slate-950/70 px-3 py-2 text-[12px] text-slate-100 placeholder:text-slate-500 focus:border-emerald-400/70 focus:outline-none" placeholder="e.g. Trouble uploading beat" />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-slate-400">Category</label>
                <select name="category" value={form.category} onChange={onChange} className="w-full rounded-lg border border-slate-700/70 bg-slate-950/70 px-3 py-2 text-[12px] text-slate-100 focus:border-emerald-400/70 focus:outline-none">
                  <option value="general">General</option>
                  <option value="licensing">Licensing</option>
                  <option value="earnings">Earnings</option>
                  <option value="safety">Safety</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-slate-400">Message</label>
                <textarea name="message" value={form.message} onChange={onChange} required rows={5} className="w-full resize-none rounded-lg border border-slate-700/70 bg-slate-950/70 px-3 py-2 text-[12px] text-slate-100 placeholder:text-slate-500 focus:border-emerald-400/70 focus:outline-none" placeholder="Describe the issue or question" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-slate-400">Contact Email *</label>
                  <input required type="email" name="contactEmail" value={form.contactEmail} onChange={onChange} className="w-full rounded-lg border border-slate-700/70 bg-slate-950/70 px-3 py-2 text-[12px] text-slate-100 placeholder:text-slate-500 focus:border-emerald-400/70 focus:outline-none" placeholder="you@example.com" />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-slate-400">Phone *</label>
                  <input required name="contactPhone" value={form.contactPhone} onChange={onChange} className="w-full rounded-lg border border-slate-700/70 bg-slate-950/70 px-3 py-2 text-[12px] text-slate-100 placeholder:text-slate-500 focus:border-emerald-400/70 focus:outline-none" placeholder="e.g. +1 555 123 4567" />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <button type="button" onClick={()=> setOpen(false)} className="rounded-full border border-slate-700/70 px-4 py-2 text-[11px] font-medium text-slate-300 hover:border-slate-600">Cancel</button>
                <button disabled={submitting || done} type="submit" className="rounded-full bg-emerald-500 px-5 py-2 text-[11px] font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-50">
                  {done? 'Submitted' : submitting? 'Submitting…' : 'Submit Ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  )
}

export default SupportGeneral

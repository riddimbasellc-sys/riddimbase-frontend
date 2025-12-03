import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import useSupabaseUser from '../hooks/useSupabaseUser'
import { getJobRequest, getJobDelivery, saveJobDelivery, markJobPaid, addJobReview } from '../services/serviceJobRequestsService'
import { addNotification } from '../services/notificationsRepository'
import PayPalButtonsGroup from '../components/payments/PayPalButtonsGroup'

export function JobDelivery() {
  const { jobId } = useParams()
  const navigate = useNavigate()
  const { user } = useSupabaseUser()
  const [job, setJob] = useState(null)
  const [loading, setLoading] = useState(true)
  const [links, setLinks] = useState([''])
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [error, setError] = useState('')
  const [reviewOpen, setReviewOpen] = useState(false)
  const [reviewRating, setReviewRating] = useState(5)
  const [reviewText, setReviewText] = useState('')

  useEffect(() => { load() }, [jobId])

  async function load() {
    setLoading(true)
    const j = await getJobRequest(jobId)
    setJob(j)
    const existing = getJobDelivery(jobId)
    if (existing) {
      setLinks(existing.links || [''])
      setNotes(existing.notes || '')
    }
    setLoading(false)
  }

  const isOwner = user && job && job.userId === user.id

  const updateLink = (idx, value) => {
    setLinks(prev => prev.map((l,i)=> i===idx ? value : l))
  }
  const addLink = () => setLinks(prev => [...prev, ''])

  const submitDelivery = async (e) => {
    e.preventDefault()
    setSaving(true); setFeedback(''); setError('')
    try {
      saveJobDelivery(jobId, { links: links.filter(Boolean), notes })
      setFeedback('Files shared. Provider notified.')
      try {
        await addNotification({
          recipientId: job.assignedProviderId || job.userId,
          actorId: user?.id || null,
          type: 'job-files',
          data: { title: job.title },
        })
      } catch {}
    } catch (e2) {
      setError(e2.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const handleMarkPaid = async () => {
    // Kept for potential manual override; main flow uses PayPalButtonsGroup onSuccess.
    setSaving(true); setFeedback(''); setError('')
    try {
      markJobPaid(jobId)
      setFeedback('Marked as paid. Funds held until release.')
    } catch (e) {
      setError(e.message || 'Failed to mark paid')
    } finally {
      setSaving(false)
    }
  }

  const submitReview = (e) => {
    e.preventDefault()
    if (!job || !job.assignedProviderId) {
      setReviewOpen(false)
      return
    }
    addJobReview({ jobId, providerId: job.assignedProviderId, rating: reviewRating, text: reviewText })
    setReviewOpen(false)
    setReviewRating(5)
    setReviewText('')
    setFeedback('Review posted to provider profile.')
  }

  if (loading) {
    return <div className="mx-auto max-w-4xl px-4 py-10 text-center text-sm text-slate-400">Loading…</div>
  }
  if (!job) {
    return <div className="mx-auto max-w-4xl px-4 py-10 text-center text-sm text-slate-400">Job not found.</div>
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-emerald-300">Delivery & Escrow</p>
          <h1 className="text-2xl font-semibold text-slate-50">Complete: {job.title}</h1>
          <p className="text-sm text-slate-400">Upload files and process payment. RiddimBase holds the funds in escrow until you click <span className="font-semibold text-emerald-300">Release funds</span> after the job is completed to your satisfaction.</p>
        </div>
        <button onClick={()=>navigate(-1)} className="rounded-full border border-slate-700/70 px-3 py-1 text-[11px] text-slate-300 hover:border-emerald-400/70">Back</button>
      </div>
      <div className="grid gap-6 lg:grid-cols-[1.2fr,0.9fr]">
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/70 p-5">
            <h2 className="text-sm font-semibold text-slate-200">Share deliverables</h2>
            <p className="text-[11px] text-slate-400">Paste file links (Drive/Dropbox/WeTransfer) or notes. Keep everything in one thread.</p>
            <form onSubmit={submitDelivery} className="mt-4 space-y-3">
              {links.map((link, idx) => (
                <input
                  key={idx}
                  value={link}
                  onChange={e=>updateLink(idx, e.target.value)}
                  placeholder="https://link-to-files"
                  className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-emerald-400/70 focus:outline-none"
                />
              ))}
              <button
                type="button"
                onClick={addLink}
                className="rounded-full border border-slate-700/70 px-3 py-1 text-[11px] text-slate-200 hover:border-emerald-400/70"
              >
                + Add another link
              </button>
              <textarea
                value={notes}
                onChange={e=>setNotes(e.target.value)}
                rows={4}
                placeholder="Notes: versioning, instructions, passwords"
                className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-emerald-400/70 focus:outline-none"
              />
              {error && <div className="rounded border border-red-500/40 bg-red-500/10 px-2 py-1 text-[11px] text-red-300">{error}</div>}
              {feedback && <div className="rounded border border-emerald-500/40 bg-emerald-500/10 px-2 py-1 text-[11px] text-emerald-300">{feedback}</div>}
              <div className="flex items-center justify-end gap-2 text-[11px] text-slate-400">
                <span>Both parties notified on submit.</span>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-full border border-emerald-400/70 bg-emerald-500/10 px-4 py-1.5 text-emerald-200 font-semibold hover:bg-emerald-500/20 disabled:opacity-60"
                >
                  {saving ? 'Sending…' : 'Send Files'}
                </button>
              </div>
            </form>
          </div>
          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/70 p-5">
            <h3 className="text-sm font-semibold text-slate-200">Escrow notice</h3>
            <p className="mt-1 text-[11px] text-slate-400">
              Funds are held until the client marks the job as complete. If revisions are pending, keep communication in the thread
              for clarity.
            </p>
          </div>
        </div>
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-800/80 bg-gradient-to-br from-slate-900 to-slate-950 p-5 shadow-[0_12px_40px_rgba(0,0,0,0.35)]">
            <h3 className="text-sm font-semibold text-slate-200">Pay securely</h3>
            <p className="text-[11px] text-slate-400">Payment will be released after approval.</p>
            <div className="mt-3 rounded-xl border border-slate-800/70 bg-slate-900/80 p-3">
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-emerald-400/70 bg-emerald-500/10 px-4 py-2 text-[12px] font-semibold text-emerald-200">
                PayPal (escrow hold)
              </div>
              {job && job.budget > 0 && (
                <PayPalButtonsGroup
                  amount={job.budget}
                  currency="USD"
                  description={`Job: ${job.title}`}
                  onSuccess={async ({ orderId }) => {
                    try {
                      setFeedback('Payment captured. Finalizing escrow…')
                      setError('')
                      await fetch(`/api/jobs/${jobId}/pay`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          orderId,
                          amount: job.budget,
                          currency: 'USD',
                        }),
                      }).catch(() => {})
                      markJobPaid(jobId)
                      setFeedback('Payment completed. Funds are held by RiddimBase until you release them from My Jobs.')
                    } catch (e) {
                      setError(e.message || 'Payment recorded, but escrow update may have failed.')
                    }
                  }}
                  onError={(err) => {
                    setError(err?.message || 'PayPal error. Please try again.')
                  }}
                />
              )}
              {!job || !job.budget && (
                <p className="mt-2 text-[11px] text-slate-500">
                  Missing job budget. Please contact support before paying.
                </p>
              )}
            </div>
            <div className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-[11px] text-red-200">
              Reminder: funds are released when the client marks the delivery as satisfactory.
            </div>
            {user && isOwner && (
              <div className="mt-3 rounded-xl border border-slate-800/70 bg-slate-900/80 p-3">
                <div className="flex items-center justify-between text-[11px] text-slate-200">
                  <span>Happy with the work?</span>
                  <button
                    onClick={()=>setReviewOpen(true)}
                    className="rounded-full border border-emerald-400/70 px-3 py-1 text-emerald-200 hover:bg-emerald-500/10"
                  >
                    Leave review
                  </button>
                </div>
              </div>
            )}
          </div>
          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/70 p-4 text-[11px] text-slate-300 space-y-2">
            <div className="flex items-center justify-between">
              <span>Assigned provider</span>
              <span className="rounded-full border border-emerald-400/60 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold text-emerald-200">
                {job.assignedProviderId || 'Pending'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Client</span>
              <span className="text-slate-200">{job.userEmail || job.userId || 'Client'}</span>
            </div>
          </div>
        </div>
      </div>
      {reviewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-800/80 bg-slate-950/95 p-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-100">Rate the provider</p>
                <p className="text-[11px] text-slate-400">Stars + short note appears on their services profile.</p>
              </div>
              <button
                onClick={()=>setReviewOpen(false)}
                className="text-[11px] text-slate-400 hover:text-emerald-300"
              >
                Close
              </button>
            </div>
            <form onSubmit={submitReview} className="mt-4 space-y-3">
              <div className="flex items-center gap-2">
                {[1,2,3,4,5].map(n => (
                  <button
                    type="button"
                    key={n}
                    onClick={()=>setReviewRating(n)}
                    className={`text-xl ${reviewRating>=n ? 'text-amber-300' : 'text-slate-600'}`}
                  >
                    ★
                  </button>
                ))}
                <span className="text-[11px] text-slate-400">{reviewRating} / 5</span>
              </div>
              <textarea
                value={reviewText}
                onChange={e=>setReviewText(e.target.value)}
                rows={3}
                placeholder="What stood out? Communication, quality, speed."
                className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-emerald-400/70 focus:outline-none"
              />
              <div className="flex items-center justify-end gap-2 text-[11px] text-slate-400">
                <button
                  type="button"
                  onClick={()=>setReviewOpen(false)}
                  className="rounded-full border border-slate-700/70 px-3 py-1 text-slate-200 hover:border-slate-500/60"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-full border border-emerald-400/70 bg-emerald-500/10 px-4 py-1.5 text-emerald-200 font-semibold hover:bg-emerald-500/20"
                >
                  Submit review
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default JobDelivery



import { useEffect, useState } from 'react'

const REASONS = [
  'Spam or promotion',
  'Harassment or hate',
  'Scam or fraud',
  'Inappropriate content',
  'Other',
]

export function ReportUserModal({ open, onClose, onSubmit }) {
  const [reason, setReason] = useState(REASONS[0])
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) {
      setReason(REASONS[0])
      setNote('')
      setSubmitting(false)
    }
  }, [open])

  if (!open) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    await onSubmit(reason, note.trim() || undefined)
    setSubmitting(false)
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 px-4"
      role="dialog"
      aria-modal="true"
      aria-label="Report user"
    >
      <div className="w-full max-w-sm rounded-2xl border border-slate-800/90 bg-slate-950/95 p-4 shadow-2xl">
        <h2 className="text-sm font-semibold text-slate-50 mb-1">Report user</h2>
        <p className="text-[11px] text-slate-400 mb-3">
          Help us keep RiddimBase safe. Choose a reason and optionally add
          more details. Our team will review this conversation.
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="mb-1 block text-[11px] font-medium text-slate-200">
              Reason
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full rounded-xl bg-slate-950/90 border border-slate-800/90 px-2 py-1.5 text-[11px] text-slate-100 focus:outline-none focus:border-rose-500/80"
            >
              {REASONS.map((r) => (
                <option key={r} value={r} className="bg-slate-950">
                  {r}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-medium text-slate-200">
              Additional details (optional)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              className="w-full resize-none rounded-xl bg-slate-950/90 border border-slate-800/90 px-2 py-1.5 text-[11px] text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-rose-500/80"
              placeholder="Share any context that might help our team review this."
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-slate-700/90 px-3 py-1 text-[11px] text-slate-300 hover:bg-slate-900/80"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-full bg-rose-600 px-3 py-1 text-[11px] font-semibold text-slate-50 hover:bg-rose-500 disabled:opacity-50"
            >
              Submit report
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ReportUserModal

import { useState } from 'react'
import { submitReport } from '../services/reportService'

const REASONS = [
  'Inappropriate / Explicit Content',
  'Copyright Infringement',
  'Spam / Scam',
  'Harassment / Hate',
  'Misleading / Metadata Abuse',
  'Other'
]

export default function ReportModal({ open, onClose, targetId, type }) {
  const [reason, setReason] = useState('')
  const [otherText, setOtherText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  if (!open) return null

  const pick = (r) => {
    setReason(r)
    if (r !== 'Other') setOtherText('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!reason) return
    setSubmitting(true)
    await submitReport({ type, targetId, reason, details: reason === 'Other' ? otherText.trim() : '' })
    setSubmitting(false)
    setDone(true)
    setTimeout(()=> { onClose(); setReason(''); setOtherText(''); setDone(false) }, 3000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4" role="dialog" aria-modal="true" aria-labelledby="report-title">
      <div className="w-full max-w-md rb-panel p-6">
        {!done && (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <h2 id="report-title" className="text-sm font-semibold text-slate-100">Report this {type === 'beat' ? 'Beat' : 'Producer'}</h2>
              <p className="mt-1 text-[11px] text-slate-400">Your report is anonymous. Please select the most accurate reason.</p>
            </div>
            <div className="space-y-2">
              {REASONS.map(r => (
                <button type="button" key={r} onClick={()=>pick(r)} className={`w-full rounded-lg border px-3 py-2 text-left text-[12px] font-medium transition rb-focus ${reason===r ? 'border-rose-400/70 bg-rose-500/10 text-rose-200' : 'border-slate-700/70 bg-slate-950/50 text-slate-300 hover:border-slate-600'}`}>{r}</button>
              ))}
            </div>
            {reason==='Other' && (
              <div>
                <label className="text-[10px] font-semibold text-slate-300">Describe Issue</label>
                <textarea value={otherText} onChange={e=>setOtherText(e.target.value)} rows={3} required className="mt-1 w-full rounded-lg border border-slate-700/70 bg-slate-950/70 px-3 py-2 text-[12px] text-slate-100" placeholder="Provide details (no personal info)..." />
              </div>
            )}
            <div className="flex items-center justify-between text-[10px] text-slate-500">
              <span>Anonymous submission</span>
              <button type="button" onClick={onClose} className="rb-btn-outline">Cancel</button>
            </div>
            <button type="submit" disabled={!reason || (reason==='Other' && !otherText.trim()) || submitting} className="w-full rb-btn-danger disabled:opacity-40">{submitting? 'Submitting…':'Submit Report'}</button>
          </form>
        )}
        {done && (
          <div className="space-y-4 text-center">
            <h2 className="text-sm font-semibold text-slate-100">Thank You</h2>
            <p className="text-[11px] text-slate-400">Your anonymous report has been received. We review reports to keep the platform safe and professional.</p>
            <p className="text-[10px] text-slate-500">This window will close automatically.</p>
          </div>
        )}
      </div>
    </div>
  )
}

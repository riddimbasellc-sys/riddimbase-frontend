import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import useSupabaseUser from '../hooks/useSupabaseUser'
import { getJobRequest, addBid, updateJobStatus, declineBid, markJobPaid, getJobEscrow } from '../services/serviceJobRequestsService'
import { addNotification } from '../services/notificationsRepository'

export function JobDetails() {
  const { jobId } = useParams()
  const { user } = useSupabaseUser()
  const [job, setJob] = useState(null)
  const [loading, setLoading] = useState(true)
  const [proposalOpen, setProposalOpen] = useState(false)
  const [proposalBudget, setProposalBudget] = useState('')
  const [proposalTimeline, setProposalTimeline] = useState('')
  const [proposalDeliverables, setProposalDeliverables] = useState('')
  const [proposalLink, setProposalLink] = useState('')
  const [proposalMessage, setProposalMessage] = useState('')
  const [proposalLoading, setProposalLoading] = useState(false)
  const [error, setError] = useState('')
  const [feedback, setFeedback] = useState('')
  const [escrow, setEscrow] = useState(null)

  useEffect(()=> { load() }, [jobId])
  async function load() {
    setLoading(true)
    const j = await getJobRequest(jobId)
    setJob(j)
    try { setEscrow(getJobEscrow(jobId)) } catch { setEscrow(null) }
    setLoading(false)
  }

  const isOwner = user && job && job.userId === user.id
  const isAssigned = job?.status === 'assigned'

  async function submitProposal(e) {
    e.preventDefault(); if (!user) { setError('Please log in to send a proposal.'); return }
    setProposalLoading(true); setError(''); setFeedback('')
    const composed = [
      proposalMessage,
      proposalDeliverables && `Deliverables: ${proposalDeliverables}`,
      proposalTimeline && `Timeline: ${proposalTimeline}`,
      proposalLink && `Work sample: ${proposalLink}`,
    ].filter(Boolean).join('\n')
    try {
      const updated = await addBid(job.id, { providerId: user.id, amount: proposalBudget, message: composed })
      setJob(updated)
      setFeedback('Proposal sent to client.')
      setProposalOpen(false)
      setProposalBudget(''); setProposalTimeline(''); setProposalDeliverables(''); setProposalLink(''); setProposalMessage('')
      try { await addNotification({ recipientId: job.userId, actorId: user.id, type: 'job-proposal', data: { title: job.title, amount: proposalBudget, timeline: proposalTimeline } }) } catch {}
      try { fetch('/api/notify', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ kind:'job-request', event:'proposal', payload:{ title: job.title, requesterEmail: job.userEmail||'', amount: proposalBudget, timeline: proposalTimeline } }) }).catch(()=>{}) } catch {}
    } catch (e2) { setError(e2.message || 'Proposal failed') } finally { setProposalLoading(false) }
  }

  async function handleAccept(bid) {
    if (!isOwner) return
    try {
      const updated = await updateJobStatus(job.id, 'assigned', bid.providerId, Number(bid.amount||0))
      if (updated && updated.id) {
        setJob(updated)
        setFeedback('Proposal accepted. Job assigned.')
        try { await addNotification({ recipientId: bid.providerId, actorId: user.id, type: 'job-assigned', data: { jobId: job.id, title: job.title } }) } catch {}
      }
    } catch (e) {
      setError(e.message || 'Failed to accept proposal')
    }
  }

  async function handleDecline(bid) {
    if (!isOwner) return
    try {
      const updated = await declineBid(job.id, bid.id)
      if (updated && updated.id) {
        setJob(updated)
      }
    } catch (e) {
      setError(e.message || 'Failed to decline proposal')
    }
  }

  async function handleStartEscrow(amountHint=0) {
    if (!isOwner) return
    try {
      const res = await markJobPaid(job.id, Number(amountHint)||0, 'USD', user?.id || null)
      setEscrow(res)
      setFeedback('Escrow funded. You can release funds after delivery.')
    } catch (e) {
      setError(e.message || 'Failed to start escrow')
    }
  }

    if (loading) return <div className="mx-auto max-w-4xl px-4 py-10 text-center text-sm text-slate-400">Loading…</div>
  if (!job) return <div className="mx-auto max-w-4xl px-4 py-10 text-center text-sm text-slate-400">Job not found.</div>

  const badgeColor = job.status === 'open' ? 'emerald' : job.status === 'assigned' ? 'orange' : job.status === 'completed' ? 'indigo' : 'red'

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <h1 className="text-xl font-semibold tracking-tight text-slate-100">{job.title}</h1>
        <span className={`inline-flex items-center rounded-full bg-${badgeColor}-500/20 px-3 py-1 text-xs font-semibold text-${badgeColor}-300`}>{job.status}</span>
      </div>
      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-2xl border border-slate-800/70 bg-slate-900/60 p-5">
            <h2 className="mb-2 text-sm font-semibold text-slate-200">Description</h2>
            <p className="whitespace-pre-wrap text-xs leading-relaxed text-slate-300">{job.description || 'No description provided.'}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {job.genres.map(g => <span key={g} className="rounded-full bg-slate-800/80 px-2 py-0.5 text-[10px] text-slate-300">{g}</span>)}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-[11px] text-slate-300">
              <div className="rounded-lg bg-slate-800/60 p-2"><span className="block text-[9px] uppercase tracking-wide text-slate-400">Budget</span>${job.budget}</div>
              {job.deadlineDate && <div className="rounded-lg bg-slate-800/60 p-2"><span className="block text-[9px] uppercase tracking-wide text-slate-400">Deadline</span>{job.deadlineDate}</div>}
              <div className="rounded-lg bg-slate-800/60 p-2"><span className="block text-[9px] uppercase tracking-wide text-slate-400">Revisions</span>{job.revisionsExpected}</div>
            </div>
            {job.referenceUrls?.length>0 && (
              <div className="mt-4">
                <h3 className="mb-2 text-xs font-semibold text-slate-300">References</h3>
                <ul className="space-y-1 text-[11px] text-emerald-300">
                  {job.referenceUrls.map((r,i)=><li key={i}><a href={r} target="_blank" rel="noreferrer" className="hover:underline">{r}</a></li>)}
                </ul>
              </div>
            )}
          </div>
          <div className="rounded-2xl border border-slate-800/70 bg-slate-900/60 p-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-200">Proposals</h2>
                <p className="text-[11px] text-slate-400">{isOwner ? 'Review proposals below.' : 'We only show totals for privacy.'}</p>
              </div>
              <div className="rounded-full bg-emerald-500/15 border border-emerald-400/60 px-4 py-2 text-sm font-semibold text-emerald-200">
                {job.bids.length}
              </div>
            </div>
            {isOwner && job.bids.length > 0 && (
              <div className="mt-4 space-y-2">
                {job.bids.map((b)=> (
                  <div key={b.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-slate-900/70 px-3 py-2 text-[12px] text-slate-200">
                    <div className="min-w-0">
                          <p className="truncate font-semibold">
                            <span>${Number(b.amount||0).toFixed(2)}</span> • <span>{(b.providerId||'').slice(0,8)}…</span>
                          </p>
                      {b.message && (<p className="mt-0.5 line-clamp-2 text-[11px] text-slate-400 whitespace-pre-wrap">{b.message}</p>)}
                    </div>
                    {job.status === 'open' ? (
                      <div className="flex flex-shrink-0 items-center gap-2">
                        <button onClick={()=>handleAccept(b)} className="rounded-full border border-emerald-400/70 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold text-emerald-200 hover:bg-emerald-500/20">Accept</button>
                        <button onClick={()=>handleDecline(b)} className="rounded-full border border-red-400/70 bg-red-500/10 px-3 py-1 text-[11px] font-semibold text-red-200 hover:bg-red-500/20">Decline</button>
                      </div>
                    ) : (
                      <span className="flex-shrink-0 rounded-full border border-orange-400/60 bg-orange-500/10 px-3 py-1 text-[11px] font-semibold text-orange-200">{isAssigned ? 'Assigned' : job.status}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="space-y-6">
          {user && job.status === 'open' && (
            <div className="rounded-2xl border border-slate-800/70 bg-slate-900/60 p-5 space-y-3">
              <h2 className="text-sm font-semibold text-slate-200">Ready to pitch?</h2>
              <p className="text-[11px] text-slate-400">Send a polished proposal. Client sees it instantly in email, dashboard and notifications.</p>
              <button onClick={()=>setProposalOpen(true)} className="w-full rounded-full bg-red-500 px-5 py-2 text-xs font-semibold text-slate-50 hover:bg-red-400">Send Proposal</button>
              {feedback && <div className="rounded border border-emerald-500/40 bg-emerald-500/10 px-2 py-1 text-[10px] text-emerald-300">{feedback}</div>}
              {error && <div className="rounded border border-red-500/40 bg-red-500/10 px-2 py-1 text-[10px] text-red-300">{error}</div>}
            </div>
          )}
          {isAssigned && (
            <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-center text-[11px] font-medium text-red-300 space-y-2">
              <p>This job is assigned. Proposals closed.</p>
              {isOwner && <Link to={`/jobs/${job.id}/delivery`} className="inline-flex items-center justify-center rounded-full border border-emerald-400/70 bg-emerald-500/10 px-4 py-1.5 text-[11px] font-semibold text-emerald-200 hover:bg-emerald-500/20">Upload files & handle payment</Link>}
              {isOwner && (
                <div className="mt-2 flex items-center justify-center gap-2">
                  <button onClick={()=>handleStartEscrow(job?.bids?.find(b=> b.providerId === job.assignedProviderId)?.amount || 0)} className="rounded-full border border-sky-400/70 bg-sky-500/10 px-4 py-1.5 text-[11px] font-semibold text-sky-200 hover:bg-sky-500/20">Fund Escrow</button>
                  {escrow?.paid && !escrow?.released && (
                    <span className="rounded-full border border-emerald-400/60 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold text-emerald-200">Escrow funded</span>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      {proposalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-xl rounded-2xl border border-slate-800/80 bg-slate-950/95 p-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-100">Send Proposal</p>
                <p className="text-[11px] text-slate-400">Modern, BeatStars-style pitch with the essentials.</p>
              </div>
              <button onClick={()=>setProposalOpen(false)} className="text-[11px] text-slate-400 hover:text-emerald-300">Close</button>
            </div>
            <form onSubmit={submitProposal} className="mt-4 grid gap-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-[11px] text-slate-300 flex flex-col gap-1">
                  Budget (USD)
                  <input type="number" min="1" value={proposalBudget} onChange={e=>setProposalBudget(e.target.value)} required className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-emerald-400/70 focus:outline-none" />
                </label>
                <label className="text-[11px] text-slate-300 flex flex-col gap-1">
                  Timeline
                  <input value={proposalTimeline} onChange={e=>setProposalTimeline(e.target.value)} placeholder="e.g. 5 days, 1 week" className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-emerald-400/70 focus:outline-none" />
                </label>
              </div>
              <label className="text-[11px] text-slate-300 flex flex-col gap-1">
                Deliverables
                <input value={proposalDeliverables} onChange={e=>setProposalDeliverables(e.target.value)} placeholder="Mix/master + radio edit + stems" className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-emerald-400/70 focus:outline-none" />
              </label>
              <label className="text-[11px] text-slate-300 flex flex-col gap-1">
                Reference / Portfolio Link
                <input value={proposalLink} onChange={e=>setProposalLink(e.target.value)} placeholder="URL to similar work" className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-emerald-400/70 focus:outline-none" />
              </label>
              <label className="text-[11px] text-slate-300 flex flex-col gap-1">
                Message
                <textarea value={proposalMessage} onChange={e=>setProposalMessage(e.target.value)} rows={4} placeholder="Outline approach, communication cadence, revision policy." className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-emerald-400/70 focus:outline-none" />
              </label>
              <div className="flex items-center justify-end gap-2 text-[11px] text-slate-400">
                <button type="button" onClick={()=>setProposalOpen(false)} className="rounded-full border border-slate-700/70 px-4 py-1 text-slate-200 hover:border-slate-500/60">Cancel</button>
                <button type="submit" disabled={proposalLoading} className="rounded-full border border-emerald-400/70 bg-emerald-500/10 px-5 py-1.5 text-emerald-200 font-semibold hover:bg-emerald-500/20 disabled:opacity-60">{proposalLoading ? 'Sending…' : 'Send Proposal'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default JobDetails


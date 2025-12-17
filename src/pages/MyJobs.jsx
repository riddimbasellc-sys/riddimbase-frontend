import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useSupabaseUser from '../hooks/useSupabaseUser'
import { listUserJobRequests, updateJobStatus, markJobPaid, releaseJobFunds, getJobEscrow, declineBid } from '../services/serviceJobRequestsService'
import { addNotification } from '../services/notificationsRepository'

export function MyJobs() {
  const { user, loading } = useSupabaseUser()
  const navigate = useNavigate()
  const [jobs, setJobs] = useState([])
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [expandedJobId, setExpandedJobId] = useState(null)

  useEffect(() => { if (user) refresh() }, [user])

  async function refresh() {
    if (!user) return
    setRefreshing(true); setError('')
    try {
      const { data } = await listUserJobRequests(user.id)
      setJobs(data)
    } catch (e) { setError(e.message || 'Failed to load jobs') } finally { setRefreshing(false) }
  }

  const handleMarkPaid = (jobId) => {
    markJobPaid(jobId)
    refresh()
  }
  const handleRelease = (jobId) => {
    releaseJobFunds(jobId)
    refresh()
  }
  const handleCancel = async (jobId) => {
    try { await updateJobStatus(jobId, 'cancelled'); refresh() } catch (e) { setError(e.message || 'Cancel failed') }
  }

  const handleAcceptProposal = async (job, bid) => {
    try {
      setError('')
      await updateJobStatus(job.id, 'assigned', bid.providerId)
      try {
        await addNotification({
          recipientId: bid.providerId,
          actorId: user.id,
          type: 'job-accepted',
          data: { title: job.title, amount: bid.amount },
        })
      } catch {}
      try {
        fetch('/api/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            kind: 'job-request',
            event: 'accepted',
            payload: {
              title: job.title,
              providerId: bid.providerId,
              amount: bid.amount,
            },
          }),
        }).catch(() => {})
      } catch {}
      navigate(`/jobs/${job.id}/delivery`)
    } catch (e) {
      setError(e.message || 'Accept failed')
    }
  }

  const handleDeclineProposal = async (jobId, bidId) => {
    try {
      setError('')
      await declineBid(jobId, bidId)
      refresh()
    } catch (e) {
      setError(e.message || 'Decline failed')
    }
  }

  if (loading) return <section className="min-h-screen flex items-center justify-center bg-slate-950/95"><p className="text-sm text-slate-300">Loading…</p></section>
  if (!user) return <section className="min-h-screen flex items-center justify-center bg-slate-950/95"><p className="text-sm text-slate-300">Please log in.</p></section>

  return (
    <section className="bg-slate-950/95 min-h-screen">
      <div className="mx-auto max-w-6xl px-3 py-6 sm:px-4 sm:py-8 space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.25em] text-emerald-300">Dashboard</p>
            <h1 className="text-xl font-semibold text-slate-50 sm:text-2xl">My Jobs</h1>
            <p className="text-xs text-slate-400 sm:text-sm">Funds stay on hold until you release them.</p>
          </div>
          <button onClick={()=>navigate('/jobs/post')} className="rounded-full bg-red-500 px-5 py-2 text-sm font-semibold text-slate-50 hover:bg-red-400">Post new job</button>
        </div>
        {error && <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-[11px] text-red-300">{error}</div>}
        {refreshing && <div className="text-xs text-slate-400 sm:text-sm">Refreshing…</div>}
        <div className="grid gap-4 sm:grid-cols-2">
          {jobs.map(job => {
            const escrow = getJobEscrow(job.id)
            const paid = escrow.paid
            const released = escrow.released
            return (
              <div key={job.id} className="rounded-2xl border border-slate-800/70 bg-slate-900/70 p-4 shadow-[0_10px_40px_rgba(0,0,0,0.35)]">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-100">{job.title}</p>
                    <p className="text-[11px] text-slate-400">{job.status} • ${job.budget}</p>
                  </div>
                  <span className="rounded-full border border-emerald-400/50 bg-emerald-500/10 px-3 py-1 text-[10px] font-semibold text-emerald-200">{job.bids?.length || 0} proposals</span>
                </div>
                <p className="mt-2 line-clamp-3 text-[11px] text-slate-300">{job.description}</p>
                {/* Proposals are viewed in Job Details. Keeping My Jobs clean and focused. */}
                <div className="mt-3 rounded-xl border border-slate-800/60 bg-slate-950/60 p-3 text-[11px] text-slate-200 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-slate-100">Escrow Status</p>
                    <p className="text-[10px] text-slate-400">{released ? 'Funds released to provider' : paid ? 'Payment received, waiting to release' : 'Awaiting payment'}</p>
                  </div>
                  <div className="flex flex-col gap-1 text-[11px]">
                    {!paid && <button onClick={()=>handleMarkPaid(job.id)} className="rounded-full border border-emerald-400/70 bg-emerald-500/10 px-3 py-1 text-emerald-200 hover:bg-emerald-500/20">Mark paid</button>}
                    {paid && !released && <button onClick={()=>handleRelease(job.id)} className="rounded-full border border-emerald-400/70 bg-emerald-500/10 px-3 py-1 text-emerald-200 hover:bg-emerald-500/20">Release funds</button>}
                    {released && <span className="rounded-full border border-emerald-400/50 bg-emerald-500/10 px-3 py-1 text-center text-emerald-200">Released</span>}
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400">
                  <button onClick={()=>navigate(`/jobs/${job.id}`)} className="rounded-full border border-slate-700/70 px-3 py-1 text-slate-200 hover:border-emerald-400/70">View job</button>
                  <div className="flex gap-2">
                    <button onClick={()=>handleCancel(job.id)} className="rounded-full border border-red-500/60 px-3 py-1 text-red-300 hover:bg-red-500/10">Cancel</button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
        {jobs.length === 0 && <div className="rounded-2xl border border-slate-800/70 bg-slate-900/70 p-6 text-xs text-slate-400 sm:text-sm">No jobs yet. Post a job to see release controls here.</div>}
      </div>
    </section>
  )
}

export default MyJobs

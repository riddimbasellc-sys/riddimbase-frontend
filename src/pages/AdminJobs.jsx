import { useEffect, useMemo, useState } from 'react'
import AdminLayout from '../components/AdminLayout'
import { useAdminRole } from '../hooks/useAdminRole'
import { queryJobRequests, updateJobStatus, deleteJob } from '../services/serviceJobRequestsService'
import { addNotification } from '../services/notificationsRepository'
import useSupabaseUser from '../hooks/useSupabaseUser'

const STATUS_LABEL = {
  all: 'All',
  pending: 'Pending review',
  open: 'Approved (open)',
  assigned: 'Assigned',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

const STATUS_BADGE = {
  pending: 'border-amber-400/60 bg-amber-500/10 text-amber-200',
  open: 'border-emerald-400/60 bg-emerald-500/10 text-emerald-200',
  assigned: 'border-cyan-400/60 bg-cyan-500/10 text-cyan-200',
  completed: 'border-emerald-400/60 bg-emerald-500/10 text-emerald-200',
  cancelled: 'border-rose-400/60 bg-rose-500/10 text-rose-200',
}

export function AdminJobs() {
  const { isAdmin, loading } = useAdminRole()
  const { user } = useSupabaseUser()
  const [jobs, setJobs] = useState([])
  const [statusFilter, setStatusFilter] = useState('pending')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize] = useState(12)
  const [total, setTotal] = useState(0)
  const [loadingJobs, setLoadingJobs] = useState(false)
  const [error, setError] = useState('')
  const [actionId, setActionId] = useState(null)

  useEffect(() => {
    if (isAdmin) {
      loadJobs()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, statusFilter, page])

  async function loadJobs() {
    setLoadingJobs(true)
    setError('')
    try {
      const { data, count } = await queryJobRequests({
        status: statusFilter,
        category: 'all',
        genre: 'all',
        search,
        minBudget: 0,
        maxBudget: 0,
        page,
        pageSize,
      })
      setJobs(data || [])
      setTotal(count || 0)
    } catch (e) {
      setError(e.message || 'Failed to load jobs.')
      setJobs([])
    } finally {
      setLoadingJobs(false)
    }
  }

  const pendingCount = useMemo(
    () => jobs.filter((j) => j.status === 'pending').length,
    [jobs],
  )

  const canModerate = isAdmin

  async function handleApprove(job) {
    if (!canModerate || !job) return
    setActionId(job.id)
    setError('')
    try {
      await updateJobStatus(job.id, 'open', job.assignedProviderId || null)
      try {
        if (job.userId) {
          await addNotification({
            recipientId: job.userId,
            actorId: user?.id || null,
            type: 'job-approved',
            data: { title: job.title },
          })
        }
      } catch {}
      await loadJobs()
    } catch (e) {
      setError(e.message || 'Approve failed.')
    } finally {
      setActionId(null)
    }
  }

  async function handleDeny(job) {
    if (!canModerate || !job) return
    if (!window.confirm('Deny this job and hide it from the board?')) return
    setActionId(job.id)
    setError('')
    try {
      await updateJobStatus(job.id, 'cancelled', job.assignedProviderId || null)
      try {
        if (job.userId) {
          await addNotification({
            recipientId: job.userId,
            actorId: user?.id || null,
            type: 'job-denied',
            data: { title: job.title },
          })
        }
      } catch {}
      await loadJobs()
    } catch (e) {
      setError(e.message || 'Deny failed.')
    } finally {
      setActionId(null)
    }
  }

  async function handleDelete(job) {
    if (!canModerate || !job) return
    if (!window.confirm('Delete this job permanently? This cannot be undone.')) return
    setActionId(job.id)
    setError('')
    try {
      await deleteJob(job.id)
      await loadJobs()
    } catch (e) {
      setError(e.message || 'Delete failed.')
    } finally {
      setActionId(null)
    }
  }

  function resetAndSearch() {
    setPage(1)
    loadJobs()
  }

  if (loading) {
    return (
      <section className="min-h-screen flex items-center justify-center bg-slate-950/95">
        <p className="text-sm text-slate-400">Loading admin access…</p>
      </section>
    )
  }

  if (!isAdmin) {
    return (
      <section className="min-h-screen flex items-center justify-center bg-slate-950/95">
        <p className="text-sm text-slate-400">Access denied.</p>
      </section>
    )
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  return (
    <AdminLayout
      title="Jobs Moderation"
      subtitle="Review new job posts, approve quality work and keep the board clean."
    >
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-[1.1fr,0.9fr]">
          <div className="rounded-2xl border border-slate-800/80 bg-gradient-to-br from-slate-900/90 to-slate-950/90 p-5 shadow-lg">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-emerald-300">
                  Overview
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-100">
                  Jobs pipeline
                </p>
              </div>
              <button
                type="button"
                onClick={loadJobs}
                className="rounded-full border border-slate-700/70 px-3 py-1 text-[11px] text-slate-100 hover:border-emerald-400/70"
              >
                Refresh
              </button>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <MetricCard label="Pending review" value={pendingCount} />
              <MetricCard label="Total in view" value={jobs.length} />
              <MetricCard
                label="Avg. budget (view)"
                value={
                  jobs.length
                    ? `$${(
                        jobs.reduce(
                          (sum, j) => sum + (Number(j.budget) || 0),
                          0,
                        ) / jobs.length
                      ).toFixed(0)}`
                    : '$0'
                }
              />
            </div>
            {error && (
              <p className="mt-3 text-[11px] text-rose-400">
                {error}
              </p>
            )}
            <p className="mt-3 text-[11px] text-slate-400">
              New jobs stay in <span className="font-semibold text-amber-300">Pending</span> until
              you approve them. Approved jobs move to the public jobs board automatically.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/95 p-5 shadow-lg">
            <p className="text-sm font-semibold text-slate-100">
              Filters
            </p>
            <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
              {Object.entries(STATUS_LABEL).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setStatusFilter(key)
                    setPage(1)
                  }}
                  className={`rounded-full border px-3 py-1 font-semibold transition ${
                    statusFilter === key
                      ? 'border-emerald-400/70 bg-emerald-500/10 text-emerald-200'
                      : 'border-slate-700/70 bg-slate-900/70 text-slate-300 hover:border-slate-500/80'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="mt-4">
              <label className="text-[10px] font-semibold text-slate-400 tracking-wide">
                Search by title
              </label>
              <div className="mt-1 flex gap-2">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Mixing engineer, dancehall riddim, artwork…"
                  className="flex-1 rounded-lg border border-slate-700/70 bg-slate-950/80 px-3 py-2 text-[12px] text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-400/70"
                />
                <button
                  type="button"
                  onClick={resetAndSearch}
                  className="rounded-full bg-emerald-500 px-4 py-2 text-[11px] font-semibold text-slate-950 hover:bg-emerald-400"
                >
                  Apply
                </button>
              </div>
              <p className="mt-1 text-[10px] text-slate-500">
                Use this view while moderating new work to keep the marketplace high-quality and on-brand.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/90 p-5 shadow-lg">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-slate-100">
              Jobs ({total})
            </p>
            <div className="flex items-center gap-2 text-[11px] text-slate-400">
              <span>
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-full border border-slate-700/70 px-3 py-1 disabled:opacity-40 hover:border-slate-500/80"
              >
                Prev
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="rounded-full border border-slate-700/70 px-3 py-1 disabled:opacity-40 hover:border-slate-500/80"
              >
                Next
              </button>
            </div>
          </div>

          {loadingJobs && (
            <div className="mt-4 rounded-xl border border-slate-800/80 bg-slate-950/80 p-4 text-[12px] text-slate-400">
              Loading jobs…
            </div>
          )}

          {!loadingJobs && jobs.length === 0 && (
            <div className="mt-4 rounded-xl border border-slate-800/80 bg-slate-950/80 p-4 text-[12px] text-slate-400">
              No jobs found for this filter.
            </div>
          )}

          {!loadingJobs && jobs.length > 0 && (
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {jobs.map((job) => {
                const statusClass =
                  STATUS_BADGE[job.status] || 'border-slate-600 bg-slate-800/50 text-slate-200'
                const assignedLabel = job.assignedProviderId
                  ? `Assigned to: ${job.assignedProviderId}`
                  : 'Not assigned yet'

                return (
                  <div
                    key={job.id}
                    className="rounded-2xl border border-slate-800/80 bg-gradient-to-br from-slate-950/95 via-slate-900/95 to-slate-950/95 p-4 shadow-[0_14px_50px_rgba(0,0,0,0.6)]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-50">
                          {job.title}
                        </p>
                        <p className="mt-1 text-[11px] text-slate-400">
                          Budget:{' '}
                          <span className="font-semibold text-emerald-300">
                            {job.currency || 'USD'} {Number(job.budget || 0).toFixed(2)}
                          </span>
                        </p>
                        <p className="mt-1 text-[11px] text-slate-500">
                          {assignedLabel}
                        </p>
                      </div>
                      <span
                        className={`inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-semibold ${statusClass}`}
                      >
                        {STATUS_LABEL[job.status] || job.status}
                      </span>
                    </div>
                    <p className="mt-2 line-clamp-3 text-[11px] text-slate-200">
                      {job.description}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-400">
                      <span>
                        Posted:{' '}
                        {job.createdAt
                          ? new Date(job.createdAt).toLocaleDateString()
                          : '—'}
                      </span>
                      <span>
                        Proposals: {job.bids?.length || 0}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                      {job.status === 'pending' && (
                        <>
                          <button
                            type="button"
                            disabled={actionId === job.id}
                            onClick={() => handleApprove(job)}
                            className="rounded-full border border-emerald-400/70 bg-emerald-500/10 px-3 py-1 font-semibold text-emerald-200 hover:bg-emerald-500/20 disabled:opacity-40"
                          >
                            {actionId === job.id ? 'Approving…' : 'Approve'}
                          </button>
                          <button
                            type="button"
                            disabled={actionId === job.id}
                            onClick={() => handleDeny(job)}
                            className="rounded-full border border-rose-400/70 bg-rose-500/10 px-3 py-1 font-semibold text-rose-200 hover:bg-rose-500/20 disabled:opacity-40"
                          >
                            {actionId === job.id ? 'Denying…' : 'Deny'}
                          </button>
                        </>
                      )}
                      {job.status !== 'pending' && (
                        <button
                          type="button"
                          disabled={actionId === job.id}
                          onClick={() => handleDeny(job)}
                          className="rounded-full border border-amber-400/70 bg-amber-500/10 px-3 py-1 font-semibold text-amber-200 hover:bg-amber-500/20 disabled:opacity-40"
                        >
                          {actionId === job.id ? 'Updating…' : 'Mark as cancelled'}
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={actionId === job.id}
                        onClick={() => handleDelete(job)}
                        className="rounded-full border border-slate-700/70 bg-slate-900 px-3 py-1 font-semibold text-slate-300 hover:border-rose-400/70 hover:text-rose-200 disabled:opacity-40"
                      >
                        {actionId === job.id ? 'Removing…' : 'Delete job'}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}

function MetricCard({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-800/80 bg-slate-950/90 px-3 py-3">
      <p className="text-[10px] text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-50">{value}</p>
    </div>
  )
}

export default AdminJobs


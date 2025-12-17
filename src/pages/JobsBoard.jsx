import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import useSupabaseUser from '../hooks/useSupabaseUser'
import { queryJobRequests, listUserJobRequests } from '../services/serviceJobRequestsService'

export function JobsBoard() {
  const { user } = useSupabaseUser()
  const navigate = useNavigate()
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize] = useState(12)
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [jobSuggestions, setJobSuggestions] = useState([])
  const [status, setStatus] = useState('open')
  const [category, setCategory] = useState('all')
  const [genre, setGenre] = useState('all')
  const [minBudget] = useState('')
  const [maxBudget] = useState('')
  const [viewMode, setViewMode] = useState('grid')
  const [myJobsCount, setMyJobsCount] = useState(0)

  useEffect(() => {
    load()
  }, [page, search, status, category, genre])

  async function load() {
    setLoading(true)
    setError('')
    try {
      const { data, count } = await queryJobRequests({
        page,
        pageSize,
        search,
        status,
        category,
        genre,
      })
      setJobs(data)
      setTotal(count)
    } catch (e) {
      setError(e.message || 'Failed to load jobs')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Show "My Jobs" only if the user has posted at least one job
    ;(async () => {
      if (!user) { setMyJobsCount(0); return }
      try {
        const { data } = await listUserJobRequests(user.id)
        setMyJobsCount((data || []).length)
      } catch {
        setMyJobsCount(0)
      }
    })()
  }, [user])

  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const catOptions = ['all', 'mixing', 'custom-beat', 'vocal-edit', 'remix']
  const genreOptions = [
    'all',
    'dancehall',
    'reggae',
    'afrobeats',
    'trap',
    'drill',
    'pop',
    'rnb',
  ]

  useEffect(() => {
    const term = search.trim().toLowerCase()
    if (!term) {
      setJobSuggestions([])
      return
    }
    const matches = jobs.filter((j) =>
      (j.title || '').toLowerCase().includes(term),
    )
    setJobSuggestions(matches.slice(0, 8))
  }, [search, jobs])

  const handleSearchChange = (e) => {
    setSearch(e.target.value)
    setPage(1)
  }

  const handleJobSuggestionClick = (job) => {
    setSearch(job.title || '')
    setJobSuggestions([])
  }

  return (
    <div className="mx-auto max-w-7xl px-3 py-6 sm:px-4 sm:py-8">
      <div className="mb-5 flex flex-col gap-3 md:mb-6 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center justify-between gap-3 md:justify-start">
          <h1 className="text-xl font-semibold tracking-tight text-slate-100 sm:text-2xl">
            Job Requests
          </h1>
          <div className="flex items-center gap-2 md:hidden">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`flex h-8 w-8 items-center justify-center rounded-full border text-[12px] ${
                viewMode === 'list'
                  ? 'border-emerald-400 bg-slate-900 text-emerald-300'
                  : 'border-slate-700 bg-slate-900 text-slate-300'
              }`}
              aria-label="List view"
            >
              <span className="flex flex-col gap-[2px]">
                <span className="h-[2px] w-4 rounded bg-current" />
                <span className="h-[2px] w-4 rounded bg-current" />
                <span className="h-[2px] w-4 rounded bg-current" />
              </span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`flex h-8 w-8 items-center justify-center rounded-full border text-[12px] ${
                viewMode === 'grid'
                  ? 'border-emerald-400 bg-slate-900 text-emerald-300'
                  : 'border-slate-700 bg-slate-900 text-slate-300'
              }`}
              aria-label="Grid view"
            >
              <span className="grid h-3 w-3 grid-cols-2 gap-[2px]">
                <span className="rounded bg-current" />
                <span className="rounded bg-current" />
                <span className="rounded bg-current" />
                <span className="rounded bg-current" />
              </span>
            </button>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`flex h-8 w-8 items-center justify-center rounded-full border text-[12px] ${
                viewMode === 'list'
                  ? 'border-emerald-400 bg-slate-900 text-emerald-300'
                  : 'border-slate-700 bg-slate-900 text-slate-300'
              }`}
              aria-label="List view"
            >
              <span className="flex flex-col gap-[2px]">
                <span className="h-[2px] w-4 rounded bg-current" />
                <span className="h-[2px] w-4 rounded bg-current" />
                <span className="h-[2px] w-4 rounded bg-current" />
              </span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`flex h-8 w-8 items-center justify-center rounded-full border text-[12px] ${
                viewMode === 'grid'
                  ? 'border-emerald-400 bg-slate-900 text-emerald-300'
                  : 'border-slate-700 bg-slate-900 text-slate-300'
              }`}
              aria-label="Grid view"
            >
              <span className="grid h-3 w-3 grid-cols-2 gap-[2px]">
                <span className="rounded bg-current" />
                <span className="rounded bg-current" />
                <span className="rounded bg-current" />
                <span className="rounded bg-current" />
              </span>
            </button>
          </div>
          <button
            onClick={() => navigate('/jobs/post')}
            className="rb-btn-primary"
          >
            Post a Job
          </button>
          {myJobsCount > 0 && (
            <button
              onClick={() => navigate('/jobs/my')}
              className="rb-btn-outline"
              title="View jobs you posted"
            >
              My Jobs
            </button>
          )}
        </div>
      </div>
      <div className="grid gap-4 rb-panel p-4 md:grid-cols-3">
        <div className="space-y-3">
          <div className="relative">
            <input
              value={search}
              onChange={handleSearchChange}
              placeholder="Search title"
              aria-label="Search job title"
              className="w-full rounded-lg border border-slate-700 bg-slate-800/70 px-3 py-2 text-xs text-slate-100 rb-focus"
            />
            {jobSuggestions.length > 0 && (
              <div className="absolute z-20 mt-1 w-full max-h-60 overflow-auto rounded-xl border border-slate-800/80 bg-slate-950/95 text-[11px] text-slate-100 shadow-lg">
                {jobSuggestions.map((j) => (
                  <button
                    key={j.id}
                    type="button"
                    onClick={() => handleJobSuggestionClick(j)}
                    className="flex w-full flex-col items-start px-3 py-2 text-left hover:bg-slate-900/90"
                  >
                    <span className="w-full truncate font-semibold">
                      {j.title || 'Untitled job'}
                    </span>
                    <span className="mt-0.5 w-full truncate text-[10px] text-slate-400">
                      {j.genres && j.genres.length ? j.genres.join(', ') : ''}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value)
              setPage(1)
            }}
            aria-label="Filter by status"
            className="w-full rounded-lg border border-slate-700 bg-slate-800/70 px-3 py-2 text-xs text-slate-100 rb-focus"
          >
            <option value="open">Open</option>
            <option value="assigned">Assigned</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
            <option value="all">All</option>
          </select>
        </div>
        <div className="space-y-3">
          <select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value)
              setPage(1)
            }}
            aria-label="Filter by category"
            className="w-full rounded-lg border border-slate-700 bg-slate-800/70 px-3 py-2 text-xs text-slate-100 rb-focus"
          >
            {catOptions.map((c) => (
              <option key={c} value={c}>
                {c === 'all' ? 'All Categories' : c}
              </option>
            ))}
          </select>
          <select
            value={genre}
            onChange={(e) => {
              setGenre(e.target.value)
              setPage(1)
            }}
            aria-label="Filter by genre"
            className="w-full rounded-lg border border-slate-700 bg-slate-800/70 px-3 py-2 text-xs text-slate-100 rb-focus"
          >
            {genreOptions.map((g) => (
              <option key={g} value={g}>
                {g === 'all' ? 'All Genres' : g}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-3">
          <div className="rb-card p-3 text-[11px] text-slate-200">
            <p className="font-semibold text-emerald-200">How to get picked</p>
            <ul className="mt-2 space-y-1 text-slate-400">
              <li>• Clear deliverables & timeline</li>
              <li>• Share similar past work</li>
              <li>• Offer 1-2 revisions + communication plan</li>
            </ul>
          </div>
        </div>
      </div>
      <div className="mt-8">
        {loading && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-32 rb-skeleton" />
            ))}
          </div>
        )}
        {error && (
          <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
            {error}
          </div>
        )}
        {!loading && jobs.length === 0 && (
          <div className="py-10 text-center text-sm text-slate-400">
            No jobs found.
          </div>
        )}
        <div
          className={
            viewMode === 'grid'
              ? 'grid gap-5 sm:grid-cols-2 lg:grid-cols-3'
              : 'grid gap-5 grid-cols-1'
          }
        >
          {jobs.map((j) => (
            <JobCard key={j.id} job={j} viewMode={viewMode} />
          ))}
        </div>
        {totalPages > 1 && (
          <div className="mt-8 flex items-center justify-center gap-2">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className="rb-btn-outline disabled:opacity-40"
            >
              Prev
            </button>
            <div className="text-xs text-slate-400">
              Page {page} / {totalPages}
            </div>
            <button
              disabled={page === totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="rb-btn-outline disabled:opacity-40"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function JobCard({ job, viewMode = 'grid' }) {
  const badgeColor =
    job.status === 'open'
      ? 'emerald'
      : job.status === 'assigned'
      ? 'orange'
      : job.status === 'completed'
      ? 'indigo'
      : 'red'
  if (viewMode === 'list') {
    return (
      <Link
        to={`/jobs/${job.id}`}
        className="flex items-center justify-between gap-4 rb-card px-4 py-3 text-sm transition hover:border-red-500/60"
      >
        <div className="min-w-0">
          <h2 className="truncate font-semibold text-slate-100">
            {job.title || 'Untitled job'}
          </h2>
          {job.status && (
            <p className="mt-0.5 text-[11px] text-slate-400 capitalize">
              {job.status}
            </p>
          )}
        </div>
        <span className="ml-3 flex-shrink-0 rb-badge">
          View job
        </span>
      </Link>
    )
  }

  return (
    <Link
      to={`/jobs/${job.id}`}
      className="group rb-card p-4 transition hover:border-red-500/60"
    >
      <div className="mb-3 flex items-center justify-between">
        <h2 className="line-clamp-1 text-sm font-semibold text-slate-100 group-hover:text-rb-trop-cyan">
          {job.title}
        </h2>
        <span className="ml-2 rb-badge">
          {job.status}
        </span>
      </div>
      <p className="line-clamp-2 text-xs text-slate-400 mb-3">{job.description}</p>
      <div className="mb-2 flex flex-wrap gap-1">
        {job.genres.slice(0, 4).map((g) => (
          <span
            key={g}
            className="rb-chip"
          >
            {g}
          </span>
        ))}
      </div>
      <div className="flex items-center justify-between text-[11px] text-slate-300">
        <span>${job.budget}</span>
        {job.deadlineDate && (
          <span className="text-slate-400">Due {job.deadlineDate}</span>
        )}
      </div>
    </Link>
  )
}

export default JobsBoard

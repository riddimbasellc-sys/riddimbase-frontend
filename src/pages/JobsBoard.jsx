import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import useSupabaseUser from '../hooks/useSupabaseUser'
import { queryJobRequests } from '../services/serviceJobRequestsService'

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
  const [status, setStatus] = useState('open')
  const [category, setCategory] = useState('all')
  const [genre, setGenre] = useState('all')
  const [minBudget] = useState('')
  const [maxBudget] = useState('')

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

  return (
    <div className="mx-auto max-w-7xl px-3 py-6 sm:px-4 sm:py-8">
      <div className="mb-5 flex flex-col gap-3 md:mb-6 md:flex-row md:items-center md:justify-between">
        <h1 className="text-xl font-semibold tracking-tight text-slate-100 sm:text-2xl">
          Job Requests
        </h1>
        <div className="flex gap-3">
          <button
            onClick={() => navigate('/jobs/post')}
            className="rounded-full bg-rb-trop-sunrise px-5 py-2 text-sm font-semibold text-slate-950 shadow-rb-gloss-btn hover:brightness-110 transition"
          >
            Post a Job
          </button>
        </div>
      </div>
      <div className="grid gap-4 rounded-xl border border-slate-800/70 bg-slate-950/90 bg-rb-gloss-stripes bg-blend-soft-light p-4 shadow-rb-gloss-panel md:grid-cols-3">
        <div className="space-y-3">
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            placeholder="Search title"
            className="w-full rounded-lg border border-slate-700 bg-slate-800/70 px-3 py-2 text-xs text-slate-100"
          />
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value)
              setPage(1)
            }}
            className="w-full rounded-lg border border-slate-700 bg-slate-800/70 px-3 py-2 text-xs text-slate-100"
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
            className="w-full rounded-lg border border-slate-700 bg-slate-800/70 px-3 py-2 text-xs text-slate-100"
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
            className="w-full rounded-lg border border-slate-700 bg-slate-800/70 px-3 py-2 text-xs text-slate-100"
          >
            {genreOptions.map((g) => (
              <option key={g} value={g}>
                {g === 'all' ? 'All Genres' : g}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-3">
          <div className="rounded-xl border border-emerald-400/20 bg-slate-950/80 p-3 text-[11px] text-slate-200 shadow-inner">
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
          <div className="py-10 text-center text-sm text-slate-400">
            Loading jobs…
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
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {jobs.map((j) => (
            <JobCard key={j.id} job={j} />
          ))}
        </div>
        {totalPages > 1 && (
          <div className="mt-8 flex items-center justify-center gap-2">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300 disabled:opacity-40"
            >
              Prev
            </button>
            <div className="text-xs text-slate-400">
              Page {page} / {totalPages}
            </div>
            <button
              disabled={page === totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function JobCard({ job }) {
  const badgeColor =
    job.status === 'open'
      ? 'emerald'
      : job.status === 'assigned'
      ? 'orange'
      : job.status === 'completed'
      ? 'indigo'
      : 'red'
  return (
    <Link
      to={`/jobs/${job.id}`}
      className="group rounded-2xl border border-slate-800/70 bg-slate-900/60 p-4 transition hover:border-rb-trop-cyan hover:bg-slate-900/90 shadow-rb-gloss-panel"
    >
      <div className="mb-3 flex items-center justify-between">
        <h2 className="line-clamp-1 text-sm font-semibold text-slate-100 group-hover:text-rb-trop-cyan">
          {job.title}
        </h2>
        <span
          className={`ml-2 rounded-full bg-${badgeColor}-500/20 px-2 py-0.5 text-[10px] font-semibold text-${badgeColor}-300`}
        >
          {job.status}
        </span>
      </div>
      <p className="line-clamp-2 text-xs text-slate-400 mb-3">{job.description}</p>
      <div className="mb-2 flex flex-wrap gap-1">
        {job.genres.slice(0, 4).map((g) => (
          <span
            key={g}
            className="rounded-full bg-slate-800/80 px-2 py-0.5 text-[10px] text-slate-300"
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

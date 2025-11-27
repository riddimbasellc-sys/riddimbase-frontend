import AdminLayout from '../components/AdminLayout'
import { useAdminRole } from '../hooks/useAdminRole'
import { useEffect, useState } from 'react'
import { fetchAdminSeries } from '../services/adminAnalyticsSeriesService'

export function AdminAnalytics() {
  const { isAdmin, loading } = useAdminRole()
  const [metricKind, setMetricKind] = useState('plays')
  const [rangeKey, setRangeKey] = useState('30d')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [series, setSeries] = useState([])
  const [seriesLoading, setSeriesLoading] = useState(false)

  useEffect(() => {
    if (!isAdmin) return
    async function load() {
      setSeriesLoading(true)
      try {
        const { from, to } = computeRange(rangeKey, customFrom, customTo)
        const data = await fetchAdminSeries({ metric: metricKind, from, to })
        setSeries(data)
      } catch {
        setSeries([])
      } finally {
        setSeriesLoading(false)
      }
    }
    load()
  }, [isAdmin, metricKind, rangeKey, customFrom, customTo])

  if (loading) {
    return (
      <section className="min-h-screen flex items-center justify-center bg-slate-950/95">
        <p className="text-sm text-slate-400">Loading admin access...</p>
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

  const total = series.reduce((sum, d) => sum + (d.value || 0), 0)

  return (
    <AdminLayout
      title="Analytics"
      subtitle="Global trends across plays, followers, likes, sales and subscriptions."
    >
      <div className="space-y-6">
        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/90 p-4 shadow-lg">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-emerald-300">
                Overview
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-100">
                Metric timeline
              </p>
              <p className="mt-1 text-[11px] text-slate-400">
                Switch between metrics and date ranges to see how the whole platform is
                moving.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-[10px]">
              <select
                value={metricKind}
                onChange={(e) => setMetricKind(e.target.value)}
                className="rounded-full border border-slate-700/80 bg-slate-950/80 px-3 py-1.5 text-slate-100"
              >
                <option value="plays">Plays</option>
                <option value="followers">Followers</option>
                <option value="likes">Likes</option>
                <option value="sales">Sales</option>
                <option value="subscriptions">Subscriptions</option>
              </select>
              <select
                value={rangeKey}
                onChange={(e) => setRangeKey(e.target.value)}
                className="rounded-full border border-slate-700/80 bg-slate-950/80 px-3 py-1.5 text-slate-100"
              >
                <option value="today">Today</option>
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="60d">Last 60 days</option>
                <option value="1y">Last 1 year</option>
                <option value="custom">Custom</option>
              </select>
              {rangeKey === 'custom' && (
                <>
                  <input
                    type="date"
                    value={customFrom}
                    onChange={(e) => setCustomFrom(e.target.value)}
                    className="rounded-full border border-slate-700/80 bg-slate-950/80 px-3 py-1.5 text-slate-100"
                  />
                  <input
                    type="date"
                    value={customTo}
                    onChange={(e) => setCustomTo(e.target.value)}
                    className="rounded-full border border-slate-700/80 bg-slate-950/80 px-3 py-1.5 text-slate-100"
                  />
                </>
              )}
            </div>
          </div>
          <div className="mt-4">
            {seriesLoading ? (
              <p className="text-[11px] text-slate-500">Loading chart...</p>
            ) : series.length === 0 ? (
              <p className="text-[11px] text-slate-500">
                No data for this metric and date range yet.
              </p>
            ) : (
              <AdminPerformanceChart data={series} />
            )}
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3 text-[11px]">
            <MetricSummary
              label="Total in range"
              value={total}
              highlight
            />
            <MetricSummary
              label="Average per day"
              value={
                series.length
                  ? (total / series.length).toFixed(1)
                  : 0
              }
            />
            <MetricSummary
              label="Peak day"
              value={
                series.length
                  ? series.reduce((max, d) =>
                      d.value > max.value ? d : max,
                    series[0]
                  ).day
                  : '—'
              }
            />
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <InsightCard
            title="Plays vs sales"
            body="Compare spikes in plays to spikes in sales to see when discovery actually converts. Use this to time homepage banners and boost campaigns."
          />
          <InsightCard
            title="Follower lift after campaigns"
            body="Track follower growth during big promo weeks to see which boosted beats, playlists or email blasts move the needle most."
          />
          <InsightCard
            title="Subscriptions health"
            body="Overlay subscription sign-ups with campaigns to understand which homepage layouts, emails or offers drive the most Producer Pro upgrades."
          />
        </div>
      </div>
    </AdminLayout>
  )
}

function computeRange(rangeKey, customFrom, customTo) {
  const today = new Date()
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  let start = new Date(end)
  if (rangeKey === 'today') {
    // same day
  } else if (rangeKey === '7d') {
    start.setDate(end.getDate() - 6)
  } else if (rangeKey === '30d') {
    start.setDate(end.getDate() - 29)
  } else if (rangeKey === '60d') {
    start.setDate(end.getDate() - 59)
  } else if (rangeKey === '1y') {
    start.setFullYear(end.getFullYear() - 1)
  } else if (rangeKey === 'custom' && customFrom && customTo) {
    start = new Date(customFrom)
    return {
      from: start.toISOString().slice(0, 10),
      to: new Date(customTo).toISOString().slice(0, 10),
    }
  }
  return {
    from: start.toISOString().slice(0, 10),
    to: end.toISOString().slice(0, 10),
  }
}

function AdminPerformanceChart({ data }) {
  const width = 620
  const height = 200
  const paddingX = 32
  const paddingY = 20
  const innerW = width - paddingX * 2
  const innerH = height - paddingY * 2
  const maxVal = data.reduce((m, d) => (d.value > m ? d.value : m), 0) || 1
  const minVal = 0
  const n = data.length
  const xFor = (i) =>
    paddingX + (n === 1 ? innerW / 2 : (innerW * i) / (n - 1))
  const yFor = (v) =>
    paddingY + innerH - ((v - minVal) / (maxVal - minVal || 1)) * innerH
  const points = data.map((d, i) => `${xFor(i)},${yFor(d.value)}`).join(' ')

  const yTicks = [0, maxVal]

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full max-w-full"
      role="img"
      aria-label="Admin metric over time"
    >
      <defs>
        <linearGradient id="adminMetricLine" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor="#22c55e" />
          <stop offset="100%" stopColor="#f97316" />
        </linearGradient>
        <linearGradient id="adminMetricFill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="rgba(34,197,94,0.35)" />
          <stop offset="100%" stopColor="rgba(15,23,42,0)" />
        </linearGradient>
      </defs>
      {/* Grid */}
      {yTicks.map((t, idx) => {
        const y = yFor(t)
        return (
          <g key={idx}>
            <line
              x1={paddingX}
              x2={width - paddingX}
              y1={y}
              y2={y}
              stroke="rgba(148,163,184,0.25)"
              strokeWidth="1"
            />
            <text
              x={paddingX - 6}
              y={y + 3}
              textAnchor="end"
              fontSize="9"
              fill="#64748b"
            >
              {t}
            </text>
          </g>
        )
      })}
      {/* Area fill */}
      {data.length > 0 && (
        <path
          d={`M ${xFor(0)},${yFor(0)} L ${points} L ${xFor(
            data.length - 1,
          )},${yFor(0)} Z`}
          fill="url(#adminMetricFill)"
          stroke="none"
        />
      )}
      {/* Line */}
      {data.length > 0 && (
        <polyline
          fill="none"
          stroke="url(#adminMetricLine)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
        />
      )}
      {/* Points */}
      {data.map((d, i) => (
        <circle
          key={d.day}
          cx={xFor(i)}
          cy={yFor(d.value)}
          r="2"
          fill="#22c55e"
        />
      ))}
      {/* X axis labels (sparse) */}
      {data.map((d, i) => {
        const show =
          i === 0 ||
          i === data.length - 1 ||
          (data.length > 4 && i % Math.ceil(data.length / 4) === 0)
        if (!show) return null
        const x = xFor(i)
        return (
          <text
            key={d.day}
            x={x}
            y={height - 4}
            textAnchor="middle"
            fontSize="9"
            fill="#64748b"
          >
            {d.day.slice(5)}
          </text>
        )
      })}
    </svg>
  )
}

function MetricSummary({ label, value, highlight = false }) {
  return (
    <div className="rounded-xl border border-slate-800/80 bg-slate-950/80 p-3">
      <p className="text-[10px] text-slate-400">{label}</p>
      <p
        className={`mt-1 text-sm font-semibold ${
          highlight ? 'text-emerald-300' : 'text-slate-100'
        }`}
      >
        {value}
      </p>
    </div>
  )
}

function InsightCard({ title, body }) {
  return (
    <div className="rounded-2xl border border-slate-800/80 bg-slate-900/90 p-4 shadow-md">
      <h3 className="text-sm font-semibold text-slate-100">{title}</h3>
      <p className="mt-2 text-[11px] text-slate-400 leading-relaxed">{body}</p>
    </div>
  )
}

export default AdminAnalytics


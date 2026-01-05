import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const LIVE_WINDOW_MS = 30 * 1000

const RANGE_OPTIONS = [
  { id: 'today', label: 'Today' },
  { id: '7d', label: 'Last 7 days' },
  { id: '30d', label: 'Last 30 days' },
]

function startOfDay(d) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

function addDays(d, delta) {
  const x = new Date(d)
  x.setDate(x.getDate() + delta)
  return x
}

export function VisitorAnalytics() {
  const [liveCount, setLiveCount] = useState(null)
  const [liveDelta, setLiveDelta] = useState(0)
  const [rangeId, setRangeId] = useState('today')
  const [customRange, setCustomRange] = useState({ from: '', to: '' })
  const [historyPoints, setHistoryPoints] = useState([])
  const [loadingLive, setLoadingLive] = useState(false)
  const [loadingHistory, setLoadingHistory] = useState(false)

  const now = useMemo(() => new Date(), [])

  const { startDate, endDate } = useMemo(() => {
    if (rangeId === 'custom' && customRange.from && customRange.to) {
      return { startDate: new Date(customRange.from), endDate: new Date(customRange.to) }
    }
    const today = startOfDay(now)
    if (rangeId === '7d') {
      return { startDate: addDays(today, -6), endDate: addDays(today, 1) }
    }
    if (rangeId === '30d') {
      return { startDate: addDays(today, -29), endDate: addDays(today, 1) }
    }
    // default today
    return { startDate: today, endDate: addDays(today, 1) }
  }, [rangeId, customRange.from, customRange.to, now])

  useEffect(() => {
    let cancelled = false

    async function fetchLive() {
      setLoadingLive(true)
      try {
        const since = new Date(Date.now() - LIVE_WINDOW_MS).toISOString()
        const { count, error } = await supabase
          .from('visitor_sessions')
          .select('*', { count: 'exact', head: true })
          .gte('last_seen', since)
        if (error) throw error
        if (cancelled) return
        setLiveDelta((prev) => (typeof prev === 'number' ? (count || 0) - (liveCount || 0) : 0))
        setLiveCount(count || 0)
      } catch {
        if (!cancelled) setLiveCount(0)
      } finally {
        if (!cancelled) setLoadingLive(false)
      }
    }

    fetchLive()
    const id = setInterval(fetchLive, 15000)

    const channel = supabase
      .channel('live-visitors')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'visitor_sessions' },
        () => {
          fetchLive()
        },
      )
      .subscribe()

    return () => {
      cancelled = true
      clearInterval(id)
      try {
        supabase.removeChannel(channel)
      } catch {}
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    async function fetchHistory() {
      setLoadingHistory(true)
      try {
        const { data, error } = await supabase
          .from('visitor_sessions')
          .select('started_at')
          .gte('started_at', startDate.toISOString())
          .lte('started_at', endDate.toISOString())
        if (error) throw error
        if (cancelled) return
        const buckets = {}
        ;(data || []).forEach((row) => {
          const d = new Date(row.started_at)
          const key = startOfDay(d).toISOString().slice(0, 10)
          buckets[key] = (buckets[key] || 0) + 1
        })
        const points = Object.entries(buckets)
          .sort((a, b) => (a[0] < b[0] ? -1 : 1))
          .map(([date, value]) => ({ date, value }))
        setHistoryPoints(points)
      } catch {
        if (!cancelled) setHistoryPoints([])
      } finally {
        if (!cancelled) setLoadingHistory(false)
      }
    }
    fetchHistory()
  }, [startDate, endDate])

  const liveLabel = liveCount === null ? '—' : liveCount
  const deltaLabel = liveDelta > 0 ? `↑ +${liveDelta} in last 30s` : liveDelta < 0 ? `↓ ${Math.abs(liveDelta)} in last 30s` : 'Stable last 30s'

  return (
    <div className="rounded-2xl border border-slate-800/80 bg-gradient-to-br from-slate-950/95 via-slate-950/90 to-slate-950/98 p-4 shadow-[0_18px_60px_rgba(15,23,42,0.9)] flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-rose-400">Live Visitors</p>
          <p className="mt-1 text-[11px] text-slate-400 truncate">Realtime sessions across the site (last 30s).</p>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-slate-300">
          <span className="hidden sm:inline text-slate-400">Range</span>
          <select
            value={rangeId}
            onChange={(e) => setRangeId(e.target.value)}
            className="rounded-lg border border-slate-700/80 bg-slate-950/90 px-2 py-1 text-[11px] text-slate-100 focus:outline-none focus:border-emerald-400/70"
          >
            {RANGE_OPTIONS.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
            <option value="custom">Custom range…</option>
          </select>
        </div>
      </div>

      <div className="flex items-end gap-4 mt-1">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-semibold text-emerald-400 tabular-nums">
            {loadingLive && liveCount === null ? '…' : liveLabel}
          </span>
          <span className="text-[11px] text-slate-500 mb-1">live</span>
        </div>
        <span className="text-[11px] text-slate-400">{deltaLabel}</span>
      </div>

      {rangeId === 'custom' && (
        <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-300">
          <span className="text-slate-400">From</span>
          <input
            type="date"
            value={customRange.from}
            onChange={(e) => setCustomRange((prev) => ({ ...prev, from: e.target.value }))}
            className="rounded-lg border border-slate-700/70 bg-slate-950/80 px-2 py-1 text-[11px] text-slate-100"
          />
          <span className="text-slate-400">to</span>
          <input
            type="date"
            value={customRange.to}
            onChange={(e) => setCustomRange((prev) => ({ ...prev, to: e.target.value }))}
            className="rounded-lg border border-slate-700/70 bg-slate-950/80 px-2 py-1 text-[11px] text-slate-100"
          />
        </div>
      )}

      <div className="mt-3 rounded-2xl border border-slate-800/80 bg-slate-950/90 p-3 min-h-[140px] flex flex-col justify-between">
        {loadingHistory ? (
          <div className="flex-1 flex items-center justify-center text-[11px] text-slate-500">
            Loading visitor history…
          </div>
        ) : historyPoints.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-[11px] text-slate-500">
            No visitor data for this range yet.
          </div>
        ) : (
          <div className="flex-1 flex items-end gap-1">
            {historyPoints.map((pt) => (
              <div key={pt.date} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full rounded-t-full bg-emerald-500/70"
                  style={{ height: `${12 + Math.min(pt.value * 6, 80)}px` }}
                />
                <span className="text-[9px] text-slate-400">
                  {pt.date.slice(5)}
                </span>
              </div>
            ))}
          </div>
        )}
        <div className="mt-2 text-[10px] text-slate-500 flex justify-between items-center">
          <span>
            Visitors between {startDate.toISOString().slice(0, 10)} and{' '}
            {endDate.toISOString().slice(0, 10)}
          </span>
          <span className="text-slate-500/80">Auto-refreshes every 15s</span>
        </div>
      </div>
    </div>
  )
}

export default VisitorAnalytics

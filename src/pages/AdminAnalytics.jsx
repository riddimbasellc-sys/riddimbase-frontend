import AdminLayout from '../components/AdminLayout'
import { useAdminRole } from '../hooks/useAdminRole'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import KpiCard from '../components/admin/KpiCard'
import RevenueChart from '../components/admin/RevenueChart'
import AnalyticsTable from '../components/admin/AnalyticsTable'
import { listBeats } from '../services/beatsService'
import { fetchSales } from '../services/salesRepository'
import { listAllPayouts } from '../services/payoutsRepository'
import { loadPlayCountsForBeats } from '../services/analyticsService'
import { fetchAdminRecordingLabMetrics } from '../services/adminDashboardRepository'
import {
  approveAdminProducer,
  banAdminUser,
  fetchAdminUsers,
  resetAdminPassword,
} from '../services/adminUsersRepository'
import { fetchBeats } from '../services/beatsRepository'
import {
  adminDeleteBeat,
  adminFlagBeat,
  adminHideBeat,
} from '../services/adminBeatsRepository'
import { supabase } from '../lib/supabaseClient'

const SERVICE_FEE_RATE = 0.12
const PROCESSING_FEE_RATE = 0.03
const HOSTING_COST_PER_BEAT_MONTH = 0.02

export function AdminAnalytics() {
  const { isAdmin, loading } = useAdminRole()
  const navigate = useNavigate()

  const [rangeKey, setRangeKey] = useState('30d')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')

  const [beats, setBeats] = useState([])
  const [sales, setSales] = useState([])
  const [payouts, setPayouts] = useState([])
  const [profiles, setProfiles] = useState([])
  const [playCounts, setPlayCounts] = useState({})
  const [loadingDashboard, setLoadingDashboard] = useState(false)
  const [labMetrics, setLabMetrics] = useState(null)

  const [adminUsers, setAdminUsers] = useState([])
  const [adminUsersLoading, setAdminUsersLoading] = useState(false)
  const [adminUsersError, setAdminUsersError] = useState('')

  const [adminBeats, setAdminBeats] = useState([])
  const [adminBeatsLoading, setAdminBeatsLoading] = useState(false)
  const [adminBeatsError, setAdminBeatsError] = useState('')

  const revenueRef = useRef(null)
  const beatsRef = useRef(null)
  const usersRef = useRef(null)
  const salesRef = useRef(null)
  const recordingRef = useRef(null)
  const profitRef = useRef(null)

  useEffect(() => {
    if (!isAdmin) return
    let cancelled = false
    async function loadAll() {
      setLoadingDashboard(true)
      try {
        const [beatsData, salesData, payoutRows, profileRows, lab] = await Promise.all([
          listBeats({ includeHidden: true }),
          fetchSales(),
          listAllPayouts(),
          loadProfiles(),
          fetchAdminRecordingLabMetrics().catch(() => null),
        ])
        if (cancelled) return
        setBeats(beatsData || [])
        setSales(salesData || [])
        setPayouts(payoutRows || [])
        setProfiles(profileRows || [])
        setLabMetrics(lab)
        const beatIds = Array.from(new Set((beatsData || []).map((b) => b.id).filter(Boolean)))
        if (beatIds.length) {
          const map = await loadPlayCountsForBeats(beatIds)
          if (!cancelled) setPlayCounts(map || {})
        }
      } catch {
        // Swallow; UI will show empty states
      } finally {
        if (!cancelled) setLoadingDashboard(false)
      }
    }
    loadAll()
    return () => {
      cancelled = true
    }
  }, [isAdmin])

  useEffect(() => {
    if (!isAdmin) return
    let cancelled = false

    async function loadUsers() {
      setAdminUsersLoading(true)
      setAdminUsersError('')
      try {
        const data = await fetchAdminUsers()
        if (!cancelled) setAdminUsers(Array.isArray(data) ? data : [])
      } catch (e) {
        if (!cancelled) {
          setAdminUsers([])
          setAdminUsersError(e?.message || 'Failed to load users')
        }
      } finally {
        if (!cancelled) setAdminUsersLoading(false)
      }
    }

    loadUsers()
    return () => {
      cancelled = true
    }
  }, [isAdmin])

  useEffect(() => {
    if (!isAdmin) return
    let cancelled = false

    function normalize(rows) {
      return (rows || []).map((b) => ({
        id: b.id,
        title: b.title,
        producer: b.producer || 'Unknown',
        userId: b.user_id || null,
        genre: b.genre || 'Dancehall',
        bpm: b.bpm || 100,
        price: b.price || 29,
        hidden: b.hidden || false,
        flagged: b.flagged || false,
        createdAt: b.created_at || null,
      }))
    }

    async function loadBeatsList() {
      setAdminBeatsLoading(true)
      setAdminBeatsError('')
      try {
        const rows = await fetchBeats()
        if (!cancelled) setAdminBeats(normalize(rows))
      } catch (e) {
        if (!cancelled) {
          setAdminBeats([])
          setAdminBeatsError(e?.message || 'Failed to load beats')
        }
      } finally {
        if (!cancelled) setAdminBeatsLoading(false)
      }
    }

    loadBeatsList()
    return () => {
      cancelled = true
    }
  }, [isAdmin])

  const reloadAdminUsers = async () => {
    setAdminUsersLoading(true)
    setAdminUsersError('')
    try {
      const data = await fetchAdminUsers()
      setAdminUsers(Array.isArray(data) ? data : [])
    } catch (e) {
      setAdminUsersError(e?.message || 'Failed to load users')
    } finally {
      setAdminUsersLoading(false)
    }
  }

  const reloadAdminBeats = async () => {
    setAdminBeatsLoading(true)
    setAdminBeatsError('')
    try {
      const rows = await fetchBeats()
      setAdminBeats(
        (rows || []).map((b) => ({
          id: b.id,
          title: b.title,
          producer: b.producer || 'Unknown',
          userId: b.user_id || null,
          genre: b.genre || 'Dancehall',
          bpm: b.bpm || 100,
          price: b.price || 29,
          hidden: b.hidden || false,
          flagged: b.flagged || false,
          createdAt: b.created_at || null,
        })),
      )
    } catch (e) {
      setAdminBeatsError(e?.message || 'Failed to load beats')
    } finally {
      setAdminBeatsLoading(false)
    }
  }

  const handleViewProducerProfile = (id) => {
    if (!id) return
    navigate(`/producer/${id}`)
  }

  const handleViewBeat = (id) => {
    if (!id) return
    navigate(`/beat/${id}`)
  }

  const handleBanUser = async (id) => {
    try {
      await banAdminUser(id)
      setAdminUsers((prev) => prev.map((u) => (u.id === id ? { ...u, banned: true } : u)))
    } catch (e) {
      // eslint-disable-next-line no-alert
      alert(e?.message || 'Failed to ban user')
    }
  }

  const handleApproveProducer = async (id) => {
    try {
      await approveAdminProducer(id)
      setAdminUsers((prev) => prev.map((u) => (u.id === id ? { ...u, producer: true } : u)))
    } catch (e) {
      // eslint-disable-next-line no-alert
      alert(e?.message || 'Failed to approve producer')
    }
  }

  const handleResetPassword = async (id) => {
    try {
      await resetAdminPassword(id)
      // eslint-disable-next-line no-alert
      alert('Password reset email sent (if email templates are configured in Supabase).')
    } catch (e) {
      // eslint-disable-next-line no-alert
      alert(e?.message || 'Failed to reset password')
    }
  }

  const handleHideBeat = async (id) => {
    try {
      await adminHideBeat(id)
      await reloadAdminBeats()
    } catch (e) {
      // eslint-disable-next-line no-alert
      alert(e?.message || 'Failed to hide beat')
    }
  }

  const handleFlagBeat = async (id) => {
    try {
      await adminFlagBeat(id)
      await reloadAdminBeats()
    } catch (e) {
      // eslint-disable-next-line no-alert
      alert(e?.message || 'Failed to flag beat')
    }
  }

  const handleDeleteBeat = async (id) => {
    // eslint-disable-next-line no-alert
    if (!window.confirm('Delete this beat permanently?')) return
    try {
      await adminDeleteBeat(id)
      await reloadAdminBeats()
    } catch (e) {
      // eslint-disable-next-line no-alert
      alert(e?.message || 'Failed to delete beat')
    }
  }

  const range = useMemo(
    () => computeRange(rangeKey, customFrom, customTo),
    [rangeKey, customFrom, customTo],
  )

  const salesInRange = useMemo(() => {
    if (!range) return sales
    const { from, to } = range
    return (sales || []).filter((s) => inDateRange(s.created_at, from, to))
  }, [sales, range])

  const dailyRevenueSeries = useMemo(() => {
    const map = new Map()
    ;(salesInRange || []).forEach((s) => {
      const d = (s.created_at || '').slice(0, 10)
      if (!d) return
      const amt = Number(s.amount) || 0
      map.set(d, (map.get(d) || 0) + amt)
    })
    return Array.from(map.entries())
      .sort((a, b) => (a[0] < b[0] ? -1 : 1))
      .map(([label, value]) => ({ label: label.slice(5), value }))
  }, [salesInRange])

  const totalRevenueAllTime = useMemo(
    () => (sales || []).reduce((sum, s) => sum + (Number(s.amount) || 0), 0),
    [sales],
  )

  const revenueInRange = useMemo(
    () => salesInRange.reduce((sum, s) => sum + (Number(s.amount) || 0), 0),
    [salesInRange],
  )

  const revenuePrevPeriodDelta = useMemo(() => {
    if (!sales.length || !range || rangeKey !== '30d') return null
    const today = new Date()
    const endCurrent = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const startCurrent = new Date(endCurrent)
    startCurrent.setDate(endCurrent.getDate() - 29)
    const endPrev = new Date(startCurrent)
    endPrev.setDate(startCurrent.getDate() - 1)
    const startPrev = new Date(endPrev)
    startPrev.setDate(endPrev.getDate() - 29)

    const fromPrev = startPrev.toISOString().slice(0, 10)
    const toPrev = endPrev.toISOString().slice(0, 10)

    const prevSum = (sales || []).reduce((sum, s) => {
      return inDateRange(s.created_at, fromPrev, toPrev)
        ? sum + (Number(s.amount) || 0)
        : sum
    }, 0)

    if (!prevSum) return null
    const change = ((revenueInRange - prevSum) / prevSum) * 100
    return Math.round(change)
  }, [sales, revenueInRange, range, rangeKey])

  const totalSales = sales.length
  const totalBeats = beats.length

  // Derive user + producer counts from adminUsers (auth) when available,
  // falling back to profiles for older data.
  const totalUsers = adminUsers.length || profiles.length

  const producerProfiles = useMemo(
    () => profiles.filter((p) => (p.role || '').toLowerCase() === 'producer'),
    [profiles],
  )

  const producersCount = useMemo(
    () =>
      adminUsers.length
        ? adminUsers.filter((u) => u.producer).length
        : producerProfiles.length,
    [adminUsers, producerProfiles],
  )

  const beatStats = useMemo(() => {
    const byId = new Map()
    beats.forEach((b) => {
      if (!b?.id) return
      byId.set(b.id, {
        id: b.id,
        title: b.title || 'Untitled',
        producer: b.producer || 'Unknown',
        genre: b.genre || 'Other',
        bpm: b.bpm || null,
        plays: playCounts[b.id] || 0,
        sales: 0,
        revenue: 0,
      })
    })
    sales.forEach((s) => {
      const beatId = s.beat_id
      if (!beatId || !byId.has(beatId)) return
      const row = byId.get(beatId)
      row.sales += 1
      row.revenue += Number(s.amount) || 0
    })
    return Array.from(byId.values())
  }, [beats, sales, playCounts])

  const topSellingBeats = useMemo(
    () =>
      [...beatStats]
        .sort((a, b) => (b.revenue || 0) - (a.revenue || 0))
        .slice(0, 10),
    [beatStats],
  )

  const mostPlayedBeats = useMemo(
    () =>
      [...beatStats]
        .sort((a, b) => (b.plays || 0) - (a.plays || 0))
        .slice(0, 10),
    [beatStats],
  )

  const beatsUploadedToday = useMemo(
    () => countBeatsInLastDays(beats, 1),
    [beats],
  )
  const beatsUploadedWeek = useMemo(
    () => countBeatsInLastDays(beats, 7),
    [beats],
  )
  const beatsUploadedMonth = useMemo(
    () => countBeatsInLastDays(beats, 30),
    [beats],
  )

  const avgBpm = useMemo(() => {
    const bpms = beats.map((b) => Number(b.bpm) || 0).filter((v) => v > 0)
    if (!bpms.length) return 0
    const sum = bpms.reduce((s, v) => s + v, 0)
    return Math.round(sum / bpms.length)
  }, [beats])

  const genreDistribution = useMemo(() => {
    const map = new Map()
    beats.forEach((b) => {
      const g = (b.genre || 'Other').trim() || 'Other'
      map.set(g, (map.get(g) || 0) + 1)
    })
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([genre, count]) => ({ genre, count }))
  }, [beats])

  const producerStats = useMemo(() => {
    const byProducer = new Map()
    sales.forEach((s) => {
      const beat = beats.find((b) => b.id === s.beat_id)
      if (!beat) return
      const key = beat.user_id || beat.producer || 'unknown'
      const label = beat.producer || 'Unknown producer'
      const amt = Number(s.amount) || 0
      if (!byProducer.has(key)) {
        byProducer.set(key, {
          id: key,
          label,
          revenue: 0,
          sales: 0,
        })
      }
      const row = byProducer.get(key)
      row.revenue += amt
      row.sales += 1
    })
    return Array.from(byProducer.values())
  }, [beats, sales])

  const producersWithSales = producerStats.length
  const totalProducerRevenue = producerStats.reduce(
    (sum, p) => sum + (p.revenue || 0),
    0,
  )
  const avgRevenuePerProducer = producersWithSales
    ? totalProducerRevenue / producersWithSales
    : 0

  const totalPayouts = payouts.reduce(
    (sum, p) => sum + (Number(p.amount) || 0),
    0,
  )

  const estimatedPlatformFees = totalRevenueAllTime * SERVICE_FEE_RATE
  const estimatedProcessingFees = totalRevenueAllTime * PROCESSING_FEE_RATE
  const estimatedHostingMonthly = totalBeats * HOSTING_COST_PER_BEAT_MONTH

  const netProfitAllTime =
    totalRevenueAllTime - totalPayouts - estimatedProcessingFees

  const monthlyProfitSeries = useMemo(
    () => computeMonthlyProfitSeries({ sales, payouts, beats }),
    [sales, payouts, beats],
  )

  const revenuePie = useMemo(() => {
    const beatSalesRevenue = totalRevenueAllTime
    const boostsRevenue = 0
    const subsRevenue = 0
    const labRevenue = 0
    return [
      { label: 'Beat sales', value: beatSalesRevenue },
      { label: 'Subscriptions', value: subsRevenue },
      { label: 'Boosts & promos', value: boostsRevenue },
      { label: 'Recording Lab', value: labRevenue },
    ].filter((s) => s.value > 0)
  }, [totalRevenueAllTime])

  const totalCreditsIssued = labMetrics?.totalCreditsIssued || 0
  const totalCreditsUsed = labMetrics?.totalCreditsUsed || 0
  const totalCreditsRemaining = labMetrics?.totalCreditsRemaining || 0
  const sessionsCompleted = labMetrics?.sessionsCompleted || 0
  const avgCreditsPerSession = labMetrics?.avgCreditsPerSession || 0

  const kpiCards = [
    {
      key: 'revenueAll',
      label: 'Total revenue',
      value: formatCurrency(totalRevenueAllTime),
      sublabel: 'All time gross sales',
      delta: revenuePrevPeriodDelta,
      positive: revenuePrevPeriodDelta == null || revenuePrevPeriodDelta >= 0,
      icon: RevenueIcon,
      target: revenueRef,
    },
    {
      key: 'revenueRange',
      label: 'Revenue (range)',
      value: formatCurrency(revenueInRange),
      sublabel:
        rangeKey === '30d'
          ? 'Last 30 days'
          : rangeKey === '7d'
          ? 'Last 7 days'
          : 'Current range',
      delta: null,
      positive: true,
      icon: TrendIcon,
      target: revenueRef,
    },
    {
      key: 'netProfit',
      label: 'Net profit',
      value: formatCurrency(netProfitAllTime),
      sublabel: 'After payouts & fees (est.)',
      delta: null,
      positive: netProfitAllTime >= 0,
      icon: ProfitIcon,
      target: profitRef,
    },
    {
      key: 'activeUsers',
      label: 'Users',
      value: totalUsers.toLocaleString(),
      sublabel: 'Total auth users',
      delta: null,
      positive: true,
      icon: UsersIcon,
      target: usersRef,
    },
    {
      key: 'producers',
      label: 'Producers',
      value: producersCount.toLocaleString(),
      sublabel: 'Users flagged as producer',
      delta: null,
      positive: true,
      icon: BadgeIcon,
      target: usersRef,
    },
    {
      key: 'beats',
      label: 'Beats uploaded',
      value: totalBeats.toLocaleString(),
      sublabel: 'Total beats in catalog',
      delta: null,
      positive: true,
      icon: WaveformIcon,
      target: beatsRef,
    },
    {
      key: 'sales',
      label: 'Total sales',
      value: totalSales.toLocaleString(),
      sublabel: 'Completed beat sales',
      delta: null,
      positive: true,
      icon: CartIcon,
      target: salesRef,
    },
    {
      key: 'labCredits',
      label: 'Lab credits sold',
      value: '—',
      sublabel: 'Recording Lab (backend)',
      delta: null,
      positive: true,
      icon: LabIcon,
      target: recordingRef,
    },
  ]

  const revenueTransactionsRows = (salesInRange || []).slice(0, 20).map((s) => {
    const beat = beats.find((b) => b.id === s.beat_id)
    const platformFee = Number(s.amount || 0) * SERVICE_FEE_RATE
    const producerPayout = Number(s.amount || 0) - platformFee
    const processing = Number(s.amount || 0) * PROCESSING_FEE_RATE
    const net = platformFee - processing
    return {
      key: s.id,
      saleId: s.id,
      beat: beat?.title || 'Unknown beat',
      producer: beat?.producer || 'Unknown',
      amount: formatCurrency(s.amount),
      platformFee: formatCurrency(platformFee),
      producerPayout: formatCurrency(producerPayout),
      netProfit: formatCurrency(net),
      method: 'Stripe / PayPal',
      time: s.created_at
        ? new Date(s.created_at).toLocaleString()
        : '—',
    }
  })

  const topProducersRows = [...producerStats]
    .sort((a, b) => (b.revenue || 0) - (a.revenue || 0))
    .slice(0, 10)
    .map((p, idx) => ({
      key: p.id,
      rank: `#${idx + 1}`,
      producer: p.label,
      sales: p.sales.toLocaleString(),
      revenue: formatCurrency(p.revenue),
    }))

  const beatsTableRows = topSellingBeats.map((b) => ({
    key: b.id,
    title: b.title,
    producer: b.producer,
    plays: (b.plays || 0).toLocaleString(),
    sales: (b.sales || 0).toLocaleString(),
    revenue: formatCurrency(b.revenue),
  }))

  if (loading) {
    return (
      <section className="flex min-h-screen items-center justify-center bg-slate-950/95">
        <p className="text-sm text-slate-400">Loading admin access...</p>
      </section>
    )
  }

  if (!isAdmin) {
    return (
      <section className="flex min-h-screen items-center justify-center bg-slate-950/95">
        <p className="text-sm text-slate-400">Access denied.</p>
      </section>
    )
  }

  return (
    <AdminLayout
      title="Analytics overview"
      subtitle="Cross-platform KPIs for revenue, beats, users and Recording Lab."
    >
      <div className="space-y-6">
        <div className="sticky top-0 z-20 -mx-4 border-b border-slate-900/80 bg-slate-950/95 px-4 pb-3 pt-2">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-emerald-300">
                KPI Snapshot
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-100">
                Real-time business health
              </p>
              <p className="mt-1 text-[11px] text-slate-400">
                Click any card to jump to its detailed analytics panel.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-[10px]">
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
          <div className="mt-3 overflow-x-auto pb-1">
            <div className="flex min-w-max gap-2">
              {kpiCards.map((card) => (
                <div key={card.key} className="w-52 flex-shrink-0">
                  <KpiCard
                    label={card.label}
                    value={card.value}
                    sublabel={card.sublabel}
                    delta={card.delta}
                    positive={card.positive}
                    icon={card.icon}
                    onClick={() => card.target?.current?.scrollIntoView({
                      behavior: 'smooth',
                      block: 'start',
                    })}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {loadingDashboard && (
          <p className="text-[11px] text-slate-500">Loading live metrics…</p>
        )}

        <div
          ref={revenueRef}
          className="rounded-2xl border border-slate-800/80 bg-slate-950/80 p-4 shadow-lg"
        >
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-emerald-300">
                Revenue breakdown
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-100">
                Sources, trends and unit economics
              </p>
              <p className="mt-1 text-[11px] text-slate-400">
                Beat sales, subscriptions, boosts and Recording Lab revenue across the
                selected range.
              </p>
            </div>
          </div>
          <div className="mt-4 space-y-4">
            <RevenueChart lineData={dailyRevenueSeries} pieData={revenuePie} />
            <AnalyticsTable
              columns={[
                { key: 'saleId', label: 'Sale ID' },
                { key: 'beat', label: 'Beat' },
                { key: 'producer', label: 'Producer' },
                { key: 'amount', label: 'Gross', align: 'right' },
                { key: 'platformFee', label: 'Platform fee', align: 'right' },
                { key: 'producerPayout', label: 'Payout', align: 'right' },
                { key: 'netProfit', label: 'Net profit', align: 'right' },
                { key: 'method', label: 'Method' },
                { key: 'time', label: 'Timestamp' },
              ]}
              rows={revenueTransactionsRows}
              emptyLabel="No revenue transactions in this range yet."
            />
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <section
            ref={beatsRef}
            className="rounded-2xl border border-slate-800/80 bg-slate-950/80 p-4 shadow-lg"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-emerald-300">
                  Beats analytics
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-100">
                  Catalog depth and performance
                </p>
              </div>
            </div>
            <div className="mt-4 grid gap-3 text-[11px] sm:grid-cols-3">
              <MiniStat label="Total beats" value={totalBeats.toLocaleString()} />
              <MiniStat
                label="Uploaded today"
                value={beatsUploadedToday.toLocaleString()}
              />
              <MiniStat
                label="This week"
                value={beatsUploadedWeek.toLocaleString()}
              />
              <MiniStat
                label="This month"
                value={beatsUploadedMonth.toLocaleString()}
              />
              <MiniStat label="Average BPM" value={avgBpm || '—'} />
              <MiniStat
                label="Most common genre"
                value={genreDistribution[0]?.genre || '—'}
              />
            </div>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <div className="max-h-72 overflow-y-auto rounded-2xl border border-slate-800/80 bg-slate-950/80 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Top-selling beats
                </p>
                <AnalyticsTable
                  columns={[
                    { key: 'title', label: 'Beat' },
                    { key: 'producer', label: 'Producer' },
                    { key: 'plays', label: 'Plays', align: 'right' },
                    { key: 'sales', label: 'Sales', align: 'right' },
                    { key: 'revenue', label: 'Revenue', align: 'right' },
                  ]}
                  rows={beatsTableRows}
                  emptyLabel="No sales yet."
                />
              </div>
              <div className="max-h-72 overflow-y-auto rounded-2xl border border-slate-800/80 bg-slate-950/80 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Genre distribution
                </p>
                <ul className="mt-2 space-y-1 text-[11px]">
                  {genreDistribution.map((g) => (
                    <li
                      key={g.genre}
                      className="flex items-center justify-between gap-2"
                    >
                      <span className="text-slate-200">{g.genre}</span>
                      <span className="tabular-nums text-slate-400">
                        {g.count.toLocaleString()}
                      </span>
                    </li>
                  ))}
                  {genreDistribution.length === 0 && (
                    <li className="text-[11px] text-slate-500">
                      No beats uploaded yet.
                    </li>
                  )}
                </ul>
                <p className="mt-3 text-[10px] text-slate-500">
                  Use this to balance homepage genres and playlists.
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-slate-800/80 bg-slate-950/80 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Manage beats
                </p>
                <button
                  type="button"
                  onClick={reloadAdminBeats}
                  className="inline-flex items-center rounded-full border border-slate-700/80 bg-slate-950/80 px-3 py-1 text-[11px] text-slate-200 hover:border-emerald-400/70 hover:text-emerald-200"
                >
                  Refresh
                </button>
              </div>
              {adminBeatsError && (
                <p className="mt-2 text-[11px] text-rose-400">{adminBeatsError}</p>
              )}
              {adminBeatsLoading ? (
                <p className="mt-2 text-[11px] text-slate-500">Loading beats…</p>
              ) : (
                <div
                  className={`mt-3 space-y-3 ${adminBeats.length > 3 ? 'max-h-80 overflow-y-auto pr-1' : ''}`}
                >
                  {adminBeats.map((b) => (
                    <div
                      key={b.id}
                      className="flex flex-col gap-2 rounded-xl border border-slate-800/80 bg-slate-900/80 p-3 md:flex-row md:items-center md:justify-between"
                    >
                      <div>
                        <button
                          type="button"
                          onClick={() => handleViewBeat(b.id)}
                          className="text-left text-[11px] font-semibold text-slate-100 hover:text-emerald-200"
                        >
                          {b.title || 'Untitled'}
                          {b.hidden && (
                            <span className="ml-2 rounded-full bg-slate-800 px-2 py-0.5 text-[10px] text-slate-200">
                              Hidden
                            </span>
                          )}
                          {b.flagged && (
                            <span className="ml-2 rounded-full bg-rose-600/20 px-2 py-0.5 text-[10px] text-rose-300">
                              Flagged
                            </span>
                          )}
                        </button>
                        <p className="mt-0.5 text-[10px] text-slate-400">
                          {b.producer} • {b.genre} • {b.bpm} BPM
                        </p>
                        {b.createdAt && (
                          <p className="text-[10px] text-slate-500">
                            Uploaded {new Date(b.createdAt).toLocaleDateString()}
                            {b.userId ? ` • User ID: ${b.userId}` : ''}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2 text-[11px]">
                        <button
                          type="button"
                          onClick={() => handleViewBeat(b.id)}
                          className="rounded-full border border-slate-700/70 bg-slate-800/80 px-3 py-1 text-slate-200 hover:border-emerald-400/70 hover:text-emerald-200"
                        >
                          View
                        </button>
                        {!b.hidden && (
                          <button
                            type="button"
                            onClick={() => handleHideBeat(b.id)}
                            className="rounded-full border border-slate-700/70 px-3 py-1 text-slate-300 hover:border-emerald-400/70"
                          >
                            Hide
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleFlagBeat(b.id)}
                          className="rounded-full border border-rose-600/40 px-3 py-1 text-rose-300 hover:bg-rose-600/10"
                        >
                          Flag
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteBeat(b.id)}
                          className="rounded-full border border-slate-700/70 px-3 py-1 text-slate-300 hover:border-rose-500/70"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                  {adminBeats.length === 0 && (
                    <p className="text-[11px] text-slate-500">No beats.</p>
                  )}
                </div>
              )}
            </div>
          </section>

          <section
            ref={usersRef}
            className="rounded-2xl border border-slate-800/80 bg-slate-950/80 p-4 shadow-lg"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-emerald-300">
                  Users & producers
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-100">
                  Growth and earning power
                </p>
              </div>
            </div>
            <div className="mt-4 grid gap-3 text-[11px] sm:grid-cols-3">
              <MiniStat label="Total users" value={totalUsers.toLocaleString()} />
              <MiniStat
                label="Producers"
                value={producersCount.toLocaleString()}
              />
              <MiniStat
                label="Producers with sales"
                value={producersWithSales.toLocaleString()}
              />
              <MiniStat
                label="Avg revenue / producer"
                value={formatCurrency(avgRevenuePerProducer)}
              />
            </div>
            <div className="mt-4">
              <AnalyticsTable
                columns={[
                  { key: 'rank', label: 'Rank' },
                  { key: 'producer', label: 'Producer' },
                  { key: 'sales', label: 'Sales', align: 'right' },
                  { key: 'revenue', label: 'Revenue', align: 'right' },
                ]}
                rows={topProducersRows}
                emptyLabel="No earning producers yet."
              />
            </div>

            <div className="mt-4 rounded-2xl border border-slate-800/80 bg-slate-950/80 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Manage users
                </p>
                <button
                  type="button"
                  onClick={reloadAdminUsers}
                  className="inline-flex items-center rounded-full border border-slate-700/80 bg-slate-950/80 px-3 py-1 text-[11px] text-slate-200 hover:border-emerald-400/70 hover:text-emerald-200"
                >
                  Refresh
                </button>
              </div>
              {adminUsersError && (
                <p className="mt-2 text-[11px] text-rose-400">{adminUsersError}</p>
              )}
              {adminUsersLoading ? (
                <p className="mt-2 text-[11px] text-slate-500">Loading users…</p>
              ) : (
                <div
                  className={`mt-3 space-y-3 ${adminUsers.length > 3 ? 'max-h-80 overflow-y-auto pr-1' : ''}`}
                >
                  {adminUsers.map((u) => (
                    <div
                      key={u.id}
                      className="flex flex-col gap-2 rounded-xl border border-slate-800/80 bg-slate-900/80 p-3 md:flex-row md:items-center md:justify-between"
                    >
                      <div>
                        <p className="text-[11px] font-semibold text-slate-100">
                          {u.email}
                          {u.banned && (
                            <span className="ml-2 rounded-full bg-rose-600/20 px-2 py-0.5 text-[10px] text-rose-300">
                              Banned
                            </span>
                          )}
                          {u.producer && !u.banned && (
                            <span className="ml-2 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-300">
                              Producer
                            </span>
                          )}
                        </p>
                        <p className="text-[10px] text-slate-400">ID: {u.id}</p>
                        {u.createdAt && (
                          <p className="text-[10px] text-slate-500">
                            Joined: {new Date(u.createdAt).toLocaleDateString()}
                            {u.lastSignInAt
                              ? ` • Last sign-in: ${new Date(u.lastSignInAt).toLocaleDateString()}`
                              : ''}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2 text-[11px]">
                        <button
                          type="button"
                          onClick={() => handleViewProducerProfile(u.id)}
                          className="rounded-full border border-slate-700/70 bg-slate-800/80 px-3 py-1 text-slate-200 hover:border-emerald-400/70 hover:text-emerald-200"
                        >
                          View Profile
                        </button>
                        {!u.banned && (
                          <button
                            type="button"
                            onClick={() => handleBanUser(u.id)}
                            className="rounded-full border border-rose-600/40 px-3 py-1 text-rose-300 hover:bg-rose-600/10"
                          >
                            Ban
                          </button>
                        )}
                        {!u.producer && !u.banned && (
                          <button
                            type="button"
                            onClick={() => handleApproveProducer(u.id)}
                            className="rounded-full border border-emerald-500/60 px-3 py-1 text-emerald-300 hover:bg-emerald-500/10"
                          >
                            Approve Producer
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleResetPassword(u.id)}
                          className="rounded-full border border-slate-700/70 px-3 py-1 text-slate-300 hover:border-emerald-400/70"
                        >
                          Reset Password
                        </button>
                      </div>
                    </div>
                  ))}
                  {adminUsers.length === 0 && (
                    <p className="text-[11px] text-slate-500">No users.</p>
                  )}
                </div>
              )}
            </div>
          </section>
        </div>

        <section
          ref={salesRef}
          className="rounded-2xl border border-slate-800/80 bg-slate-950/80 p-4 shadow-lg"
        >
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-emerald-300">
                Sales & transactions
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-100">
                Line-item breakdown with export
              </p>
            </div>
            <div className="flex gap-2 text-[11px]">
              <button
                type="button"
                onClick={() => exportRowsAsCsv(revenueTransactionsRows, 'sales.csv')}
                className="inline-flex items-center rounded-full border border-slate-700/80 bg-slate-950/80 px-3 py-1.5 text-slate-200 hover:border-emerald-400/70 hover:text-emerald-200"
              >
                Export CSV
              </button>
              <button
                type="button"
                onClick={() => exportRowsAsCsv(revenueTransactionsRows, 'sales.xlsx')}
                className="inline-flex items-center rounded-full border border-slate-700/80 bg-slate-950/80 px-3 py-1.5 text-slate-200 hover:border-emerald-400/70 hover:text-emerald-200"
              >
                Export Excel
              </button>
            </div>
          </div>
          <div className="mt-4">
            <AnalyticsTable
              columns={[
                { key: 'saleId', label: 'Sale ID' },
                { key: 'beat', label: 'Beat' },
                { key: 'producer', label: 'Producer' },
                { key: 'amount', label: 'Gross', align: 'right' },
                { key: 'platformFee', label: 'Platform fee', align: 'right' },
                { key: 'producerPayout', label: 'Payout', align: 'right' },
                { key: 'netProfit', label: 'Net profit', align: 'right' },
                { key: 'method', label: 'Method' },
                { key: 'time', label: 'Timestamp' },
              ]}
              rows={revenueTransactionsRows}
              emptyLabel="No sales yet."
            />
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-2">
          <section
            ref={recordingRef}
            className="rounded-2xl border border-slate-800/80 bg-slate-950/80 p-4 shadow-lg"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-emerald-300">
                  Recording Lab
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-100">
                  Credits and sessions (backend-driven)
                </p>
                <p className="mt-1 text-[11px] text-slate-400">
                  Hook this panel up to your /admin/recording-lab endpoint to see
                  real credit issuance, usage and session funnels.
                </p>
              </div>
            </div>
            <div className="mt-4 grid gap-3 text-[11px] sm:grid-cols-3">
              <MiniStat
                label="Total credits issued"
                value={totalCreditsIssued.toLocaleString()}
              />
              <MiniStat
                label="Credits used"
                value={totalCreditsUsed.toLocaleString()}
              />
              <MiniStat
                label="Credits remaining"
                value={totalCreditsRemaining.toLocaleString()}
              />
              <MiniStat
                label="Sessions completed"
                value={sessionsCompleted.toLocaleString()}
              />
              <MiniStat
                label="Avg credits / session"
                value={avgCreditsPerSession ? avgCreditsPerSession.toFixed(1) : '—'}
              />
            </div>
            {!labMetrics && (
              <p className="mt-4 text-[10px] text-slate-500">
                Unable to load Recording Lab metrics from the server yet.
              </p>
            )}
          </section>

          <section
            ref={profitRef}
            className="rounded-2xl border border-slate-800/80 bg-slate-950/80 p-4 shadow-lg"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-emerald-300">
                  Profit & cost analysis
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-100">
                  Margins, payouts and break-even
                </p>
              </div>
            </div>
            <div className="mt-4 grid gap-3 text-[11px] sm:grid-cols-3">
              <MiniStat
                label="Gross revenue"
                value={formatCurrency(totalRevenueAllTime)}
              />
              <MiniStat
                label="Producer payouts"
                value={formatCurrency(totalPayouts)}
              />
              <MiniStat
                label="Processing fees (est.)"
                value={formatCurrency(estimatedProcessingFees)}
              />
              <MiniStat
                label="Hosting (monthly est.)"
                value={formatCurrency(estimatedHostingMonthly)}
              />
              <MiniStat
                label="Net profit (all time)"
                value={formatCurrency(netProfitAllTime)}
              />
              <MiniStat
                label="Profit margin"
                value={
                  totalRevenueAllTime
                    ? `${Math.round(
                        (netProfitAllTime / totalRevenueAllTime) * 100,
                      )}%`
                    : '—'
                }
              />
            </div>
            <div className="mt-4">
              <MiniProfitChart data={monthlyProfitSeries} />
            </div>
          </section>
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

function inDateRange(timestamp, from, to) {
  if (!timestamp || !from || !to) return false
  const d = timestamp.slice(0, 10)
  return d >= from && d <= to
}

function countBeatsInLastDays(beats, days) {
  if (!beats?.length) return 0
  const now = new Date()
  const threshold = new Date(now)
  threshold.setDate(now.getDate() - (days - 1))
  return beats.filter((b) => {
    if (!b.created_at) return false
    const d = new Date(b.created_at)
    return d >= threshold
  }).length
}

function computeMonthlyProfitSeries({ sales, payouts, beats }) {
  const map = new Map()
  ;(sales || []).forEach((s) => {
    if (!s.created_at) return
    const d = new Date(s.created_at)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const amt = Number(s.amount) || 0
    if (!map.has(key)) {
      map.set(key, { revenue: 0, payouts: 0 })
    }
    const row = map.get(key)
    row.revenue += amt
  })
  ;(payouts || []).forEach((p) => {
    if (!p.createdAt) return
    const d = new Date(p.createdAt)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const amt = Number(p.amount) || 0
    if (!map.has(key)) {
      map.set(key, { revenue: 0, payouts: 0 })
    }
    const row = map.get(key)
    row.payouts += amt
  })

  const months = Array.from(map.entries())
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .slice(-12)
  return months.map(([month, vals]) => {
    const hosting = (beats?.length || 0) * HOSTING_COST_PER_BEAT_MONTH
    const processing = vals.revenue * PROCESSING_FEE_RATE
    const net = vals.revenue - vals.payouts - hosting - processing
    return {
      label: month,
      revenue: vals.revenue,
      net,
    }
  })
}

function MiniStat({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-800/80 bg-slate-950/80 p-3">
      <p className="text-[10px] text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-50">{value}</p>
    </div>
  )
}

function MiniProfitChart({ data }) {
  if (!data?.length) {
    return (
      <p className="text-[11px] text-slate-500">
        No monthly profit data yet.
      </p>
    )
  }
  const width = 520
  const height = 140
  const paddingX = 32
  const paddingY = 18
  const innerW = width - paddingX * 2
  const innerH = height - paddingY * 2
  const maxVal = data.reduce((m, d) => (d.net > m ? d.net : m), 0) || 1
  const minVal = 0
  const n = data.length
  const xFor = (i) =>
    paddingX + (n === 1 ? innerW / 2 : (innerW * i) / (n - 1))
  const yFor = (v) =>
    paddingY + innerH - ((v - minVal) / (maxVal - minVal || 1)) * innerH
  const points = data.map((d, i) => `${xFor(i)},${yFor(d.net)}`).join(' ')
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full max-w-full">
      <defs>
        <linearGradient id="profitLine" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor="#22c55e" />
          <stop offset="100%" stopColor="#eab308" />
        </linearGradient>
      </defs>
      {data.length > 0 && (
        <polyline
          fill="none"
          stroke="url(#profitLine)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
        />
      )}
      {data.map((d, i) => (
        <circle
          key={d.label}
          cx={xFor(i)}
          cy={yFor(d.net)}
          r="2"
          fill="#22c55e"
        />
      ))}
      {data.map((d, i) => (
        <text
          key={d.label + '-x'}
          x={xFor(i)}
          y={height - 4}
          textAnchor="middle"
          fontSize="9"
          fill="#64748b"
        >
          {d.label}
        </text>
      ))}
    </svg>
  )
}

function formatCurrency(v) {
  const n = Number(v) || 0
  return `$${n.toFixed(2)}`
}

async function loadProfiles() {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, role, created_at')
    if (error) throw error
    return data || []
  } catch {
    return []
  }
}

function exportRowsAsCsv(rows, filename) {
  if (!rows?.length) return
  const cols = Object.keys(rows[0])
  const header = cols.join(',')
  const body = rows
    .map((row) =>
      cols
        .map((key) => {
          const val = row[key] ?? ''
          const s = String(val).replace(/"/g, '""')
          return /[",\n]/.test(s) ? `"${s}"` : s
        })
        .join(','),
    )
    .join('\n')
  const csv = `${header}\n${body}`
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function RevenueIcon(props) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M3 3v18h18" />
      <path d="M7 14l4-4 3 3 5-7" />
    </svg>
  )
}

function TrendIcon(props) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M3 17l6-6 4 4 8-8" />
      <path d="M14 7h7v7" />
    </svg>
  )
}

function ProfitIcon(props) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M9 12h6" />
      <path d="M12 8v8" />
    </svg>
  )
}

function UsersIcon(props) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

function BadgeIcon(props) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M12 2 4 5v6c0 5 3 9 8 11 5-2 8-6 8-11V5z" />
      <path d="m9 11 2 2 4-4" />
    </svg>
  )
}

function WaveformIcon(props) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M3 12h2" />
      <path d="M7 8v8" />
      <path d="M11 5v14" />
      <path d="M15 8v8" />
      <path d="M19 12h2" />
    </svg>
  )
}

function CartIcon(props) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <circle cx="9" cy="21" r="1" />
      <circle cx="20" cy="21" r="1" />
      <path d="M3 3h2l3 12h11" />
      <path d="M6 6h15l-1 7H9" />
    </svg>
  )
}

function LabIcon(props) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M6 2h12" />
      <path d="M9 2v6l-4 8a4 4 0 0 0 3.6 6h6.8A4 4 0 0 0 19 16l-4-8V2" />
    </svg>
  )
}

export default AdminAnalytics


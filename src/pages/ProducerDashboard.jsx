import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import ProducerLayout from '../components/ProducerLayout'
import ProfileShareModal from '../components/ProfileShareModal'
import { BeatCard } from '../components/BeatCard'
import useSupabaseUser from '../hooks/useSupabaseUser'
import useUserProfile from '../hooks/useUserProfile'
import BackButton from '../components/BackButton'
import {
  totalEarnings,
  monthlySalesCount,
  computeProducerEarnings,
  deleteBeat,
} from '../services/beatsService'
import {
  getPlayCount,
  getTotalPlaysForBeats,
  getAveragePlaysPerBeat,
  topBeatsByPlays,
} from '../services/analyticsService'
import { listUserPayouts, cancelPayout } from '../services/payoutsRepository'
import { useSales } from '../hooks/useSales'
import { useBeats } from '../hooks/useBeats'
import { followerCount, fetchFollowerProfiles } from '../services/socialService'
import { getSubscription } from '../services/subscriptionService'
import { queryJobRequests } from '../services/serviceJobRequestsService'
import { fetchProducerMetrics } from '../services/producerMetricsService'
import { createBeat } from '../services/beatsRepository'
import { uploadArtwork } from '../services/storageService'

export function ProducerDashboard() {
  const navigate = useNavigate()
  const { user, loading } = useSupabaseUser()
  const { beats, loading: beatsLoading } = useBeats()
  const { sales, loading: salesLoading } = useSales()
  const [payouts, setPayouts] = useState([])
  const [shareOpen, setShareOpen] = useState(false)
  const [followers, setFollowers] = useState(0)
  const [followerProfiles, setFollowerProfiles] = useState([])
  const [subscription, setSubscription] = useState(null)
  const [managedBeats, setManagedBeats] = useState([])
  const [editingBeat, setEditingBeat] = useState(null)
  const [inspectingBeatId, setInspectingBeatId] = useState(null)
  const [boostedMap, setBoostedMap] = useState({})
  const [assignedJobs, setAssignedJobs] = useState([])
  const [openJobs, setOpenJobs] = useState([])
  const [mixActiveJobs, setMixActiveJobs] = useState([])
  const [mixCompletedJobs, setMixCompletedJobs] = useState([])
  const [metricKind, setMetricKind] = useState('plays')
  const [rangeKey, setRangeKey] = useState('30d')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [metricSeries, setMetricSeries] = useState([])
  const [metricLoading, setMetricLoading] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState({
    open: false,
    beatId: null,
    title: '',
  })
  const { profile } = useUserProfile()
  const accountType = profile?.accountType || ''
  const roleTokens = accountType.split('+').map(t => t.trim().toLowerCase()).filter(Boolean)
  const isMixEngineer = roleTokens.includes('mix-master engineer') || roleTokens.includes('mixing') || roleTokens.includes('engineer')

  useEffect(() => {
    if (!loading && !user) navigate('/login')
  }, [loading, user, navigate])

  useEffect(() => {
    if (user) {
      ;(async () => {
        setPayouts(await listUserPayouts(user.id))
      })()
    }
  }, [user])

  useEffect(() => {
    if (user) {
      ;(async () => {
        setFollowers(await followerCount(user.id))
        setFollowerProfiles(await fetchFollowerProfiles(user.id))
      })()
    }
  }, [user])

  useEffect(() => {
    let active = true
    if (user) {
      ;(async () => {
        const sub = await getSubscription(user.id)
        if (active) setSubscription(sub)
      })()
    } else {
      setSubscription(null)
    }
    return () => {
      active = false
    }
  }, [user])

  useEffect(() => {
    if (!user) return
    const mine = beats.filter(
      (b) =>
        (b.userId && b.userId === user.id) ||
        (!b.userId &&
          (b.producer === user.email ||
            b.producer === user?.user_metadata?.display_name)),
    )
    setManagedBeats(mine)
  }, [beats, user])

  useEffect(() => {
    if (!user) return
    let active = true
    ;(async () => {
      try {
        const base = (import.meta.env.VITE_API_BASE_URL || '').replace(
          /\/$/,
          '',
        )
        const endpoint = base ? `${base}/api/admin/boosts` : '/api/admin/boosts'
        const res = await fetch(endpoint, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        })
        if (!res.ok) return
        const payload = await res.json().catch(() => ({}))
        const list = Array.isArray(payload.items) ? payload.items : []
        if (!active) return
        const map = {}
        list
          .filter((b) => b.producer_id === user.id)
          .forEach((b) => {
            map[b.beat_id] = b
          })
        setBoostedMap(map)
      } catch {
        // ignore
      }
    })()
    return () => {
      active = false
    }
  }, [user])

  useEffect(() => {
    if (user) {
      loadJobs()
    }
    async function loadJobs() {
      try {
        const { data: open } = await queryJobRequests({
          status: 'open',
          page: 1,
          pageSize: 50,
        })
        const { data: assignedAll } = await queryJobRequests({
          status: 'assigned',
          page: 1,
          pageSize: 50,
        })
        setOpenJobs((open || []).slice(0, 5))
        setAssignedJobs(
          (assignedAll || [])
            .filter((j) => j.assignedProviderId === user.id)
            .slice(0, 5),
        )
        if (isMixEngineer) {
          const activeMix = (assignedAll || []).filter(
            (j) =>
              j.assignedProviderId === user.id &&
              (j.category === 'mixing' || j.category === 'mix-master'),
          )
          const { data: completedMixAll } = await queryJobRequests({
            status: 'completed',
            page: 1,
            pageSize: 50,
          })
          const completedMix = (completedMixAll || []).filter(
            (j) =>
              j.assignedProviderId === user.id &&
              (j.category === 'mixing' || j.category === 'mix-master'),
          )
          setMixActiveJobs(activeMix.slice(0, 5))
          setMixCompletedJobs(completedMix.slice(0, 5))
        } else {
          setMixActiveJobs([])
          setMixCompletedJobs([])
        }
      } catch {
        // ignore
      }
    }
  }, [user, isMixEngineer])

  useEffect(() => {
    async function loadMetrics() {
      if (!user) return
      setMetricLoading(true)
      try {
        const { from, to } = computeRange(rangeKey, customFrom, customTo)
        const series = await fetchProducerMetrics({
          producerId: user.id,
          metric: metricKind,
          from,
          to,
        })
        setMetricSeries(series)
      } catch {
        setMetricSeries([])
      } finally {
        setMetricLoading(false)
      }
    }
    loadMetrics()
  }, [user, metricKind, rangeKey, customFrom, customTo])

  if (loading) {
    return (
      <section className="bg-slate-950/95 min-h-screen flex items-center justify-center">
        <p className="text-sm text-slate-300">Loading...</p>
      </section>
    )
  }
  if (!user) {
    return (
      <section className="bg-slate-950/95 min-h-screen flex items-center justify-center">
        <p className="text-sm text-slate-300">Redirecting to login…</p>
      </section>
    )
  }

  const earnings = totalEarnings()
  const grossProducer = user
    ? computeProducerEarnings({ userId: user.id, displayName: user.email })
    : 0
  const myBeats = managedBeats
  const beatIds = myBeats.map((b) => b.id)
  const totalPlays = getTotalPlaysForBeats(beatIds)
  const avgPlays = getAveragePlaysPerBeat(beatIds)
  const top3 = topBeatsByPlays(beatIds, 3)
  const likesTotal = myBeats.reduce((sum, b) => sum + (b.likes || 0), 0)
  const favsTotal = myBeats.reduce((sum, b) => sum + (b.favs || 0), 0)
  const completedTotal = payouts
    .filter((p) => p.status === 'completed')
    .reduce((sum, p) => sum + p.amount, 0)
  const pendingTotal = payouts
    .filter((p) => p.status === 'pending')
    .reduce((sum, p) => sum + p.amount, 0)
  const availableBalance = Math.max(0, grossProducer - completedTotal - pendingTotal)
  const monthSales = monthlySalesCount()

  const subExpiresAt = subscription?.expiresAt
    ? new Date(subscription.expiresAt)
    : null
  const subDaysRemaining = subExpiresAt
    ? Math.ceil(
        (subExpiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
      )
    : null
  const planLabel =
    subscription?.planId === 'starter'
      ? 'Starter'
      : subscription?.planId === 'pro'
      ? 'Pro'
      : 'Free'

  const timeAgoHours = (s) => {
    if (s.createdAt) {
      const diffMs = Date.now() - new Date(s.createdAt).getTime()
      return Math.max(0, Math.round(diffMs / 3600000))
    }
    if (typeof s.minutesAgo === 'number') return Math.round(s.minutesAgo / 60)
    return 0
  }

  const boostBeat = (id) => {
    // Navigate to dedicated Boost Beat page for this beat
    navigate(`/boost/${id}`)
  }

  const removeBeat = async (id) => {
    const target = managedBeats.find((b) => b.id === id)
    setDeleteConfirm({
      open: true,
      beatId: id,
      title: target?.title || 'this beat',
    })
  }

  const confirmDeleteBeat = async () => {
    if (!deleteConfirm.beatId) {
      setDeleteConfirm({ open: false, beatId: null, title: '' })
      return
    }
    try {
      await deleteBeat(deleteConfirm.beatId)
    } finally {
      setDeleteConfirm({ open: false, beatId: null, title: '' })
    }
  }

  const displayName =
    user.user_metadata?.display_name || user.email || 'Producer'

  const handleSaveEdit = async (updated) => {
    if (!updated || !user) return
    try {
      let coverUrl = updated.coverUrl || null
      if (updated.newArtworkFile) {
        const { publicUrl } = await uploadArtwork(updated.newArtworkFile)
        coverUrl = publicUrl
      }
      const payload = {
        id: updated.id,
        user_id: user.id,
        title: updated.title,
        bpm: updated.bpm ? Number(updated.bpm) : null,
        cover_url: coverUrl,
        collaborator: updated.collaborator || null,
      }
      await createBeat(payload)
    } finally {
      setEditingBeat(null)
    }
  }

  return (
    <ProducerLayout>
      <section className="bg-slate-950/95">
        <div className="mx-auto max-w-6xl px-3 py-6 sm:px-4 sm:py-8">
          <div className="flex items-center gap-3">
            <BackButton />
            <div>
              <h1 className="font-display text-xl font-semibold text-slate-50 sm:text-2xl">
                My Dashboard
              </h1>
              <p className="mt-1 text-xs text-slate-400 sm:text-sm">
                Welcome back, {displayName}. Track catalog, sales, ads and jobs in one
                place.
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Total earnings" value={`$${earnings.toFixed(2)}`} />
            <StatCard
              label="Available balance"
              value={`$${availableBalance.toFixed(2)}`}
            />
            <StatCard label="Beats in catalog" value={myBeats.length} />
            <StatCard label="Monthly sales" value={monthSales} />
          </div>

          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-black/70 bg-rb-gloss-stripes bg-blend-soft-light p-4 shadow-rb-gloss-panel">
              <h2 className="text-sm font-semibold text-slate-100">
                Audience & Reach
              </h2>
              <div className="mt-3 grid gap-3 sm:grid-cols-3 text-xs">
                <MiniMetric label="Followers" value={followers} />
                <MiniMetric label="Total plays" value={totalPlays} />
                <MiniMetric
                  label="Avg plays / beat"
                  value={avgPlays.toFixed(1)}
                />
              </div>
              <div className="mt-4">
                <p className="text-[11px] text-slate-400 mb-1">
                  Top performing beats (by plays)
                </p>
                <div className="space-y-1.5 text-[11px] text-slate-300">
                  {top3.map((b) => (
                    <div
                      key={b.id}
                      className="flex items-center justify-between rounded-lg border border-slate-800/80 bg-slate-950/80 px-3 py-1.5"
                    >
                      <span className="truncate max-w-[10rem]">
                        {myBeats.find((mb) => mb.id === b.id)?.title || 'Beat'}
                      </span>
                      <span className="text-rb-trop-cyan">{b.plays} plays</span>
                    </div>
                  ))}
                  {top3.length === 0 && (
                    <p className="text-[11px] text-slate-500">
                      No playback data yet—share your catalog to get started.
                    </p>
                  )}
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/70 bg-rb-gloss-stripes bg-blend-soft-light p-4 shadow-rb-gloss-panel">
              <h2 className="text-sm font-semibold text-slate-100">
                Boosted Ads & Jobs
              </h2>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 text-[11px] text-slate-300">
                <MiniMetric
                  label="Active boosts"
                  value={Object.keys(boostedMap || {}).length}
                />
                <MiniMetric label="Likes (all beats)" value={likesTotal} />
                <MiniMetric label="Favorites (all beats)" value={favsTotal} />
                <MiniMetric label="Open jobs (preview)" value={openJobs.length} />
              </div>
              <div className="mt-4 rounded-xl border border-slate-800/70 bg-slate-950/70 p-3 text-[11px]">
                <p className="font-semibold text-slate-100 mb-1">Assigned jobs</p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-[10px] font-semibold text-slate-400 mb-1">
                      For you
                    </p>
                    <ul className="space-y-1 text-[10px] text-slate-300">
                      {assignedJobs.map((j) => (
                        <li
                          key={j.id}
                          className="flex justify-between"
                        >
                          <span className="truncate max-w-[7rem]">
                            {j.title}
                          </span>
                          <span className="text-red-300">${j.budget}</span>
                        </li>
                      ))}
                      {assignedJobs.length === 0 && (
                        <li className="text-slate-500">None</li>
                      )}
                    </ul>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-slate-400 mb-1">
                      Open
                    </p>
                    <ul className="space-y-1 text-[10px] text-slate-300">
                      {openJobs.map((j) => (
                        <li
                          key={j.id}
                          className="flex justify-between"
                        >
                          <span className="truncate max-w-[7rem]">
                            {j.title}
                          </span>
                          <span className="text-emerald-300">${j.budget}</span>
                        </li>
                      ))}
                      {openJobs.length === 0 && (
                        <li className="text-slate-500">None</li>
                      )}
                    </ul>
                  </div>
                </div>
                <a
                  href="/jobs"
                  className="mt-3 inline-block rounded-full border border-rb-trop-cyan px-3 py-1.5 text-[10px] font-medium text-rb-trop-cyan hover:bg-rb-trop-cyan/10 transition"
                >
                  Browse Jobs
                </a>
              </div>
            </div>
          </div>

          {isMixEngineer && (
            <div className="mt-6 grid gap-6 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-800/80 bg-slate-900/80 p-4 shadow-rb-gloss-panel">
                <h2 className="text-sm font-semibold text-slate-100">
                  Active service orders
                </h2>
                <p className="mt-1 text-[11px] text-slate-400">
                  Jobs where you&apos;re currently mixing or mastering.
                </p>
                <ul className="mt-3 space-y-2 text-[11px] text-slate-300">
                  {mixActiveJobs.map((j) => (
                    <li
                      key={j.id}
                      className="flex items-center justify-between rounded-lg border border-slate-800/80 bg-slate-950/80 px-3 py-2"
                    >
                      <span className="max-w-[10rem] truncate">
                        {j.title}
                      </span>
                      <span className="text-emerald-300">
                        ${j.budget}
                      </span>
                    </li>
                  ))}
                  {mixActiveJobs.length === 0 && (
                    <li className="text-[11px] text-slate-500">
                      No active mix &amp; master orders.
                    </li>
                  )}
                </ul>
              </div>
              <div className="rounded-2xl border border-slate-800/80 bg-slate-900/80 p-4 shadow-rb-gloss-panel">
                <h2 className="text-sm font-semibold text-slate-100">
                  Completed mixes
                </h2>
                <p className="mt-1 text-[11px] text-slate-400">
                  Recent jobs you&apos;ve delivered.
                </p>
                <ul className="mt-3 space-y-2 text-[11px] text-slate-300">
                  {mixCompletedJobs.map((j) => (
                    <li
                      key={j.id}
                      className="flex items-center justify-between rounded-lg border border-slate-800/80 bg-slate-950/80 px-3 py-2"
                    >
                      <span className="max-w-[10rem] truncate">
                        {j.title}
                      </span>
                      <span className="text-slate-400 text-[10px]">
                        Completed
                      </span>
                    </li>
                  ))}
                  {mixCompletedJobs.length === 0 && (
                    <li className="text-[11px] text-slate-500">
                      Completed mix &amp; master jobs will appear here.
                    </li>
                  )}
                </ul>
              </div>
            </div>
          )}

          <div className="mt-8 grid gap-6 lg:grid-cols-[1.4fr,1fr]">
            <div className="rounded-2xl border border-slate-800/80 bg-slate-900/80 p-4 shadow-rb-gloss-panel">
              <h2 className="text-sm font-semibold text-slate-100">Recent Sales</h2>
              <div className="mt-3 space-y-2 text-xs text-slate-300">
                {salesLoading && (
                  <p className="text-[11px] text-slate-500">Loading sales…</p>
                )}
                {!salesLoading &&
                  sales.map((s) => (
                    <div
                      key={s.beatId + (s.createdAt || '')}
                      className="flex items-center justify-between rounded-xl border border-slate-800/80 bg-slate-950/80 p-3"
                    >
                      <div>
                        <p className="font-semibold text-slate-100">
                          {beats.find((b) => b.id === s.beatId)?.title || 'Beat'}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          {s.license} • to {s.buyer}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-emerald-400">${s.amount}</p>
                        <p className="text-[11px] text-slate-500">
                          {timeAgoHours(s)}h ago
                        </p>
                      </div>
                    </div>
                  ))}
                {sales.length === 0 && (
                  <p className="text-[11px] text-slate-500">No sales yet.</p>
                )}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-800/80 bg-slate-900/80 p-4 space-y-5 shadow-rb-gloss-panel">
              <h2 className="text-sm font-semibold text-slate-100">Next steps</h2>
              <ul className="mt-3 space-y-2 text-xs text-slate-300">
                <li>• Upload more beats to increase catalog depth.</li>
                <li>• Create open riddims to attract collaborations.</li>
                <li>• Configure payout method & withdraw earnings.</li>
                <li>• Monitor pending withdrawals to manage cash flow.</li>
              </ul>
              <a
                href="/producer/upload"
                className="mt-4 block w-full rounded-full bg-rb-trop-sunrise px-4 py-2 text-xs font-semibold text-slate-950 text-center shadow-rb-gloss-btn hover:brightness-110 transition"
              >
                Upload a New Beat
              </a>
              <a
                href="/producer/withdraw"
                className="mt-2 block w-full rounded-full bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-200 text-center hover:bg-slate-700 transition"
              >
                Withdraw Earnings
              </a>
              <div className="mt-5 rounded-xl border border-slate-800/70 bg-slate-950/70 p-4 text-xs">
                {!subscription && (
                  <div>
                    <p className="font-semibold text-slate-100 mb-1">
                      Upgrade to Pro
                    </p>
                    <p className="text-slate-400 mb-3">
                      Unlock unlimited uploads, custom banners, analytics & faster
                      payouts.
                    </p>
                    <a
                      href="/producer/pro"
                      className="inline-block rounded-full bg-rb-trop-sunrise px-4 py-2 text-[11px] font-semibold text-slate-950 shadow-rb-gloss-btn hover:brightness-110 transition"
                    >
                      View Pro Plans
                    </a>
                  </div>
                )}
                {subscription && (
                  <div className="mt-4 rounded-xl border border-slate-800/80 bg-slate-900/90 p-3 text-xs">
                    <p className="text-[11px] font-semibold text-emerald-300 mb-1">
                      Your plan
                    </p>
                    <p className="text-[13px] font-medium text-slate-100">
                      {planLabel}
                    </p>
                    {subExpiresAt && subscription.planId !== 'free' ? (
                      <p className="mt-1 text-[11px] text-slate-400">
                        {subscription.autoRenew !== false ? 'Renews on ' : 'Expires on '}
                        <span className="font-medium text-slate-200">
                          {subExpiresAt.toLocaleDateString()}
                        </span>
                        {subDaysRemaining !== null && subDaysRemaining >= 0 && (
                          <span className="ml-1 text-slate-500">
                            (
                            {subDaysRemaining === 0
                              ? 'today'
                              : `in ${subDaysRemaining} day${
                                  subDaysRemaining === 1 ? '' : 's'
                                }`}
                            )
                          </span>
                        )}
                      </p>
                    ) : (
                      <p className="mt-1 text-[11px] text-slate-400">
                        Free tier · upgrade to unlock more uploads, analytics and boosted
                        promo.
                      </p>
                    )}
                    <div className="mt-2 flex flex-wrap gap-2">
                      <a
                        href="/producer/pro"
                        className="rounded-full bg-emerald-500 px-3 py-1.5 text-[11px] font-semibold text-slate-950 hover:bg-emerald-400"
                      >
                        View plans
                      </a>
                      <a
                        href={`/subscribe/${subscription.planId || 'starter'}`}
                        className="rounded-full border border-slate-700/70 bg-slate-800/80 px-3 py-1.5 text-[11px] font-medium text-slate-200 hover:border-emerald-400/70"
                      >
                        Manage billing
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-8 rounded-2xl border border-white/10 bg-black/70 bg-rb-gloss-stripes bg-blend-soft-light p-4 shadow-rb-gloss-panel">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-100">Performance</h2>
                <p className="text-[11px] text-slate-400">
                  See how your catalog trends over time.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 text-[10px]">
                <select
                  value={metricKind}
                  onChange={(e) => setMetricKind(e.target.value)}
                  className="rounded-full border border-slate-700/70 bg-slate-900/80 px-3 py-1 text-slate-100"
                >
                  <option value="plays">Plays</option>
                  <option value="followers">Followers</option>
                  <option value="likes">Likes</option>
                  <option value="sales">Sales</option>
                </select>
                <select
                  value={rangeKey}
                  onChange={(e) => setRangeKey(e.target.value)}
                  className="rounded-full border border-slate-700/70 bg-slate-900/80 px-3 py-1 text-slate-100"
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
                      className="rounded-full border border-slate-700/70 bg-slate-900/80 px-3 py-1 text-slate-100"
                    />
                    <input
                      type="date"
                      value={customTo}
                      onChange={(e) => setCustomTo(e.target.value)}
                      className="rounded-full border border-slate-700/70 bg-slate-900/80 px-3 py-1 text-slate-100"
                    />
                  </>
                )}
              </div>
            </div>
            <div className="mt-4">
              {metricLoading ? (
                <p className="text-[11px] text-slate-500">Loading chart...</p>
              ) : metricSeries.length === 0 ? (
                <p className="text-[11px] text-slate-500">
                  No data for this metric and date range yet.
                </p>
              ) : (
                <PerformanceChart data={metricSeries} />
              )}
            </div>
          </div>

          <div className="mt-10 rounded-2xl border border-slate-800/80 bg-slate-900/80 p-4 shadow-rb-gloss-panel">
            <div className="flex items-center justify-between gap-3 mb-3">
              <h2 className="text-sm font-semibold text-slate-100">Your Beat Catalog</h2>
              <a
                href="/producer/upload"
                className="rounded-full bg-emerald-500 px-4 py-1.5 text-[11px] font-semibold text-slate-950 hover:bg-emerald-400 transition"
              >
                Upload Beat
              </a>
            </div>
            {beatsLoading && (
              <p className="text-[11px] text-slate-500">Loading your beats...</p>
            )}
            {!beatsLoading && myBeats.length === 0 && (
              <p className="text-[11px] text-slate-500">
                You haven&apos;t uploaded any beats yet. Upload your first beat to start building your
                catalog.
              </p>
            )}
              {!beatsLoading && myBeats.length > 0 && (
                <div className="mt-3 grid gap-4 md:grid-cols-3 sm:grid-cols-2">
                  {myBeats.slice(0, 6).map((b) => (
                    <div key={b.id} className="space-y-2">
                      <BeatCard
                        id={b.id}
                        title={b.title}
                        producer={b.producer || displayName}
                        userId={b.userId || user.id}
                        genre={b.genre}
                        bpm={b.bpm}
                        price={Number(b.price) || 0}
                        coverUrl={b.coverUrl}
                        audioUrl={b.audioUrl}
                        freeDownload={b.freeDownload}
                        initialLikes={b.likes || 0}
                        initialFavs={b.favs || 0}
                        initialFollowers={0}
                        compact
                      />
                      <div className="flex flex-wrap items-center gap-2 text-[10px]">
                        <button
                          type="button"
                          onClick={() => boostBeat(b.id)}
                          className="rounded-full bg-red-500 px-3 py-1 text-[10px] font-semibold text-slate-50 hover:bg-red-400"
                        >
                          Boost beat
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingBeat(b)}
                          className="rounded-full border border-slate-700/80 px-3 py-1 text-[10px] font-medium text-slate-200 hover:border-emerald-400/70 hover:text-emerald-200"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => removeBeat(b.id)}
                          className="rounded-full border border-slate-700/80 px-3 py-1 text-[10px] font-medium text-slate-300 hover:border-red-400/70 hover:text-red-200"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
          </div>

          {subscription?.planId === 'pro' && (
            <div className="mt-6 rounded-2xl border border-white/10 bg-black/70 bg-rb-gloss-stripes bg-blend-soft-light p-4 shadow-rb-gloss-panel">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div>
                  <h2 className="text-sm font-semibold text-slate-100">Your Soundkits</h2>
                  <p className="text-[11px] text-slate-400">
                    Upload drum kits, loop packs and sample folders as part of Producer Pro.
                  </p>
                </div>
                <a
                  href="/producer/soundkits"
                  className="rounded-full bg-white px-4 py-1.5 text-[11px] font-semibold text-slate-950 shadow-rb-gloss-btn hover:bg-slate-100"
                >
                  Upload Soundkit
                </a>
              </div>
              <p className="text-[11px] text-slate-500">
                Soundkit management will show here once you start uploading packs.
              </p>
            </div>
          )}

          <ProfileShareModal
            open={shareOpen}
            onClose={() => setShareOpen(false)}
            profileType="producer"
            profileId={user.id}
            displayName={displayName}
          />

          {deleteConfirm.open && (
            <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 px-4">
              <div className="w-full max-w-sm rounded-2xl border border-slate-800/80 bg-slate-950/95 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.85)]">
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-red-400">
                  Delete beat
                </p>
                <h3 className="mt-2 text-sm font-semibold text-slate-50">
                  Are you sure you want to delete{' '}
                  <span className="text-red-400">{deleteConfirm.title}</span>?
                </h3>
                <p className="mt-2 text-[11px] text-slate-400">
                  This will remove the beat from your catalog and from the marketplace.
                  This action can&apos;t be undone.
                </p>
                <div className="mt-4 flex flex-wrap justify-end gap-2 text-[11px]">
                  <button
                    type="button"
                    onClick={() =>
                      setDeleteConfirm({ open: false, beatId: null, title: '' })
                    }
                    className="rounded-full border border-slate-700/80 px-4 py-1.5 font-medium text-slate-200 hover:bg-slate-800/80"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={confirmDeleteBeat}
                    className="rounded-full bg-red-500 px-4 py-1.5 font-semibold text-slate-50 shadow-[0_0_25px_rgba(248,113,113,0.7)] hover:bg-red-400"
                  >
                    Yes, delete beat
                  </button>
                </div>
              </div>
            </div>
          )}

          {editingBeat && (
            <EditBeatModal
              beat={editingBeat}
              onClose={() => setEditingBeat(null)}
              onSave={handleSaveEdit}
            />
          )}
        </div>
      </section>
    </ProducerLayout>
  )
}

function StatCard({ label, value, children }) {
  return (
    <div className="rounded-2xl border border-slate-800/80 bg-slate-900/80 p-4 flex flex-col shadow-rb-gloss-panel">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="mt-1 text-lg font-semibold text-rb-trop-cyan">{value}</p>
      {children && <div className="mt-auto">{children}</div>}
    </div>
  )
}

function MiniMetric({ label, value }) {
  return (
    <div className="rounded-lg border border-slate-800/60 bg-slate-900/60 p-2 flex flex-col">
      <span className="text-[9px] text-slate-400 uppercase tracking-wide">
        {label}
      </span>
      <span className="mt-1 text-[11px] font-semibold text-emerald-300">
        {value}
      </span>
    </div>
  )
}

function likesPerBeat(beats) {
  if (!beats.length) return 0
  return (
    beats.reduce((sum, b) => sum + (b.likes || Math.random() * 5), 0) /
    beats.length
  )
}
function favsRatio(beats) {
  if (!beats.length) return 0
  return (
    beats.reduce((sum, b) => sum + (b.favs || Math.random() * 3), 0) /
    Math.max(1, beats.length)
  )
}
function suggestTags(beats) {
  const genres = new Set()
  const words = new Map()
  beats.slice(0, 25).forEach((b) => {
    if (b.genre) genres.add(b.genre.toLowerCase())
    b.title.split(/\s+/).forEach((w) => {
      const key = w.toLowerCase().replace(/[^a-z0-9]/g, '')
      if (!key || key.length < 3) return
      words.set(key, (words.get(key) || 0) + 1)
    })
  })
  const topWords = [...words.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map((e) => e[0])
  return [...genres].slice(0, 4).concat(topWords)
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

function PerformanceChart({ data }) {
  const width = 520
  const height = 160
  const paddingX = 24
  const paddingY = 16
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
      aria-label="Metric over time"
    >
      <defs>
        <linearGradient id="rbMetricLine" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor="#22c55e" />
          <stop offset="100%" stopColor="#f97316" />
        </linearGradient>
        <linearGradient id="rbMetricFill" x1="0" x2="0" y1="0" y2="1">
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
          fill="url(#rbMetricFill)"
          stroke="none"
        />
      )}
      {/* Line */}
      {data.length > 0 && (
        <polyline
          fill="none"
          stroke="url(#rbMetricLine)"
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

function EditBeatModal({ beat, onClose, onSave }) {
  const [title, setTitle] = useState(beat?.title || '')
  const [bpm, setBpm] = useState(beat?.bpm || '')
  const [collaborator, setCollaborator] = useState(beat?.collaborator || '')
  const [artworkFile, setArtworkFile] = useState(null)
  const [saving, setSaving] = useState(false)

  if (!beat) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!onSave) return
    setSaving(true)
    try {
      await onSave({
        id: beat.id,
        title: title || beat.title,
        bpm,
        collaborator,
        coverUrl: beat.coverUrl || beat.cover_url || null,
        newArtworkFile: artworkFile,
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-800/80 bg-slate-950/95 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.85)]">
        <h2 className="text-sm font-semibold text-slate-100">Edit beat</h2>
        <p className="mt-1 text-[11px] text-slate-400">
          Update title, BPM, artwork, or add a collaborator.
        </p>
        <form onSubmit={handleSubmit} className="mt-4 space-y-3 text-[11px]">
          <div>
            <label className="font-semibold text-slate-300">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-700/80 bg-slate-900/80 px-3 py-2 text-[11px] text-slate-100 focus:border-emerald-400/70 focus:outline-none"
            />
          </div>
          <div>
            <label className="font-semibold text-slate-300">BPM</label>
            <input
              type="number"
              value={bpm}
              onChange={(e) => setBpm(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-700/80 bg-slate-900/80 px-3 py-2 text-[11px] text-slate-100 focus:border-emerald-400/70 focus:outline-none"
            />
          </div>
          <div>
            <label className="font-semibold text-slate-300">Collaborator</label>
            <input
              value={collaborator}
              onChange={(e) => setCollaborator(e.target.value)}
              placeholder="Optional co-producer or beat maker"
              className="mt-1 w-full rounded-lg border border-slate-700/80 bg-slate-900/80 px-3 py-2 text-[11px] text-slate-100 focus:border-emerald-400/70 focus:outline-none"
            />
          </div>
          <div>
            <label className="font-semibold text-slate-300">Artwork</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setArtworkFile(e.target.files?.[0] || null)}
              className="mt-1 block w-full text-[11px] text-slate-300"
            />
            <p className="mt-1 text-[10px] text-slate-500">
              Leave empty to keep current artwork.
            </p>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-slate-700/80 px-4 py-1.5 text-[11px] font-medium text-slate-200 hover:bg-slate-800/80"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-full bg-emerald-500 px-4 py-1.5 text-[11px] font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

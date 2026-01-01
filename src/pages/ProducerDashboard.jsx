import { Link, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import ProducerLayout from '../components/ProducerLayout'
import ProfileShareModal from '../components/ProfileShareModal'
import { BeatCard } from '../components/BeatCard'
import useSupabaseUser from '../hooks/useSupabaseUser'
import useUserProfile from '../hooks/useUserProfile'
import BackButton from '../components/BackButton'
import { slugify } from '../utils/slugify'
import { computeProducerEarnings } from '../services/beatsService'
import {
  loadPlayCountsForBeats,
} from '../services/analyticsService'
import { listUserPayouts, cancelPayout, createPayout } from '../services/payoutsRepository'
import { useSales } from '../hooks/useSales'
import { useBeats } from '../hooks/useBeats'
import { followerCount, fetchFollowerProfiles } from '../services/socialService'
import { getSubscription } from '../services/subscriptionService'
import { queryJobRequests } from '../services/serviceJobRequestsService'
import { fetchProducerMetrics } from '../services/producerMetricsService'
import { createBeat, deleteBeat as deleteBeatRemote } from '../services/beatsRepository'
import { listSoundkitsForUser } from '../services/soundkitsRepository'
import { uploadArtwork, uploadBundle, uploadFeedAttachment } from '../services/storageService'
import { createPost } from '../services/feedService'
import { getCollaboratorWallet, listCollaboratorSplitEntries } from '../services/collabEarningsService'
import ChatWidget from '../components/ChatWidget'

const GENRES = [
  'Dancehall',
  'Trap Dancehall',
  'Reggae',
  'Afrobeat',
  'Soca',
  'Trap',
  'Hip Hop',
  'Drill',
]

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
  const [playCounts, setPlayCounts] = useState({})
  const [statusText, setStatusText] = useState('')
  const [statusUploading, setStatusUploading] = useState(false)
  const [statusAttachment, setStatusAttachment] = useState(null)
  const [statusEmojiOpen, setStatusEmojiOpen] = useState(false)
  const [chatCollapsed, setChatCollapsed] = useState(false)
  const [chatUnread, setChatUnread] = useState(0)
  const [collabWallet, setCollabWallet] = useState(0)
  const [collabSplits, setCollabSplits] = useState([])
  const [collabLoading, setCollabLoading] = useState(false)
  const [collabPayoutOpen, setCollabPayoutOpen] = useState(false)
  const [collabMethodType, setCollabMethodType] = useState('paypal')
  const [collabPaypalEmail, setCollabPaypalEmail] = useState('')
  const [collabPayoutSubmitting, setCollabPayoutSubmitting] = useState(false)
  const [collabPayoutAmount, setCollabPayoutAmount] = useState('')
  const [collabToast, setCollabToast] = useState('')

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

  // Load collaborator wallet and recent split entries
  useEffect(() => {
    let active = true
    ;(async () => {
      if (!user) {
        if (active) {
          setCollabWallet(0)
          setCollabSplits([])
        }
        return
      }
      setCollabLoading(true)
      try {
        const [wallet, splits] = await Promise.all([
          getCollaboratorWallet(user.id),
          listCollaboratorSplitEntries(user.id, { limit: 10 }),
        ])
        if (!active) return
        setCollabWallet(wallet || 0)
        setCollabSplits(Array.isArray(splits) ? splits : [])
      } finally {
        if (active) setCollabLoading(false)
      }
    })()
    return () => {
      active = false
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

  // Load aggregated play counts for this producer's beats from Supabase metrics.
  useEffect(() => {
    const ids = managedBeats.map((b) => b.id).filter(Boolean)
    if (!ids.length) {
      setPlayCounts({})
      return
    }
    let active = true
    ;(async () => {
      const totals = await loadPlayCountsForBeats(ids)
      if (active) setPlayCounts(totals || {})
    })()
    return () => {
      active = false
    }
  }, [managedBeats])

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

  const [earnings, setEarnings] = useState(0)

  useEffect(() => {
    let active = true
    ;(async () => {
      if (!user) {
        if (active) setEarnings(0)
        return
      }
      const gross = await computeProducerEarnings({
        userId: user.id,
        displayName: user.email,
      })
      if (active) setEarnings(gross || 0)
    })()
    return () => {
      active = false
    }
  }, [user])

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

  const grossProducer = earnings
  const myBeats = managedBeats
  const beatIds = myBeats.map((b) => b.id)
  const totalPlays = beatIds.reduce(
    (sum, id) => sum + (playCounts[id] || 0),
    0,
  )
  const avgPlays = beatIds.length ? totalPlays / beatIds.length : 0
  const top3 = beatIds
    .map((id) => ({
      id,
      plays: playCounts[id] || 0,
    }))
    .filter((b) => b.plays > 0)
    .sort((a, b) => b.plays - a.plays)
    .slice(0, 3)
  const likesTotal = myBeats.reduce((sum, b) => sum + (b.likes || 0), 0)
  const favsTotal = myBeats.reduce((sum, b) => sum + (b.favs || 0), 0)
  const completedTotal = payouts
    .filter((p) => p.status === 'completed')
    .reduce((sum, p) => sum + p.amount, 0)
  const pendingTotal = payouts
    .filter((p) => p.status === 'pending')
    .reduce((sum, p) => sum + p.amount, 0)
  const availableBalance = Math.max(0, grossProducer - completedTotal - pendingTotal)
  const monthSales = sales.filter((s) => {
    if (!s.createdAt) return false
    const d = new Date(s.createdAt)
    const now = new Date()
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
  }).length

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

  const handleStatusEmojiSelect = (emoji) => {
    setStatusText((prev) => (prev || '') + emoji)
    setStatusEmojiOpen(false)
  }

  const handleStatusFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !user) return
    setStatusUploading(true)
    try {
      const { publicUrl } = await uploadFeedAttachment(file)
      if (!publicUrl) throw new Error('Unable to generate file URL.')
      setStatusAttachment({
        url: publicUrl,
        type: file.type || 'file',
        name: file.name,
      })
    } catch (err) {
      alert(err.message || 'Failed to upload attachment.')
    } finally {
      setStatusUploading(false)
      if (e.target) e.target.value = ''
    }
  }

  const handlePostStatus = async (e) => {
    e.preventDefault()
    if (!user) return
    if (!statusText.trim() && !statusAttachment) return
    setStatusUploading(true)
    try {
      await createPost({
        userId: user.id,
        content: statusText.trim(),
        attachmentUrl: statusAttachment?.url || null,
        attachmentType: statusAttachment?.type || null,
        attachmentName: statusAttachment?.name || null,
      })
      setStatusText('')
      setStatusAttachment(null)
    } catch (err) {
      alert(err.message || 'Failed to post update.')
    } finally {
      setStatusUploading(false)
    }
  }

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
      const targetId = deleteConfirm.beatId
      const ok = await deleteBeatRemote(targetId)
      if (ok) {
        setManagedBeats((prev) => prev.filter((b) => b.id !== targetId))
      }
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
      let bundleUrl = updated.bundleUrl || null
      let bundleName = updated.bundleName || null

      if (updated.newArtworkFile) {
        const { publicUrl } = await uploadArtwork(updated.newArtworkFile)
        coverUrl = publicUrl
      }

      if (updated.newBundleFile) {
        const { publicUrl, key } = await uploadBundle(updated.newBundleFile)
        bundleUrl = publicUrl
        bundleName = updated.newBundleFile.name || key || null
      }

      const licensePrices = updated.licensePrices || null

      const payload = {
        id: updated.id,
        user_id: user.id,
        title: updated.title,
        description: updated.description || null,
        genre: updated.genre || null,
        bpm: updated.bpm ? Number(updated.bpm) : null,
        price: updated.price ? Number(updated.price) : null,
        musical_key: updated.musicalKey || null,
        cover_url: coverUrl,
        collaborator: updated.collaborator || null,
        bundle_url: bundleUrl,
        bundle_name: bundleName,
        license_prices: licensePrices,
        free_download: !!updated.freeDownload,
      }

      // Persist to Supabase (upsert), but update UI state from the
      // merged view-model so changes are always reflected immediately.
      const saved = await createBeat(payload)
      const targetId = saved && saved.id ? saved.id : updated.id

      setManagedBeats((prev) =>
        prev.map((b) =>
          b.id === targetId
            ? {
                ...b,
                title: updated.title || b.title,
                description: updated.description || '',
                genre: updated.genre || b.genre,
                bpm: updated.bpm ? Number(updated.bpm) : b.bpm,
                price: updated.price ? Number(updated.price) : b.price,
                musicalKey: updated.musicalKey || b.musicalKey,
                coverUrl: coverUrl || b.coverUrl,
                bundleUrl: bundleUrl || b.bundleUrl,
                bundleName: bundleName || b.bundleName,
                collaborator: updated.collaborator || b.collaborator,
                licensePrices: licensePrices || b.licensePrices,
                freeDownload: !!updated.freeDownload,
              }
            : b,
        ),
      )
    } finally {
      setEditingBeat(null)
    }
  }

  return (
    <ProducerLayout>
        <section className="bg-slate-950/95 overflow-x-hidden">
          <div className="mx-auto max-w-6xl px-3 py-6 sm:px-4 sm:py-8 overflow-x-hidden">
            <div className="rb-panel sticky top-0 z-10 bg-slate-950/95 py-2">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
                <div className="flex flex-wrap items-center gap-2 text-[11px]">
                  <a
                    href="/producer/upload"
                    className="rounded-full bg-emerald-500 px-4 py-1.5 font-semibold text-slate-950 shadow-rb-gloss-btn hover:bg-emerald-400"
                  >
                    Upload New Beat
                  </a>
                  <a
                    href="/producer/licenses"
                    className="rounded-full border border-slate-700/80 bg-slate-900/80 px-4 py-1.5 font-medium text-slate-100 hover:border-emerald-400/70"
                  >
                    Manage Licenses
                  </a>
                  <a
                    href="/producer/withdraw"
                    className="rounded-full border border-slate-700/80 bg-slate-900/80 px-4 py-1.5 font-medium text-slate-100 hover:border-emerald-400/70"
                  >
                    Withdraw Earnings
                  </a>
                </div>
              </div>
              {/* Sticky summary stats on desktop */}
              <div className="mt-4 hidden gap-4 lg:grid lg:grid-cols-4">
                <StatCard label="Total earnings" value={`$${earnings.toFixed(2)}`} />
                <StatCard
                  label="Available balance"
                  value={`$${availableBalance.toFixed(2)}`}
                />
                <StatCard label="Beats in catalog" value={myBeats.length} />
                <StatCard label="Monthly sales" value={monthSales} />
              </div>
            </div>

            {/* What's happening panel */}
            <div className="mt-5 grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-slate-800/80 bg-slate-900/80 p-4 shadow-rb-gloss-panel">
                <h2 className="text-sm font-semibold text-slate-100">
                  Share an update
                </h2>
                <p className="mt-1 text-[11px] text-slate-400">
                  Let followers know what you&apos;re working on — new riddims, placements,
                  studio sessions or releases.
                </p>
                <form onSubmit={handlePostStatus} className="mt-3 space-y-3 text-[11px]">
                  <div className="flex items-start gap-2">
                    <div className="mt-1 flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-[11px] font-semibold text-slate-200">
                      {(profile?.displayName || user.email)
                        .slice(0, 2)
                        .toUpperCase()}
                    </div>
                    <div className="flex-1 rounded-2xl border border-slate-800/80 bg-slate-950/80 px-3 py-2">
                      <textarea
                        value={statusText}
                        onChange={(e) => setStatusText(e.target.value)}
                        rows={3}
                        placeholder="What are you working on today? New beat drop, placements, studio updates..."
                        className="w-full resize-none bg-transparent text-[11px] text-slate-100 placeholder:text-slate-500 focus:outline-none"
                      />
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setStatusEmojiOpen((v) => !v)}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-[13px] text-slate-400 hover:text-emerald-300"
                            aria-label="Add emoji"
                          >
                            😊
                          </button>
                          <label className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-slate-900 text-slate-400 hover:text-emerald-300">
                            📎
                            <input
                              type="file"
                              className="hidden"
                              accept="image/*,video/*,audio/*,application/pdf,application/zip"
                              onChange={handleStatusFileChange}
                            />
                          </label>
                          {statusAttachment && (
                            <span className="truncate text-[10px] text-slate-400">
                              {statusAttachment.name}
                            </span>
                          )}
                        </div>
                        <button
                          type="submit"
                          disabled={statusUploading || (!statusText.trim() && !statusAttachment)}
                          className="inline-flex items-center rounded-full bg-red-500 px-4 py-1.5 text-[11px] font-semibold text-slate-50 hover:bg-red-400 disabled:opacity-40"
                        >
                          {statusUploading ? 'Posting…' : 'Post update'}
                        </button>
                      </div>
                      {statusEmojiOpen && (
                        <div className="mt-2 inline-flex flex-wrap gap-1 rounded-xl border border-slate-800/80 bg-slate-950/95 p-2 shadow-xl">
                          {['🔥', '🎧', '🎶', '🥁', '📀', '📝', '🚀', '💼', '💿', '🎹'].map(
                            (emoji) => (
                              <button
                                key={emoji}
                                type="button"
                                onClick={() => handleStatusEmojiSelect(emoji)}
                                className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-900 hover:bg-slate-800"
                              >
                                {emoji}
                              </button>
                            ),
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </form>
              </div>

              <div className="rounded-2xl border border-slate-800/80 bg-slate-900/80 p-4 text-[11px] text-slate-300 shadow-rb-gloss-panel">
                <h2 className="text-sm font-semibold text-slate-100">
                  Tips for strong updates
                </h2>
                <ul className="mt-2 space-y-1.5">
                  <li>• Share behind-the-scenes clips of beats in progress.</li>
                  <li>• Announce new uploads and link the beat in your bio.</li>
                  <li>• Shout out artists, collaborators and recent placements.</li>
                  <li>• Use visuals — cover art, studio photos, short videos.</li>
                </ul>
              </div>
              {/* Sidebar column: followers + direct messages */}
              <div className="space-y-4">
                <div className="rounded-2xl border border-slate-800/70 bg-slate-900/80 p-4">
                  <p className="text-sm font-semibold text-slate-100">Followers</p>
                  <p className="mt-1 text-[12px] text-slate-300">{followers} followers</p>
                </div>
                <div className="rounded-2xl border border-slate-800/70 bg-slate-900/80">
                  <div className="flex items-center justify-between gap-2 p-4">
                    <p className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                      Chat
                      {chatUnread > 0 && (
                        <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-emerald-500 px-1 text-[10px] font-semibold text-slate-950">
                          {chatUnread}
                        </span>
                      )}
                    </p>
                    <button
                      type="button"
                      onClick={() => setChatCollapsed((v) => {
                        const next = !v
                        if (!next) {
                          // Panel is being expanded; clear unread count
                          setChatUnread(0)
                        }
                        return next
                      })}
                      className="rounded-full border border-slate-700/70 bg-slate-800/70 px-3 py-1 text-[10px] text-slate-200 hover:bg-slate-700/70"
                    >
                      {chatCollapsed ? 'Expand' : 'Collapse'}
                    </button>
                  </div>
                  {!chatCollapsed && (
                    <div className="p-4 pt-0">
                      <ChatWidget
                        recipientExternal={null}
                        onIncomingMessage={(m) => {
                          // Only count messages not sent by the current user
                          if (user && m && m.sender_id !== user.id) {
                            setChatUnread((c) => c + 1)
                          }
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 overflow-x-hidden lg:hidden">
            <StatCard label="Total earnings" value={`$${earnings.toFixed(2)}`} />
            <StatCard
              label="Available balance"
              value={`$${availableBalance.toFixed(2)}`}
            />
            <StatCard label="Beats in catalog" value={myBeats.length} />
            <StatCard label="Monthly sales" value={monthSales} />
          </div>

          <div className="mt-6 grid gap-6 md:grid-cols-2 overflow-x-hidden">
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

          <div className="mt-8 grid gap-6 lg:grid-cols-[1.4fr,1fr] overflow-x-hidden">
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
              <h2 className="text-sm font-semibold text-slate-100">Monetization &amp; Payouts</h2>
              <ul className="mt-3 space-y-2 text-xs text-slate-300">
                <li>• Upload more beats to increase catalog depth.</li>
                <li>• Configure payout methods and withdraw earnings regularly.</li>
                <li>• Monitor pending withdrawals and collab wallet to manage cash flow.</li>
                <li>• Experiment with boosts and jobs to grow reach.</li>
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
                      href="/subscribe/pro?kind=producer"
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
              <div className="mt-4 rounded-xl border border-slate-800/80 bg-slate-900/90 p-4 text-xs">
                <h3 className="text-[11px] font-semibold text-slate-100 mb-1">Storefront</h3>
                <p className="text-[11px] text-slate-400 mb-3">
                  Customize how your public producer store looks and quickly preview it as artists see it.
                </p>
                <div className="flex flex-wrap gap-2">
                  <a
                    href={`/profile/edit`}
                    className="rounded-full border border-slate-700/80 bg-slate-800/80 px-3 py-1.5 text-[11px] font-medium text-slate-200 hover:border-emerald-400/70"
                  >
                    Edit branding &amp; socials
                  </a>
                  <a
                    href={`/producer/${user.id}/store`}
                    className="rounded-full bg-emerald-500 px-3 py-1.5 text-[11px] font-semibold text-slate-950 hover:bg-emerald-400"
                  >
                    Preview storefront
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Collab Splits: wallet + recent entries */}
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-800/80 bg-slate-900/80 p-4 shadow-rb-gloss-panel">
              <h2 className="text-sm font-semibold text-slate-100">Collab Splits</h2>
              <p className="mt-1 text-[11px] text-slate-400">Your collaborator wallet balance.</p>
              {collabToast && (
                <div className="mt-2 rounded-lg border border-emerald-400/40 bg-emerald-500/10 p-2 text-[11px] text-emerald-300">
                  {collabToast}
                </div>
              )}
              <div className="mt-3">
                <div className="rounded-xl border border-slate-800/80 bg-slate-950/80 p-4 flex items-center justify-between">
                  <p className="text-xs text-slate-400">Wallet Balance</p>
                  <p className="text-lg font-semibold text-emerald-300">${collabWallet.toFixed(2)}</p>
                </div>
                <div className="mt-3">
                  <button
                    type="button"
                    disabled={collabWallet <= 0}
                    onClick={() => {
                      setCollabPayoutAmount(String(collabWallet.toFixed(2)))
                      setCollabPayoutOpen(true)
                    }}
                    className="w-full rounded-full bg-emerald-500 px-4 py-2 text-[12px] font-semibold text-slate-950 disabled:opacity-40"
                  >
                    Request Payout
                  </button>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-800/80 bg-slate-900/80 p-4 shadow-rb-gloss-panel">
              <h2 className="text-sm font-semibold text-slate-100">Recent Split Entries</h2>
              <div className="mt-3 space-y-2 text-xs text-slate-300">
                {collabLoading && (
                  <p className="text-[11px] text-slate-500">Loading entries…</p>
                )}
                {!collabLoading && collabSplits.map((e) => {
                  const beatTitle = beats.find((b) => b.id === e.beat_id)?.title || 'Beat'
                  const dt = e.timestamp ? new Date(e.timestamp) : null
                  const dateStr = dt ? dt.toLocaleDateString() : ''
                  return (
                    <div key={`${e.collaborator_id}-${e.beat_id}-${e.timestamp || ''}`} className="flex items-center justify-between rounded-xl border border-slate-800/80 bg-slate-950/80 p-3">
                      <div>
                        <p className="font-semibold text-slate-100">{beatTitle}</p>
                        <p className="text-[11px] text-slate-400">{dateStr}</p>
                      </div>
                      <p className="font-semibold text-emerald-400">${Number(e.amount_earned || 0).toFixed(2)}</p>
                    </div>
                  )
                })}
                {!collabLoading && collabSplits.length === 0 && (
                  <p className="text-[11px] text-slate-500">No split earnings yet.</p>
                )}
              </div>
            </div>
          </div>

          {collabPayoutOpen && (
            <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 px-4">
              <div className="w-full max-w-sm rounded-2xl border border-slate-800/80 bg-slate-950/95 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.85)] text-[12px]">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-100">Request Collab Payout</h3>
                  <button
                    type="button"
                    onClick={() => setCollabPayoutOpen(false)}
                    className="text-[16px] leading-none text-slate-500 hover:text-slate-300"
                  >
                    ×
                  </button>
                </div>
                <div className="mt-3 space-y-3">
                  <div>
                    <label className="text-[10px] font-semibold text-slate-400">Amount (USD)</label>
                    <input
                      value={collabPayoutAmount}
                      onChange={(e) => setCollabPayoutAmount(e.target.value)}
                      placeholder={String(collabWallet.toFixed(2))}
                      className="mt-1 w-full rounded-lg border border-slate-700/70 bg-slate-900/80 px-3 py-2 text-[12px] text-slate-100"
                    />
                    <p className="mt-1 text-[10px] text-slate-500">Max: ${collabWallet.toFixed(2)}</p>
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-400">Method</label>
                    <select
                      value={collabMethodType}
                      onChange={(e) => setCollabMethodType(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-700/70 bg-slate-900/80 px-3 py-2 text-[12px] text-slate-100"
                    >
                      <option value="paypal">PayPal</option>
                    </select>
                  </div>
                  {collabMethodType === 'paypal' && (
                    <div>
                      <label className="text-[10px] font-semibold text-slate-400">PayPal Email</label>
                      <input
                        value={collabPaypalEmail}
                        onChange={(e) => setCollabPaypalEmail(e.target.value)}
                        placeholder="you@paypal.com"
                        className="mt-1 w-full rounded-lg border border-slate-700/70 bg-slate-900/80 px-3 py-2 text-[12px] text-slate-100"
                      />
                    </div>
                  )}
                </div>
                <div className="mt-4 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setCollabPayoutOpen(false)}
                    className="rounded-full border border-slate-700/80 px-4 py-1.5 text-[11px] font-medium text-slate-200 hover:bg-slate-800/80"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={collabPayoutSubmitting || !collabPaypalEmail || (parseFloat(collabPayoutAmount) || 0) <= 0 || (parseFloat(collabPayoutAmount) || 0) > collabWallet}
                    onClick={async () => {
                      if (!user) return
                      const amt = parseFloat(collabPayoutAmount)
                      if (!amt || amt <= 0 || amt > collabWallet) return
                      setCollabPayoutSubmitting(true)
                      try {
                        const details = {
                          firstName: user.user_metadata?.display_name || user.email,
                          lastName: '',
                          paypalEmail: collabPaypalEmail,
                          address: {},
                          source: 'collab-wallet'
                        }
                        await createPayout({
                          userId: user.id,
                          amount: amt,
                          currency: 'USD',
                          methodType: 'paypal',
                          methodDetails: JSON.stringify(details)
                        })
                        // Refresh wallet and recent entries
                        const [wallet, splits] = await Promise.all([
                          getCollaboratorWallet(user.id),
                          listCollaboratorSplitEntries(user.id, { limit: 10 }),
                        ])
                        setCollabWallet(wallet || 0)
                        setCollabSplits(Array.isArray(splits) ? splits : [])
                        setCollabToast('Payout request submitted')
                        setTimeout(() => setCollabToast(''), 2500)
                        setCollabPayoutOpen(false)
                      } finally {
                        setCollabPayoutSubmitting(false)
                      }
                    }}
                    className="rounded-full bg-emerald-500 px-4 py-1.5 text-[11px] font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-60"
                  >
                    {collabPayoutSubmitting ? 'Submitting…' : 'Submit Request'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Direct Messages */}
          <div className="mt-8 rounded-2xl border border-slate-800/80 bg-slate-900/80 p-4 shadow-rb-gloss-panel">
            <h2 className="text-sm font-semibold text-slate-100">Direct Messages</h2>
            <p className="mt-1 text-[11px] text-slate-400">Chat with artists and collaborators. Emoji and attachments supported.</p>
            <div className="mt-3">
              <ChatWidget />
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
                <div className="mt-3 max-h-[520px] overflow-y-auto overscroll-y-contain pr-1">
                  <div className="space-y-2">
                    {myBeats.map((b) => (
                      <BeatCatalogRow
                        key={b.id}
                        beat={b}
                        fallbackProducer={displayName}
                        onBoost={() => boostBeat(b.id)}
                        onEdit={() => setEditingBeat(b)}
                        onDelete={() => removeBeat(b.id)}
                      />
                    ))}
                  </div>
                </div>
              )}
          </div>

          {subscription?.planId === 'pro' && (
            <ProducerSoundkitsPanel userId={user.id} />
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

function ProducerSoundkitsPanel({ userId }) {
  const [kits, setKits] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let active = true
    if (!userId) return
    async function load() {
      setLoading(true)
      const rows = await listSoundkitsForUser(userId)
      if (active) {
        setKits(rows)
        setLoading(false)
      }
    }
    load()
    return () => {
      active = false
    }
  }, [userId])

  return (
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
      {loading ? (
        <p className="text-[11px] text-slate-500">Loading your soundkits…</p>
      ) : kits.length === 0 ? (
        <p className="text-[11px] text-slate-500">
          Soundkit management will show here once you start uploading packs.
        </p>
      ) : (
        <div className="mt-2 space-y-2 text-[11px]">
          {kits.slice(0, 5).map((kit) => (
            <div
              key={kit.id}
              className="flex items-center justify-between rounded-xl border border-slate-800/80 bg-slate-950/80 px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate font-semibold text-slate-100">{kit.title}</p>
                <p className="truncate text-[10px] text-slate-400">
                  {kit.genre || 'Multi-genre'}
                </p>
              </div>
              <div className="text-right">
                {kit.is_free ? (
                  <p className="text-[11px] font-semibold text-emerald-300">Free</p>
                ) : (
                  <p className="text-[11px] font-semibold text-slate-50">${'{'}kit.price?.toFixed ? kit.price.toFixed(2) : kit.price || 0{'}'}</p>
                )}
                <p className="text-[10px] text-slate-500">
                  {new Date(kit.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          ))}
          {kits.length > 5 && (
            <p className="mt-1 text-[10px] text-slate-500">
              Showing latest 5 packs.
            </p>
          )}
        </div>
      )}
    </div>
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
  const [description, setDescription] = useState(beat?.description || '')
  const initialGenre =
    beat?.genre && GENRES.includes(beat.genre) ? beat.genre : GENRES[0]
  const [genre, setGenre] = useState(initialGenre)
  const [bpm, setBpm] = useState(beat?.bpm || '')
  const [musicalKey, setMusicalKey] = useState(beat?.musicalKey || beat?.musical_key || '')
  const [price, setPrice] = useState(beat?.price || '')
  const [collaborator, setCollaborator] = useState(beat?.collaborator || '')
  const [freeDownload, setFreeDownload] = useState(!!beat?.freeDownload)
  const [artworkFile, setArtworkFile] = useState(null)
  const [bundleFile, setBundleFile] = useState(null)
  const [saving, setSaving] = useState(false)

  const existingPrices = beat?.licensePrices || beat?.license_prices || {}
  const [basicPrice, setBasicPrice] = useState(existingPrices.Basic || beat?.price || '')
  const [premiumPrice, setPremiumPrice] = useState(existingPrices.Premium || '')
  const [unlimitedPrice, setUnlimitedPrice] = useState(existingPrices.Unlimited || '')
  const [exclusivePrice, setExclusivePrice] = useState(existingPrices.Exclusive || '')

  if (!beat) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!onSave) return
    setSaving(true)
    try {
      await onSave({
        id: beat.id,
        title: title || beat.title,
        description,
        genre,
        bpm,
        musicalKey,
        price,
        collaborator,
        freeDownload,
        coverUrl: beat.coverUrl || beat.cover_url || null,
        newArtworkFile: artworkFile,
        newBundleFile: bundleFile,
        bundleUrl: beat.bundleUrl || beat.bundle_url || null,
        bundleName: beat.bundleName || beat.bundle_name || null,
        licensePrices: {
          Basic: basicPrice ? Number(basicPrice) : null,
          Premium: premiumPrice ? Number(premiumPrice) : null,
          Unlimited: unlimitedPrice ? Number(unlimitedPrice) : null,
          Exclusive: exclusivePrice ? Number(exclusivePrice) : null,
        },
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 px-4">
      <div className="w-full max-w-2xl rounded-2xl border border-slate-800/80 bg-slate-950/95 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.85)]">
        <h2 className="text-sm font-semibold text-slate-100">Edit beat details</h2>
        <p className="mt-1 text-[11px] text-slate-400">
          Update metadata, artwork, pricing and stems. Audio file stays the same.
        </p>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-[11px]">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-3">
              <div>
                <label className="font-semibold text-slate-300">Title</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-700/80 bg-slate-900/80 px-3 py-2 text-[11px] text-slate-100 focus:border-emerald-400/70 focus:outline-none"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-300">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-slate-700/80 bg-slate-900/80 px-3 py-2 text-[11px] text-slate-100 placeholder:text-slate-500 focus:border-emerald-400/70 focus:outline-none"
                  placeholder="Mood, vibe, placement suggestions…"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-300">Genre</label>
                  <select
                    value={genre}
                    onChange={(e) => setGenre(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-700/80 bg-slate-900/80 px-3 py-2 text-[11px] text-slate-100 focus:border-emerald-400/70 focus:outline-none"
                  >
                    {GENRES.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-300">Key</label>
                  <input
                    value={musicalKey}
                    onChange={(e) => setMusicalKey(e.target.value)}
                    placeholder="e.g. F#m"
                    className="mt-1 w-full rounded-lg border border-slate-700/80 bg-slate-900/80 px-3 py-2 text-[11px] text-slate-100 focus:border-emerald-400/70 focus:outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
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
                  <label className="font-semibold text-slate-300">Base price</label>
                  <div className="mt-1 flex items-center rounded-lg border border-slate-700/80 bg-slate-900/80 px-3 py-2">
                    <span className="mr-1 text-[10px] text-slate-400">$</span>
                    <input
                      type="number"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      className="w-full bg-transparent text-[11px] text-slate-100 outline-none"
                    />
                  </div>
                </div>
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
              <label className="mt-1 inline-flex items-center gap-2 text-[11px] text-slate-200">
                <input
                  type="checkbox"
                  checked={freeDownload}
                  onChange={(e) => setFreeDownload(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-slate-600 bg-slate-900 text-emerald-400 focus:ring-emerald-500"
                />
                Allow free download
              </label>
            </div>

            <div className="space-y-4">
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
              <div>
                <label className="font-semibold text-slate-300">Stems / bundle</label>
                <input
                  type="file"
                  onChange={(e) => setBundleFile(e.target.files?.[0] || null)}
                  className="mt-1 block w-full text-[11px] text-slate-300"
                />
                <p className="mt-1 text-[10px] text-slate-500">
                  Upload a ZIP of stems or project files. Leave empty to keep existing bundle.
                </p>
                {beat.bundleName && (
                  <p className="mt-1 text-[10px] text-slate-400">
                    Current bundle: <span className="font-medium text-slate-200">{beat.bundleName}</span>
                  </p>
                )}
              </div>
              <div>
                <h3 className="text-[11px] font-semibold text-slate-200">
                  License pricing
                </h3>
                <p className="mt-1 text-[10px] text-slate-500">
                  Set prices per tier. Leave blank to fall back to your base price.
                </p>
                <div className="mt-2 grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-medium text-slate-300">
                      Basic
                    </label>
                    <div className="mt-1 flex items-center rounded-lg border border-slate-700/80 bg-slate-900/80 px-3 py-2">
                      <span className="mr-1 text-[10px] text-slate-400">$</span>
                      <input
                        type="number"
                        value={basicPrice}
                        onChange={(e) => setBasicPrice(e.target.value)}
                        className="w-full bg-transparent text-[11px] text-slate-100 outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-medium text-slate-300">
                      Premium
                    </label>
                    <div className="mt-1 flex items-center rounded-lg border border-slate-700/80 bg-slate-900/80 px-3 py-2">
                      <span className="mr-1 text-[10px] text-slate-400">$</span>
                      <input
                        type="number"
                        value={premiumPrice}
                        onChange={(e) => setPremiumPrice(e.target.value)}
                        className="w-full bg-transparent text-[11px] text-slate-100 outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-medium text-slate-300">
                      Unlimited
                    </label>
                    <div className="mt-1 flex items-center rounded-lg border border-slate-700/80 bg-slate-900/80 px-3 py-2">
                      <span className="mr-1 text-[10px] text-slate-400">$</span>
                      <input
                        type="number"
                        value={unlimitedPrice}
                        onChange={(e) => setUnlimitedPrice(e.target.value)}
                        className="w-full bg-transparent text-[11px] text-slate-100 outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-medium text-slate-300">
                      Exclusive
                    </label>
                    <div className="mt-1 flex items-center rounded-lg border border-slate-700/80 bg-slate-900/80 px-3 py-2">
                      <span className="mr-1 text-[10px] text-slate-400">$</span>
                      <input
                        type="number"
                        value={exclusivePrice}
                        onChange={(e) => setExclusivePrice(e.target.value)}
                        className="w-full bg-transparent text-[11px] text-slate-100 outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
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

function BeatCatalogRow({ beat, fallbackProducer, onBoost, onEdit, onDelete }) {
  const title = beat?.title || 'Untitled Beat'
  const producer = beat?.producer || fallbackProducer || 'Producer'
  const coverUrl = beat?.coverUrl || beat?.cover_url || null
  const slug = slugify(title || '')
  const to = slug ? `/beat/${slug}` : `/beat/${beat.id}`

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-800/80 bg-slate-950/40 px-3 py-2 shadow-[0_10px_30px_rgba(0,0,0,0.55)]">
      <Link to={to} state={{ beat }} className="flex min-w-0 flex-1 items-center gap-3">
        <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-xl bg-slate-800">
          {coverUrl ? (
            <img src={coverUrl} alt={title} className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-[12px] font-semibold text-slate-50">{title}</p>
          <p className="mt-0.5 truncate text-[11px] text-slate-400">{producer}</p>
          <div className="mt-1 flex flex-wrap gap-2 text-[10px] text-slate-500">
            {beat?.bpm ? <span>{beat.bpm} BPM</span> : null}
            {beat?.musicalKey ? <span>{beat.musicalKey}</span> : null}
            {beat?.genre ? <span className="truncate">{beat.genre}</span> : null}
          </div>
        </div>
      </Link>

      <div className="flex flex-shrink-0 items-center gap-2 text-[10px]">
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onBoost?.()
          }}
          className="rounded-full bg-red-500 px-3 py-1 font-semibold text-slate-50 hover:bg-red-400"
        >
          Boost
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onEdit?.()
          }}
          className="rounded-full border border-slate-700/80 px-3 py-1 font-medium text-slate-200 hover:border-emerald-400/70 hover:text-emerald-200"
        >
          Edit
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onDelete?.()
          }}
          className="rounded-full border border-slate-700/80 px-3 py-1 font-medium text-slate-300 hover:border-red-400/70 hover:text-red-200"
        >
          Delete
        </button>
      </div>
    </div>
  )
}

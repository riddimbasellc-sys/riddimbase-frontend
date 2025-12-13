import { useEffect, useMemo, useState } from 'react'
import { BeatCard } from '../components/BeatCard'
import useSupabaseUser from '../hooks/useSupabaseUser'
import { useBeats } from '../hooks/useBeats'
import {
  fetchRepostedBeatIdsForUser,
  fetchProfilesByIds,
} from '../services/socialService'
import { listProviders } from '../services/serviceProvidersService'
import { topBeatsByPlays } from '../services/analyticsService'
import {
  fetchFeedForUser,
  togglePostLike,
  postLikeCount,
  listPostComments,
  addPostComment,
} from '../services/feedService'
import ReportModal from '../components/ReportModal'

function timeAgo(ts) {
  if (!ts) return ''
  const date = typeof ts === 'string' ? new Date(ts) : ts
  const diff = Date.now() - date.getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  const d = Math.floor(h / 24)
  return `${d}d`
}

export default function Feed() {
  const { user } = useSupabaseUser()
  const { beats, loading } = useBeats()

  const [repostFeed, setRepostFeed] = useState([])
  const [suggested, setSuggested] = useState([])
  const [mode, setMode] = useState('following') // 'following' | 'recommended'
  const [repostProfiles, setRepostProfiles] = useState({})
  const [posts, setPosts] = useState([])
  const [postLikes, setPostLikes] = useState({})
  const [postComments, setPostComments] = useState({})
  const [commentDrafts, setCommentDrafts] = useState({})
  const [reportTarget, setReportTarget] = useState(null)

  // Build a quick map of beats by id for lookups
  const beatsById = useMemo(() => {
    const map = new Map()
    beats.forEach((b) => map.set(b.id, b))
    return map
  }, [beats])

  // Load reposted beats from followed producers
  useEffect(() => {
    let active = true
    if (!user) {
      setRepostFeed([])
      setRepostProfiles({})
      return
    }
    ;(async () => {
      try {
        const rows = await fetchRepostedBeatIdsForUser(user.id, { limit: 32 })
        if (!active) return
        const mapped = rows
          .map((r) => {
            const beat = beatsById.get(r.beat_id)
            if (!beat) return null
            return { beat, repostedAt: r.created_at, byUserId: r.user_id }
          })
          .filter(Boolean)

        if (!active) return
        setRepostFeed(mapped)

        const ids = Array.from(
          new Set(mapped.map((m) => m.byUserId).filter(Boolean)),
        )
        if (ids.length) {
          const profRows = await fetchProfilesByIds(ids)
          if (!active) return
          const map = {}
          ;(profRows || []).forEach((p) => {
            map[p.id] = p.display_name || p.email || 'Producer'
          })
          setRepostProfiles(map)
        } else {
          setRepostProfiles({})
        }
      } catch {
        if (active) {
          setRepostFeed([])
          setRepostProfiles({})
        }
      }
    })()
    return () => {
      active = false
    }
  }, [user, beatsById])

  // Simple "who to follow" suggestions based on static providers
  useEffect(() => {
    if (!user) {
      setSuggested([])
      return
    }
    const providers = listProviders()
    const sample = providers.slice(0, 6)
    setSuggested(sample)
  }, [user])

  const hasFeed = repostFeed.length > 0

  const recommendedBeats = useMemo(() => {
    if (!beats.length) return []
    const ids = beats.map((b) => b.id)
    const ranked = topBeatsByPlays(ids, 24)
    const byId = new Map(beats.map((b) => [b.id, b]))
    return ranked.map((r) => byId.get(r.id)).filter(Boolean)
  }, [beats])

  // Load social posts for feed
  useEffect(() => {
    if (!user) {
      setPosts([])
      setPostLikes({})
      setPostComments({})
      return
    }
    let active = true
    ;(async () => {
      const rows = await fetchFeedForUser(user.id, { limit: 40 })
      if (!active) return
      setPosts(rows || [])
      const likeCounts = {}
      for (const p of rows || []) {
        likeCounts[p.id] = await postLikeCount(p.id)
      }
      if (!active) return
      setPostLikes(likeCounts)
    })()
    return () => {
      active = false
    }
  }, [user])

  const handleTogglePostLike = async (postId) => {
    if (!user || !postId) return
    const res = await togglePostLike({ userId: user.id, postId })
    setPostLikes((prev) => {
      const cur = prev[postId] || 0
      return { ...prev, [postId]: res.liked ? cur + 1 : Math.max(0, cur - 1) }
    })
  }

  const handleLoadComments = async (postId) => {
    if (!postId) return
    const rows = await listPostComments(postId)
    setPostComments((prev) => ({ ...prev, [postId]: rows }))
  }

  const handleAddComment = async (postId) => {
    if (!user || !postId) return
    const text = (commentDrafts[postId] || '').trim()
    if (!text) return
    const c = await addPostComment({ postId, userId: user.id, content: text })
    if (c) {
      setPostComments((prev) => ({
        ...prev,
        [postId]: [...(prev[postId] || []), c],
      }))
      setCommentDrafts((prev) => ({ ...prev, [postId]: '' }))
    }
  }

  return (
    <section className="bg-slate-950/95 min-h-screen">
      <div className="mx-auto max-w-6xl px-3 py-6 sm:px-4 sm:py-8">
        {/* Hero / header */}
        <div className="rounded-3xl border border-slate-800/80 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.75)]">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-emerald-300">
                My Feed
              </p>
              <h1 className="mt-1 text-2xl font-semibold text-slate-50 sm:text-3xl">
                Stay close to the producers you follow.
              </h1>
              <p className="mt-2 max-w-2xl text-[11px] text-slate-300 sm:text-xs">
                See reposts, featured beats and activity from your circle. Switch to recommended to
                discover trending Caribbean beats tailored to you.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 md:justify-end">
              <button
                type="button"
                onClick={() => setMode('following')}
                className={`rounded-full px-4 py-1.5 text-[11px] font-semibold transition ${
                  mode === 'following'
                    ? 'bg-emerald-500 text-slate-950 shadow-[0_0_30px_rgba(16,185,129,0.6)]'
                    : 'border border-slate-700/80 bg-slate-900/80 text-slate-200 hover:border-emerald-400/70'
                }`}
              >
                Following
              </button>
              <button
                type="button"
                onClick={() => setMode('recommended')}
                className={`rounded-full px-4 py-1.5 text-[11px] font-semibold transition ${
                  mode === 'recommended'
                    ? 'bg-red-500 text-slate-50 shadow-[0_0_30px_rgba(248,113,113,0.6)]'
                    : 'border border-slate-700/80 bg-slate-900/80 text-slate-200 hover:border-red-400/70'
                }`}
              >
                Recommended
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-6 md:flex-row">
          <div className="min-w-0 flex-1 space-y-4">
            {user && posts.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-sm font-semibold text-slate-100">
                  Latest updates
                </h2>
                <div className="space-y-3">
                  {posts.map((p) => (
                    <div
                      key={p.id}
                      className="rounded-2xl border border-slate-800/80 bg-slate-900/80 p-3 text-[11px] text-slate-200"
                    >
                      <div className="flex items-start gap-2">
                        <a
                          href={`/producer/${p.userId}`}
                          className="mt-0.5 flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-slate-800 text-[11px] font-semibold text-slate-100"
                        >
                          {p.avatarUrl ? (
                            <img
                              src={p.avatarUrl}
                              alt={p.displayName}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            (p.displayName || 'RB')
                              .slice(0, 2)
                              .toUpperCase()
                          )}
                        </a>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <a
                                href={`/producer/${p.userId}`}
                                className="truncate text-[11px] font-semibold text-slate-100 hover:text-emerald-300"
                              >
                                {p.displayName}
                              </a>
                              <p className="text-[10px] text-slate-500">
                                {timeAgo(p.createdAt)}
                              </p>
                            </div>
                          </div>
                          {p.content && (
                            <p className="mt-2 whitespace-pre-wrap text-[11px] text-slate-200">
                              {p.content}
                            </p>
                          )}
                          {p.attachmentUrl && (
                            <div className="mt-2">
                              {p.attachmentType?.startsWith('image/') ? (
                                <img
                                  src={p.attachmentUrl}
                                  alt={p.attachmentName || 'Attachment'}
                                  className="max-h-56 w-full rounded-xl object-cover"
                                />
                              ) : p.attachmentType?.startsWith('video/') ? (
                                <video
                                  src={p.attachmentUrl}
                                  controls
                                  className="max-h-56 w-full rounded-xl"
                                />
                              ) : (
                                <a
                                  href={p.attachmentUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 rounded-full border border-slate-600 bg-slate-950/80 px-3 py-1 text-[10px]"
                                >
                                  <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-400" />
                                  <span className="truncate max-w-[10rem]">
                                    {p.attachmentName || 'View attachment'}
                                  </span>
                                </a>
                              )}
                            </div>
                          )}
                          <div className="mt-3 flex flex-wrap items-center gap-3 text-[10px] text-slate-300">
                            <button
                              type="button"
                              onClick={() => handleTogglePostLike(p.id)}
                              className="inline-flex items-center gap-1 rounded-full border border-slate-700/80 bg-slate-900/80 px-3 py-1 hover:border-pink-400/70 hover:text-pink-200"
                            >
                              <span>♥</span>
                              <span>{postLikes[p.id] || 0}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleLoadComments(p.id)}
                              className="inline-flex items-center gap-1 rounded-full border border-slate-700/80 bg-slate-900/80 px-3 py-1 hover:border-emerald-400/70 hover:text-emerald-200"
                            >
                              <span>💬</span>
                              <span>
                                {(postComments[p.id] && postComments[p.id].length) || 0}
                              </span>
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                createPost({
                                  userId: user.id,
                                  content: p.content,
                                  attachmentUrl: p.attachmentUrl,
                                  attachmentType: p.attachmentType,
                                  attachmentName: p.attachmentName,
                                  originalPostId: p.id,
                                })
                              }
                              className="inline-flex items-center gap-1 rounded-full border border-slate-700/80 bg-slate-900/80 px-3 py-1 hover:border-sky-400/70 hover:text-sky-200"
                            >
                              <span>🔁</span>
                              <span>Repost</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const url = `${window.location.origin}/feed`
                                if (navigator.share) {
                                  navigator.share({
                                    title: 'RiddimBase update',
                                    text: p.content?.slice(0, 80) || '',
                                    url,
                                  })
                                } else {
                                  navigator.clipboard
                                    .writeText(url)
                                    .catch(() => {})
                                  alert('Feed link copied to clipboard.')
                                }
                              }}
                              className="inline-flex items-center gap-1 rounded-full border border-slate-700/80 bg-slate-900/80 px-3 py-1 hover:border-slate-500/80 hover:text-slate-100"
                            >
                              <span>↗</span>
                              <span>Share</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setReportTarget({ id: p.id, type: 'post' })}
                              className="inline-flex items-center gap-1 rounded-full border border-slate-700/80 bg-slate-900/80 px-3 py-1 hover:border-rose-400/70 hover:text-rose-200"
                            >
                              <span>⚑</span>
                              <span>Report</span>
                            </button>
                          </div>
                          {postComments[p.id] && postComments[p.id].length > 0 && (
                            <div className="mt-3 space-y-1.5 border-t border-slate-800/70 pt-2">
                              {postComments[p.id].map((c) => (
                                <div key={c.id} className="flex items-start gap-2 text-[10px]">
                                  <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-slate-800 text-[9px] font-semibold text-slate-100">
                                    {c.displayName.slice(0, 2).toUpperCase()}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-[10px] font-semibold text-slate-200">
                                      {c.displayName}{' '}
                                      <span className="text-slate-500">
                                        · {timeAgo(c.createdAt)}
                                      </span>
                                    </p>
                                    <p className="text-[10px] text-slate-200">
                                      {c.content}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                          {user && (
                            <div className="mt-2 flex items-center gap-2 border-t border-slate-800/70 pt-2">
                              <input
                                value={commentDrafts[p.id] || ''}
                                onChange={(e) =>
                                  setCommentDrafts((prev) => ({
                                    ...prev,
                                    [p.id]: e.target.value,
                                  }))
                                }
                                placeholder="Add a comment…"
                                className="flex-1 rounded-full border border-slate-700/70 bg-slate-950/70 px-3 py-1.5 text-[10px] text-slate-100 placeholder:text-slate-500 focus:outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => handleAddComment(p.id)}
                                className="rounded-full bg-emerald-500 px-3 py-1 text-[10px] font-semibold text-slate-950 hover:bg-emerald-400"
                              >
                                Post
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {!user && (
              <p className="text-sm text-slate-400">
                Log in to see a personalized feed from producers you follow.
              </p>
            )}

            {user && mode === 'following' && !hasFeed && !loading && (
              <div className="rounded-2xl border border-slate-800/80 bg-slate-900/80 p-4 text-sm text-slate-300">
                <p>
                  Once you follow producers and they repost beats, their activity will appear here.
                </p>
                <p className="mt-2 text-[11px] text-slate-400">
                  Start by browsing{' '}
                  <a href="/beats" className="text-red-300 hover:text-red-200">
                    Beats
                  </a>{' '}
                  or{' '}
                  <a href="/producers" className="text-red-300 hover:text-red-200">
                    Producers
                  </a>{' '}
                  and tapping Follow.
                </p>
              </div>
            )}

            {user && mode === 'following' && hasFeed && (
              <div className="space-y-3">
                <h2 className="text-sm font-semibold text-slate-100">
                  From producers you follow
                </h2>
                <div className="grid grid-cols-1 gap-3 xs:grid-cols-2 lg:grid-cols-3">
                  {repostFeed.map(({ beat, byUserId, repostedAt }) => {
                    const name =
                      repostProfiles[byUserId] || 'Producer you follow'
                    return (
                      <div key={`${beat.id}-${byUserId || 'self'}`} className="space-y-1.5">
                        <p className="text-[10px] text-slate-400">
                          Reposted by{' '}
                          <span className="font-semibold text-slate-100">
                            {name}
                          </span>
                          {repostedAt && (
                            <>
                              {' · '}
                              <span>{timeAgo(repostedAt)}</span>
                            </>
                          )}
                        </p>
                        <BeatCard {...beat} square />
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {mode === 'recommended' && (
              <div className="space-y-3">
                <h2 className="text-sm font-semibold text-slate-100">Recommended for you</h2>
                {recommendedBeats.length === 0 && (
                  <p className="text-xs text-slate-400">
                    We&apos;ll show trending beats here once more activity is detected.
                  </p>
                )}
                {recommendedBeats.length > 0 && (
                  <div className="grid grid-cols-1 gap-3 xs:grid-cols-2 lg:grid-cols-3">
                    {recommendedBeats.map((beat) => (
                      <BeatCard key={beat.id} {...beat} square />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <aside className="w-full space-y-4 md:w-72 md:flex-shrink-0">
            <div className="rounded-2xl border border-slate-800/80 bg-slate-900/80 p-4">
              <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Suggested producers
              </h2>
              <p className="mt-1 text-[11px] text-slate-400">
                Follow a few creators to build your feed.
              </p>
              <div className="mt-3 space-y-2 text-[11px]">
                {suggested.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between gap-2 rounded-xl border border-slate-800/80 bg-slate-950/80 px-3 py-2"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-800 text-[10px] font-semibold text-slate-100">
                        {(p.name || 'RB')
                          .split(' ')
                          .filter(Boolean)
                          .slice(0, 2)
                          .map((x) => x[0])
                          .join('')
                          .toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-slate-100">
                          {p.name}
                        </p>
                        <p className="truncate text-[10px] text-slate-500">
                          {p.location || 'Producer / Service'}
                        </p>
                      </div>
                    </div>
                    <a
                      href={`/producer/${p.id}`}
                      className="rounded-full bg-red-500 px-3 py-1 text-[10px] font-semibold text-slate-50 hover:bg-red-400"
                    >
                      View
                    </a>
                  </div>
                ))}
                {suggested.length === 0 && (
                  <p className="text-[11px] text-slate-500">
                    Browse the Producers page to find new creators.
                  </p>
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>
      {reportTarget && (
        <ReportModal
          open={!!reportTarget}
          onClose={() => setReportTarget(null)}
          targetId={reportTarget.id}
          type={reportTarget.type}
        />
      )}
    </section>
  )
}

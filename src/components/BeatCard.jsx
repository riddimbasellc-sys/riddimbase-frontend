import { Link } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { useCart } from '../context/CartContext'
import useSupabaseUser from '../hooks/useSupabaseUser'
import {
  toggleLike,
  likeCount,
  isLiked,
  toggleRepost,
  isReposted,
  repostCount,
} from '../services/socialService'
import { isProducerPro } from '../services/subscriptionService'

export function BeatCard({
  id,
  title,
  producer,
  userId,
  genre,
  bpm,
  price,
  coverUrl,
  audioUrl,
  freeDownload = false,
  initialLikes = 0,
  initialFavs = 0, // compatibility
  initialFollowers = 0, // compatibility
  onShare,
  noLink = false,
  sponsored = false,
  compact = false,
}) {
  const { addBeat } = useCart() || {}
  const { user } = useSupabaseUser()

  const [liked, setLiked] = useState(false)
  const [reposted, setReposted] = useState(false)

  const [likes, setLikes] = useState(initialLikes)
  const [reposts, setReposts] = useState(0)
  const [pro, setPro] = useState(false)
  const [playing, setPlaying] = useState(false)
  const audioRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        if (initialLikes === 0) {
          const c = await likeCount(id)
          if (!cancelled) setLikes(c)
        }
        const rc = await repostCount(id)
        if (!cancelled) setReposts(rc)

        if (user) {
          const [l, r] = await Promise.all([
            isLiked({ userId: user.id, beatId: id }),
            isReposted({ userId: user.id, beatId: id }),
          ])
          if (!cancelled) {
            setLiked(l)
            setReposted(r)
          }
        }

        if (userId) {
          const proAcc = await isProducerPro(userId)
          if (!cancelled) setPro(!!proAcc)
        } else if (!cancelled) {
          setPro(false)
        }
      } catch {
        // ignore background errors
      }
    })()
    return () => {
      cancelled = true
    }
  }, [id, user, userId, initialLikes])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    if (playing) {
      audio.play().catch(() => setPlaying(false))
    } else {
      audio.pause()
    }
  }, [playing])

  const initials =
    producer && producer.trim()
      ? producer
          .split(' ')
          .filter(Boolean)
          .slice(0, 2)
          .map((p) => p[0])
          .join('')
          .toUpperCase()
      : 'RB'

  const handleAdd = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (addBeat) addBeat(id, 'Basic')
  }

  const handleLike = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (!user) return
    const optimistic = liked ? likes - 1 : likes + 1
    setLiked(!liked)
    setLikes(Math.max(0, optimistic))
    const res = await toggleLike({ userId: user.id, beatId: id })
    if (res.liked !== !liked) {
      setLiked(res.liked)
      setLikes(await likeCount(id))
    }
  }

  const handleRepost = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (!user) return
    const optimistic = reposted ? reposts - 1 : reposts + 1
    setReposted(!reposted)
    setReposts(Math.max(0, optimistic))
    const res = await toggleRepost({ userId: user.id, beatId: id })
    if (res.reposted !== !reposted) {
      setReposted(res.reposted)
      setReposts(await repostCount(id))
    }
  }

  const handlePlayToggle = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (!audioUrl || !audioRef.current) return
    setPlaying((p) => !p)
  }

  const Wrapper = noLink ? 'div' : Link
  const wrapperProps = noLink ? {} : { to: `/beat/${id}` }

  const sizeClasses = compact ? 'p-3' : 'p-3'

  return (
    <Wrapper
      {...wrapperProps}
      className={`group flex flex-col rounded-[20px] border border-white/10 bg-slate-900/80 ${sizeClasses} shadow-[0_18px_48px_rgba(0,0,0,0.9)] backdrop-blur transition hover:border-red-500/70 hover:bg-slate-900/95 min-w-0`}
    >
      {/* Top row: avatar + producer + badges */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-slate-900/80 text-[10px] font-semibold text-slate-100">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="truncate text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
              Producer
            </p>
            <p className="truncate text-[11px] font-semibold text-slate-50">
              {producer || 'Unknown'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {pro && (
            <span className="inline-flex items-center rounded-full border border-amber-400/80 bg-amber-500/15 px-2 py-[1px] text-[9px] font-semibold text-amber-200">
              PRO
            </span>
          )}
          {sponsored && (
            <span className="inline-flex items-center rounded-full border border-red-400/80 bg-red-500/15 px-2 py-[1px] text-[9px] font-semibold text-red-200">
              AD
            </span>
          )}
        </div>
      </div>

      {/* Center: small hero area */}
      <div className="mt-3 flex flex-col items-center text-center">
        <button
          type="button"
          onClick={handlePlayToggle}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-white/25 bg-white/5 text-[11px] text-slate-50 shadow-[0_0_18px_rgba(248,250,252,0.25)]"
        >
          {playing ? '⏸' : '▶'}
        </button>
        <h3
          className="mt-2 line-clamp-2 text-[13px] font-semibold text-slate-50"
          title={title}
        >
          {title}
        </h3>
        <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-slate-400">
          {genre || 'Caribbean'} • {bpm || 0} BPM
        </p>
        <p className="mt-1 text-[13px] font-semibold text-red-400">
          ${price?.toFixed ? price.toFixed(2) : Number(price || 0).toFixed(2)}
        </p>
      </div>

      {/* Hidden audio element controlled by the play button */}
      <audio ref={audioRef} src={audioUrl || ''} preload="metadata" className="hidden" />

      {/* Bottom row: cart + like + repost + profile icon */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={handleAdd}
          onMouseDown={(e) => e.stopPropagation()}
          className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-950 shadow-[0_0_24px_rgba(248,250,252,0.45)] hover:bg-slate-100"
        >
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-[11px]">
            🛒
          </span>
          <span>
            $
            {price?.toFixed ? price.toFixed(2) : Number(price || 0).toFixed(2)}
          </span>
        </button>

        <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-300 justify-end">
          <button
            onClick={handleLike}
            onMouseDown={(e) => e.stopPropagation()}
            className={`flex items-center gap-1 rounded-full px-2.5 py-1 border text-[10px] ${
              liked
                ? 'border-pink-400/80 bg-pink-500/20 text-pink-200'
                : 'border-slate-700/80 bg-slate-900/60 hover:border-pink-400/70 hover:text-pink-200'
            }`}
          >
            <span>♥</span>
            <span>{likes}</span>
          </button>

          <button
            onClick={handleRepost}
            onMouseDown={(e) => e.stopPropagation()}
            className={`flex items-center gap-1 rounded-full px-2.5 py-1 border text-[10px] ${
              reposted
                ? 'border-emerald-400/80 bg-emerald-500/20 text-emerald-200'
                : 'border-slate-700/80 bg-slate-900/60 hover:border-emerald-400/70 hover:text-emerald-200'
            }`}
            title="Repost to your followers"
          >
            <span>⟳</span>
            <span>{reposts}</span>
          </button>

          <div className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-700/80 bg-slate-900/60 text-[11px] text-slate-300">
            👤
          </div>
        </div>
      </div>

      {freeDownload && (
        <div className="mt-2 text-right">
          <a
            href={`/checkout/${id}?mode=free`}
            onClick={(e) => {
              e.stopPropagation()
            }}
            className="inline-flex items-center rounded-full border border-red-400/70 bg-red-500/10 px-3 py-1 text-[10px] font-semibold text-red-200 hover:bg-red-500/20"
          >
            Free download
          </a>
        </div>
      )}
    </Wrapper>
  )
}


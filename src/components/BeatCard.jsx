import { Link } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { useCart } from '../context/CartContext'
import useSupabaseUser from '../hooks/useSupabaseUser'
import { slugify } from '../utils/slugify'
import {
  toggleLike,
  likeCount,
  isLiked,
  toggleRepost,
  isReposted,
  repostCount,
  toggleFollow,
  isFollowing,
} from '../services/socialService'
import { isProducerPro } from '../services/subscriptionService'

export function BeatCard({
  id,
  title,
  producer,
  collaborator,
  userId,
  genre,
  bpm,
  price,
  coverUrl,
  audioUrl,
  description,
  licensePrices,
  freeDownload = false,
  initialLikes = 0,
  initialFavs = 0, // compatibility
  initialFollowers = 0, // compatibility
  onShare,
  noLink = false,
  sponsored = false,
  compact = false,
  square = false,
}) {
  const { addBeat } = useCart() || {}
  const { user } = useSupabaseUser()

  const [liked, setLiked] = useState(false)
  const [reposted, setReposted] = useState(false)
  const [following, setFollowing] = useState(false)

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
          const [l, r, fol] = await Promise.all([
            isLiked({ userId: user.id, beatId: id }),
            isReposted({ userId: user.id, beatId: id }),
            userId ? isFollowing({ followerId: user.id, producerId: userId }) : Promise.resolve(false),
          ])
          if (!cancelled) {
            setLiked(l)
            setReposted(r)
            setFollowing(fol)
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
    const res = await toggleLike({ userId: user.id, beatId: id, producerId: userId })
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

  const handleFollow = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (!user || !userId) return
    const res = await toggleFollow({ followerId: user.id, producerId: userId })
    if (typeof res.following === 'boolean') {
      setFollowing(res.following)
    } else {
      setFollowing((prev) => !prev)
    }
  }

  const handleShare = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (onShare) {
      onShare({ id, title, producer, userId })
    }
  }

  const handlePlayToggle = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (!audioUrl || !audioRef.current) return
    setPlaying((p) => !p)
  }

  const Wrapper = noLink ? 'div' : Link
  const slug = slugify(title || '')
  const wrapperProps = noLink
    ? {}
    : {
        to: slug ? `/beat/${id}-${slug}` : `/beat/${id}`,
        state: {
          beat: {
            id,
            title,
            producer,
            collaborator,
            userId,
            genre,
            bpm,
            price,
            coverUrl,
            audioUrl,
            description,
            licensePrices,
            freeDownload,
          },
        },
      }

  const sizeClasses = compact ? 'p-2' : 'p-3'

  // Square variant: compact artwork-first card (used on landing page grids)
  if (square) {
    return (
      <Wrapper
        {...wrapperProps}
        className="group relative aspect-square overflow-hidden rounded-2xl border border-white/10 bg-slate-900/80 shadow-[0_18px_48px_rgba(0,0,0,0.9)] backdrop-blur transition hover:border-red-500/70 hover:bg-slate-900/95"
      >
        {coverUrl ? (
          <img
            src={coverUrl}
            alt={title || 'Beat artwork'}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950" />
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

        <div className="absolute left-3 right-3 bottom-14 z-10 flex items-center justify-between text-[9px]">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleLike}
              className={`flex items-center gap-1 rounded-full px-2 py-[3px] border ${
                liked
                  ? 'border-pink-400/80 bg-pink-500/30 text-pink-100'
                  : 'border-slate-700/80 bg-slate-900/70 text-slate-200'
              }`}
            >
              <span>♥</span>
              <span>{likes}</span>
            </button>
            <button
              type="button"
              onClick={handleRepost}
              className={`flex items-center gap-1 rounded-full px-2 py-[3px] border ${
                reposted
                  ? 'border-emerald-400/80 bg-emerald-500/30 text-emerald-100'
                  : 'border-slate-700/80 bg-slate-900/70 text-slate-200'
              }`}
            >
              <span>⟳</span>
              <span>{reposts}</span>
            </button>
          </div>
          <div className="flex items-center gap-1">
            {userId && (
              <button
                type="button"
                onClick={handleFollow}
                className={`rounded-full px-2 py-[3px] border ${
                  following
                    ? 'border-sky-400/80 bg-sky-500/30 text-sky-50'
                    : 'border-slate-700/80 bg-slate-900/70 text-slate-200'
                }`}
              >
                {following ? 'Following' : 'Follow'}
              </button>
            )}
            {onShare && (
              <button
                type="button"
                onClick={handleShare}
                className="flex h-6 w-6 items-center justify-center rounded-full border border-slate-600/80 bg-slate-900/80 text-[11px] text-slate-100"
                title="Share"
              >
                ✈
              </button>
            )}
          </div>
        </div>

        {/* Play button */}
        <button
          type="button"
          onClick={handlePlayToggle}
          className="absolute inset-x-0 top-1/2 z-10 mx-auto flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white text-[13px] font-semibold text-slate-900 shadow-[0_0_30px_rgba(248,250,252,0.6)] hover:bg-slate-100"
        >
          {playing ? '⏸' : '▶'}
        </button>

        {/* Metadata */}
        <div className="absolute inset-x-3 bottom-3 z-10 flex items-center justify-between gap-2 text-[11px] text-slate-100">
          <div className="min-w-0">
            <p className="truncate text-[11px] font-semibold">
              {title || 'Untitled Beat'}
            </p>
            <p className="truncate text-[10px] text-slate-300">
              {producer || 'Unknown'} • {genre || 'Genre'}
            </p>
          </div>
          <div className="flex flex-col items-end text-[11px]">
            <span className="font-semibold text-red-400">
              ${price?.toFixed ? price.toFixed(2) : Number(price || 0).toFixed(2)}
            </span>
            {bpm ? (
              <span className="text-[9px] text-slate-400">
                {bpm} BPM
              </span>
            ) : null}
          </div>
        </div>

        {/* Hidden audio */}
        <audio
          ref={audioRef}
          src={audioUrl || ''}
          preload="metadata"
          className="hidden"
        />
      </Wrapper>
    )
  }

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
            {collaborator && (
              <p className="truncate text-[10px] text-slate-400">
                ft. {collaborator}
              </p>
            )}
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

      {/* Artwork preview */}
      <div className="mt-3 w-full overflow-hidden rounded-2xl border border-slate-800/70 bg-slate-900/70">
        {coverUrl ? (
          <img
            src={coverUrl}
            alt={title || 'Beat artwork'}
            className={`${compact ? 'h-28' : 'h-32'} w-full object-cover`}
          />
        ) : (
          <div className="h-32 w-full bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950" />
        )}
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
      <audio
        ref={audioRef}
        src={audioUrl || ''}
        preload="metadata"
        className="hidden"
      />

      {/* Mini waveform visualizer tied to play state */}
      <div className="mt-3 h-10 w-full overflow-hidden rounded-xl bg-slate-900/80 px-2 py-1">
        <div
          className={`flex h-full items-end gap-[2px] ${
            playing ? 'rb-wave-active' : 'rb-wave-idle'
          }`}
        >
          {Array.from({ length: 32 }).map((_, i) => (
            <div
              key={i}
              className="w-[2px] rounded-full bg-slate-500/80"
              style={{ animationDelay: `${i * 0.03}s` }}
            />
          ))}
        </div>
      </div>

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

import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { BeatPlayer } from './BeatPlayer'
import { useCart } from '../context/CartContext'
import useSupabaseUser from '../hooks/useSupabaseUser'
import {
  toggleLike,
  toggleFavorite,
  likeCount,
  favoriteCount,
  isLiked,
  isFavorited,
  followerCount,
  toggleFollow,
  isFollowing,
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
  initialFavs = 0,
  initialFollowers = 0,
  onShare,
  noLink = false,
  sponsored = false,
  compact = false,
}) {
  const { addBeat } = useCart() || {}
  const { user } = useSupabaseUser()

  const [liked, setLiked] = useState(false)
  const [favorited, setFavorited] = useState(false)
  const [reposted, setReposted] = useState(false)

  const [likes, setLikes] = useState(initialLikes)
  const [favs, setFavs] = useState(initialFavs)
  const [reposts, setReposts] = useState(0)
  const [followers, setFollowers] = useState(initialFollowers)

  const [following, setFollowing] = useState(false)
  const [pro, setPro] = useState(false)

  // Load social state
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        if (initialLikes === 0) {
          const c = await likeCount(id)
          if (!cancelled) setLikes(c)
        }
        if (initialFavs === 0) {
          const c = await favoriteCount(id)
          if (!cancelled) setFavs(c)
        }
        const rc = await repostCount(id)
        if (!cancelled) setReposts(rc)

        if (userId && initialFollowers === 0) {
          const fc = await followerCount(userId)
          if (!cancelled) setFollowers(fc)
        }

        if (user) {
          const [l, f, r] = await Promise.all([
            isLiked({ userId: user.id, beatId: id }),
            isFavorited({ userId: user.id, beatId: id }),
            isReposted({ userId: user.id, beatId: id }),
          ])
          if (!cancelled) {
            setLiked(l)
            setFavorited(f)
            setReposted(r)
          }
          if (userId) {
            const follow = await isFollowing({
              followerId: user.id,
              producerId: userId,
            })
            if (!cancelled) setFollowing(follow)
          }
        }

        if (userId) {
          try {
            const proAcc = await isProducerPro(userId)
            if (!cancelled) setPro(proAcc)
          } catch {
            if (!cancelled) setPro(false)
          }
        } else if (!cancelled) {
          setPro(false)
        }
      } catch {
        // ignore background social errors
      }
    })()
    return () => {
      cancelled = true
    }
  }, [id, user, userId, initialLikes, initialFavs, initialFollowers])

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

  const handleFav = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (!user) return
    const optimistic = favorited ? favs - 1 : favs + 1
    setFavorited(!favorited)
    setFavs(Math.max(0, optimistic))
    const res = await toggleFavorite({ userId: user.id, beatId: id })
    if (res.favorited !== !favorited) {
      setFavorited(res.favorited)
      setFavs(await favoriteCount(id))
    }
  }

  const handleFollow = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (!user || !userId || user.id === userId) return
    const optimistic = following ? followers - 1 : followers + 1
    setFollowing(!following)
    setFollowers(Math.max(0, optimistic))
    const res = await toggleFollow({ followerId: user.id, producerId: userId })
    if (res.following !== !following) {
      setFollowing(res.following)
      setFollowers(await followerCount(userId))
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

  const Wrapper = noLink ? 'div' : Link
  const wrapperProps = noLink ? {} : { to: `/beat/${id}` }

  const sizeClasses = compact ? 'p-3' : 'p-4'

  return (
    <Wrapper
      {...wrapperProps}
      className={`group flex flex-col rounded-[24px] border border-white/10 bg-slate-900/80 ${sizeClasses} shadow-[0_22px_60px_rgba(0,0,0,0.9)] backdrop-blur transition hover:border-red-500/70 hover:bg-slate-900/95 min-w-0`}
    >
      {/* Top row: avatar + producer + badges */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-slate-900/80 text-[11px] font-semibold text-slate-100 shadow-[0_0_14px_rgba(15,23,42,0.9)]">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="truncate text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              Producer
            </p>
            <p className="truncate text-xs font-semibold text-slate-50">
              {producer || 'Unknown'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {pro && (
            <span className="inline-flex items-center rounded-full border border-amber-400/80 bg-amber-500/15 px-2 py-[2px] text-[10px] font-semibold text-amber-200">
              PRO
            </span>
          )}
          {sponsored && (
            <span className="inline-flex items-center rounded-full border border-red-400/80 bg-red-500/15 px-2 py-[2px] text-[10px] font-semibold text-red-200">
              Sponsored
            </span>
          )}
        </div>
      </div>

      {/* Center: glossy play + title */}
      <div className="mt-4 flex flex-col items-center text-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/30 bg-white/5 text-xs text-slate-50 shadow-[0_0_25px_rgba(248,250,252,0.35)]">
          ▶
        </div>
        <h3
          className="mt-3 line-clamp-2 text-sm font-semibold text-slate-50 sm:text-[15px]"
          title={title}
        >
          {title}
        </h3>
        <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-slate-400">
          {genre || 'Caribbean'} • {bpm || 0} BPM
        </p>
        <p className="mt-1 text-xs font-semibold text-red-400">
          ${price?.toFixed ? price.toFixed(2) : Number(price || 0).toFixed(2)}
        </p>
      </div>

      {/* Optional inline player on desktop */}
      {!compact && audioUrl && (
        <div
          className="mt-4 hidden md:block"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
        >
          <BeatPlayer src={audioUrl} beatId={id} />
        </div>
      )}

      {/* Bottom row: cart + social actions */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={handleAdd}
          onMouseDown={(e) => e.stopPropagation()}
          className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-1.5 text-[11px] font-semibold text-slate-950 shadow-[0_0_30px_rgba(248,250,252,0.45)] hover:bg-slate-100"
        >
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-[11px]">
            🛒
          </span>
          <span>${price?.toFixed ? price.toFixed(2) : Number(price || 0).toFixed(2)}</span>
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
            onClick={handleFav}
            onMouseDown={(e) => e.stopPropagation()}
            className={`flex items-center gap-1 rounded-full px-2.5 py-1 border text-[10px] ${
              favorited
                ? 'border-amber-400/80 bg-amber-500/20 text-amber-200'
                : 'border-slate-700/80 bg-slate-900/60 hover:border-amber-400/70 hover:text-amber-200'
            }`}
          >
            <span>★</span>
            <span>{favs}</span>
          </button>

          {onShare && (
            <button
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onShare({ id, title })
              }}
              onMouseDown={(e) => e.stopPropagation()}
              className="flex items-center gap-1 rounded-full border border-slate-700/80 bg-slate-900/60 px-2.5 py-1 text-[10px] hover:border-red-400/70 hover:text-red-200"
            >
              <span>↗</span>
            </button>
          )}

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

          {userId && userId !== (user && user.id) && (
            <button
              onClick={handleFollow}
              onMouseDown={(e) => e.stopPropagation()}
              className={`flex items-center gap-1 rounded-full px-2.5 py-1 border text-[10px] ${
                following
                  ? 'border-red-400/80 bg-red-500/20 text-red-200'
                  : 'border-slate-700/80 bg-slate-900/60 hover:border-red-400/70 hover:text-red-200'
              }`}
            >
              <span>{following ? 'Following' : 'Follow'}</span>
              <span>{followers}</span>
            </button>
          )}
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

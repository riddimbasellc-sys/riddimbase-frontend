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
  const [likes, setLikes] = useState(initialLikes)
  const [favs, setFavs] = useState(initialFavs)
  const [followers, setFollowers] = useState(initialFollowers)
  const [following, setFollowing] = useState(false)
  const [pro, setPro] = useState(false)

  useEffect(() => {
    ;(async () => {
      if (initialLikes === 0) setLikes(await likeCount(id))
      if (initialFavs === 0) setFavs(await favoriteCount(id))
      if (userId && initialFollowers === 0) {
        setFollowers(await followerCount(userId))
      }
      if (user) {
        setLiked(await isLiked({ userId: user.id, beatId: id }))
        setFavorited(await isFavorited({ userId: user.id, beatId: id }))
        if (userId) {
          setFollowing(
            await isFollowing({ followerId: user.id, producerId: userId }),
          )
        }
      }
      if (userId) {
        try {
          setPro(await isProducerPro(userId))
        } catch {
          setPro(false)
        }
      } else {
        setPro(false)
      }
    })()
  }, [id, user, userId, initialLikes, initialFavs, initialFollowers])

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

  const Wrapper = noLink ? 'div' : Link
  const wrapperProps = noLink ? {} : { to: `/beat/${id}` }
  const coverHeightClass = compact ? 'h-32' : 'h-40'

  return (
    <Wrapper
      {...wrapperProps}
      className={`group flex flex-col rounded-2xl border border-white/10 bg-black/60 ${
        compact ? 'p-2' : 'p-3'
      } shadow-[0_18px_45px_rgba(0,0,0,0.85)] transition hover:border-red-500/60 hover:bg-white/5 min-w-0`}
    >
      <div
        className={`relative w-full overflow-hidden rounded-xl bg-gradient-to-br from-rb-fiery-red via-rb-sun-gold to-rb-trop-cyan ${coverHeightClass}`}
      >
        {coverUrl ? (
          <img
            src={coverUrl}
            alt={title}
            className="h-full w-full object-cover opacity-90 transition group-hover:scale-[1.02] group-hover:opacity-100"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[11px] font-semibold text-slate-950/80">
            RB
          </div>
        )}
        {pro && (
          <span className="absolute top-1 left-1 rounded-full bg-emerald-600/80 backdrop-blur px-2 py-0.5 text-[9px] font-semibold text-slate-50 shadow border border-emerald-300/50">
            PRO
          </span>
        )}
        {sponsored && (
          <span className="absolute top-1 right-1 rounded-full bg-yellow-400/90 px-2 py-0.5 text-[9px] font-semibold text-slate-900 shadow border border-yellow-300/80">
            Sponsored
          </span>
        )}
        <button
          onClick={handleLike}
          className={`absolute right-2 top-2 h-7 w-7 flex items-center justify-center rounded-full border text-[11px] backdrop-blur-sm ${
            liked
              ? 'border-pink-400/70 bg-pink-500/20 text-pink-300'
              : 'border-slate-700/70 bg-slate-900/40 text-slate-300 hover:border-pink-400/60 hover:text-pink-300'
          }`}
          onMouseDown={(e) => e.stopPropagation()}
        >
          ♥
        </button>
      </div>
      <div className="mt-3 min-w-0">
        <h3
          className="text-sm font-semibold text-slate-50 truncate"
          title={title}
        >
          {title}
        </h3>
        <p className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-400 truncate">
          <span className="truncate">
            {producer} • {genre} • {bpm} BPM
          </span>
          {pro && (
            <span className="inline-flex items-center justify-center rounded-full border border-amber-400/70 bg-amber-500/15 px-1.5 py-[1px] text-[9px] font-semibold text-amber-300">
              ★
            </span>
          )}
        </p>
      </div>
      {!compact && (
        <div
          className="mt-2 hidden md:block"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
        >
          <BeatPlayer src={audioUrl} beatId={id} />
        </div>
      )}
      <div className="mt-3 flex items-center justify-between">
        <button
          onClick={handleAdd}
          className="flex items-center gap-1 rounded-full bg-slate-800 px-3 py-1 text-[11px] font-semibold text-slate-200 hover:bg-slate-700"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            className="h-4 w-4"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 8l2-4h8l2 4" />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 8h18l-1.5 11a2 2 0 0 1-2 1.8H6.5a2 2 0 0 1-2-1.8L3 8z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 11v4m-2-2h4"
            />
          </svg>
          <span>${price.toFixed(2)}</span>
        </button>
        <div className="flex items-center gap-2">
          {freeDownload && (
            <a
              href={`/checkout/${id}?mode=free`}
              onClick={(e) => {
                e.stopPropagation()
              }}
              className="h-7 w-7 flex items-center justify-center rounded-full border text-[11px] border-emerald-400/70 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
              title="Free Download"
              aria-label="Free Download"
            >
              ↓
            </a>
          )}
          <button
            onClick={handleFav}
            className={`h-7 w-7 flex items-center justify-center rounded-full border text-[11px] ${
              favorited
                ? 'border-amber-400/70 bg-amber-500/20 text-amber-300'
                : 'border-slate-700/70 bg-slate-800/60 text-slate-300 hover:border-amber-400/60 hover:text-amber-300'
            }`}
            onMouseDown={(e) => e.stopPropagation()}
          >
            ☆
          </button>
          {userId && userId !== (user && user.id) && (
            <button
              onClick={handleFollow}
              className={`h-7 w-7 flex items-center justify-center rounded-full border text-[10px] ${
                following
                  ? 'border-emerald-400/80 bg-emerald-500/20 text-emerald-300'
                  : 'border-slate-700/70 bg-slate-800/60 text-slate-300 hover:border-emerald-400/70 hover:text-emerald-300'
              }`}
              onMouseDown={(e) => e.stopPropagation()}
            >
              +
            </button>
          )}
          {onShare && (
            <button
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onShare({ id, title })
              }}
              onMouseDown={(e) => e.stopPropagation()}
              className="h-7 w-7 flex items-center justify-center rounded-full border text-[11px] border-slate-700/70 bg-slate-800/60 text-slate-300 hover:border-emerald-400/70 hover:text-emerald-300"
              aria-label="Share beat"
            >
              ↗
            </button>
          )}
        </div>
      </div>
    </Wrapper>
  )
}

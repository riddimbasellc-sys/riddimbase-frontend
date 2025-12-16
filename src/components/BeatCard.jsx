import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
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
import MiniWavePlayer from './MiniWavePlayer'

export function BeatCard({
  id,
  title,
  producer,
  collaborator,
  userId,
  genre,
  bpm,
  musicalKey,
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
  mini = false,
  onAddedToCart,
}) {
  const { addBeat } = useCart() || {}
  const { user } = useSupabaseUser()

  const [liked, setLiked] = useState(false)
  const [reposted, setReposted] = useState(false)
  const [following, setFollowing] = useState(false)
  const [likes, setLikes] = useState(initialLikes)
  const [reposts, setReposts] = useState(0)
  const [pro, setPro] = useState(false)

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
            userId
              ? isFollowing({ followerId: user.id, producerId: userId })
              : Promise.resolve(false),
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
    if (addBeat) {
      addBeat(id, 'Basic')
      if (onAddedToCart) {
        onAddedToCart({ id, title, price })
      }
    }
  }

  const handleFreeDownloadClick = (e) => {
    e.preventDefault()
    e.stopPropagation()
    // Add to cart with Basic license to keep flow consistent, then navigate
    if (addBeat) {
      addBeat(id, 'Basic')
    }
    // Navigate to cart; checkout page will present free download based on beat flag
    window.location.href = '/cart'
  }

  const handleLike = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (!user) return
    const optimistic = liked ? likes - 1 : likes + 1
    setLiked(!liked)
    setLikes(Math.max(0, optimistic))
    const res = await toggleLike({
      userId: user.id,
      beatId: id,
      producerId: userId,
    })
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

  const Wrapper = noLink ? 'div' : Link
  const slug = slugify(title || '')
  const wrapperProps = noLink
    ? {}
    : {
        to: slug ? `/beat/${slug}` : `/beat/${id}`,
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

  // Tiny square variant for dashboard catalog (very small "key" tiles)
  if (square && mini) {
    return (
      <Wrapper
        {...wrapperProps}
        className="group relative h-10 w-10 sm:h-12 sm:w-12 overflow-hidden rounded-xl border border-white/15 bg-slate-900/90 shadow-[0_10px_30px_rgba(0,0,0,0.9)] hover:border-red-500/70 transition"
      >
        {coverUrl ? (
          <img
            src={coverUrl}
            alt={title || 'Beat artwork'}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-slate-800 via-slate-900 to-black" />
        )}
        <div className="absolute inset-0 bg-black/50" />
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="flex h-6 w-6 items-center justify-center rounded-full border border-white/70 bg-black/80 text-[10px] text-white shadow-[0_0_12px_rgba(0,0,0,0.8)] group-hover:border-red-400 group-hover:text-red-300">
            ▶
          </div>
        </div>
      </Wrapper>
    )
  }

  // Compact square variant (used for landing page trending carousel)
  if (square && compact) {
    const keyLabel = musicalKey || null
    const priceLabel =
      price?.toFixed ? price.toFixed(2) : Number(price || 0).toFixed(2)

    return (
      <Wrapper
        {...wrapperProps}
        className="group relative aspect-square overflow-hidden rounded-2xl border border-white/10 bg-slate-900/90 shadow-[0_18px_48px_rgba(0,0,0,0.9)] backdrop-blur transition hover:border-red-500/80 hover:shadow-[0_0_32px_rgba(248,113,113,0.45)]"
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

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />

        {/* Heart / like button */}
        <button
          type="button"
          onClick={handleLike}
          className={`absolute right-2.5 top-2.5 z-20 flex h-7 w-7 items-center justify-center rounded-full border text-[12px] backdrop-blur-sm ${
            liked
              ? 'border-pink-400/80 bg-pink-500/80 text-white'
              : 'border-white/40 bg-black/70 text-white group-hover:border-pink-400/80'
          }`}
        >
          ♥
        </button>

        {/* Bottom overlay: title, producer, key/BPM, mini player, cart/price */}
        <div className="absolute inset-x-2.5 bottom-2.5 z-10 flex flex-col gap-1.5">
          <div className="flex items-center justify-between gap-2 text-[9px] text-slate-100">
            <div className="min-w-0">
              <p className="truncate text-[11px] font-semibold">
                {title || 'Untitled Beat'}
              </p>
              <p className="truncate text-[10px] text-slate-300">
                {producer || 'Unknown'}
                {keyLabel && <> • {keyLabel}</>}
                {bpm && <> • {bpm} BPM</>}
              </p>
            </div>
          </div>

          <div className="mt-0.5">
            <MiniWavePlayer
              src={audioUrl || ''}
              beatId={id}
              producerId={userId}
              height={24}
            />
          </div>

          <div className="mt-1 flex items-center justify-between text-[10px] text-slate-100">
            <button
              type="button"
              onClick={handleAdd}
              className="inline-flex items-center gap-1 rounded-full bg-black/80 px-2.5 py-1 font-semibold text-slate-50 shadow-[0_0_18px_rgba(15,23,42,0.7)] hover:bg-black/90"
            >
              <span>🛒</span>
              <span>${priceLabel}</span>
            </button>
            {freeDownload && (
              <button
                type="button"
                onClick={handleFreeDownloadClick}
                className="inline-flex items-center gap-1 rounded-full bg-red-500/20 px-2.5 py-1 font-semibold text-red-200 hover:bg-red-500/30"
                title="Free download"
              >
                <span>⬇️</span>
              </button>
            )}
          </div>
        </div>
      </Wrapper>
    )
  }

  // Square beat card: 1:1 artwork, waveform + like/cart (no center play)
  if (square) {
    return (
      <Wrapper
        {...wrapperProps}
        className="group relative aspect-square overflow-hidden rounded-2xl border border-white/10 bg-slate-900/80 shadow-[0_18px_48px_rgba(0,0,0,0.9)] backdrop-blur transition hover:border-red-500/80 hover:shadow-[0_0_32px_rgba(248,113,113,0.45)]"
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

        {/* Dark overlay for readability */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />

        {/* Heart / like button */}
        <button
          type="button"
          onClick={handleLike}
          className={`absolute right-3 top-3 z-20 flex h-8 w-8 items-center justify-center rounded-full border text-[11px] backdrop-blur-sm ${
            liked
              ? 'border-pink-400/80 bg-pink-500/80 text-white'
              : 'border-white/40 bg-black/70 text-white group-hover:border-pink-400/80'
          }`}
        >
          ♥
        </button>

        {/* Bottom overlay: title/producer + waveform + cart/price */}
        <div className="absolute inset-x-3 bottom-3 z-10 flex flex-col gap-1.5">
          <div className="flex items-center justify-between gap-2 text-[9px] text-slate-100">
            <div className="min-w-0">
              <p className="truncate text-[11px] font-semibold">
                {title || 'Untitled Beat'}
              </p>
              <p className="truncate text-[10px] text-slate-300">
                {producer || 'Unknown'} • {genre || 'Genre'}
                {collaborator && <> • ft. {collaborator}</>}
              </p>
            </div>
          </div>

          <div className="mt-1">
            <MiniWavePlayer
              src={audioUrl || ''}
              beatId={id}
              producerId={userId}
              height={28}
            />
          </div>

          <div className="mt-1 flex items-center justify-between text-[10px] text-slate-100">
            <button
              type="button"
              onClick={handleAdd}
              className="inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 font-semibold text-slate-950 shadow-[0_0_18px_rgba(248,250,252,0.35)] hover:bg-white"
            >
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-[11px]">
                Cart
              </span>
              <span>Add to cart</span>
            </button>
            <span className="text-[11px] font-semibold text-red-400">
              ${price?.toFixed ? price.toFixed(2) : Number(price || 0).toFixed(2)}
            </span>
            {freeDownload && (
              <button
                type="button"
                onClick={handleFreeDownloadClick}
                className="inline-flex items-center gap-1 rounded-full bg-red-500/20 px-2.5 py-1 font-semibold text-red-200 hover:bg-red-500/30"
                title="Free download"
              >
                <span>⬇️</span>
              </button>
            )}
          </div>
        </div>
      </Wrapper>
    )
  }

  // Default vertical beat card layout
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

      {/* Artwork preview (auto scales with card width) */}
      <div className="mt-3 w-full overflow-hidden rounded-2xl border border-slate-800/70 bg-slate-900/70">
        <div className={compact ? 'aspect-square' : 'aspect-[4/3]'}>
          {coverUrl ? (
            <img
              src={coverUrl}
              alt={title || 'Beat artwork'}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950" />
          )}
        </div>
      </div>

      {/* Center: title + mini WaveSurfer player */}
      <div className="mt-3 flex flex-col gap-2">
        <div className="flex flex-col items-center text-center">
          <h3
            className="line-clamp-2 text-[13px] font-semibold text-slate-50"
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
        <MiniWavePlayer src={audioUrl || ''} beatId={id} producerId={userId} />
      </div>

      {/* Bottom row: cart + like + repost + profile icon */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={handleAdd}
          onMouseDown={(e) => e.stopPropagation()}
          className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-950 shadow-[0_0_24px_rgba(248,250,252,0.45)] hover:bg-slate-100"
        >
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-[11px]">
            Cart
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
            <span>Like</span>
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
            <span>Repost</span>
            <span>{reposts}</span>
          </button>

          <button
            type="button"
            onClick={handleShare}
            onMouseDown={(e) => e.stopPropagation()}
            className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-700/80 bg-slate-900/60 text-[11px] text-slate-300"
            title="Share beat"
          >
            Share
          </button>
        </div>
      </div>

      {freeDownload && (
        <div className="mt-2 text-right">
          <button
            type="button"
            onClick={handleFreeDownloadClick}
            className="inline-flex items-center rounded-full border border-red-400/70 bg-red-500/10 px-3 py-1 text-[10px] font-semibold text-red-200 hover:bg-red-500/20"
            title="Free download"
          >
            ⬇️ Free download
          </button>
        </div>
      )}
    </Wrapper>
  )
}

export default BeatCard

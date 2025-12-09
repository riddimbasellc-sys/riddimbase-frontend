import { Link } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { useCart } from '../context/CartContext'
import useSupabaseUser from '../hooks/useSupabaseUser'
import { slugify } from '../utils/slugify'
import { likeCount, isLiked, toggleLike } from '../services/socialService'

export function TrendingBeatCard({
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
}) {
  const { addBeat } = useCart() || {}
  const { user } = useSupabaseUser()
  const [liked, setLiked] = useState(false)
  const [likes, setLikes] = useState(0)
  const [playing, setPlaying] = useState(false)
  const audioRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const count = await likeCount(id)
        if (!cancelled) setLikes(count)
        if (user) {
          const isL = await isLiked({ userId: user.id, beatId: id })
          if (!cancelled) setLiked(isL)
        }
      } catch {
        // ignore
      }
    })()
    return () => {
      cancelled = true
    }
  }, [id, user])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    if (playing) {
      audio.play().catch(() => setPlaying(false))
    } else {
      audio.pause()
    }
  }, [playing])

  const handlePlayToggle = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (!audioUrl || !audioRef.current) return
    setPlaying((p) => !p)
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

  const handleAdd = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (addBeat) addBeat(id, 'Basic')
  }

  const Wrapper = Link
  const slug = slugify(title || '')
  const to = slug ? `/beat/${id}-${slug}` : `/beat/${id}`

  return (
    <Wrapper
      to={to}
      className="group flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-slate-900/90 shadow-[0_18px_48px_rgba(0,0,0,0.9)] backdrop-blur transition hover:border-red-500/70 hover:bg-slate-900"
    >
      <div className="relative aspect-square w-full overflow-hidden bg-slate-900">
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

        {/* Heart / like */}
        <button
          type="button"
          onClick={handleLike}
          className={`absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full border text-[11px] ${
            liked
              ? 'border-pink-400/80 bg-pink-500/90 text-white'
              : 'border-white/40 bg-black/70 text-white group-hover:border-pink-400/80'
          }`}
        >
          ♥
        </button>

        {/* Play button */}
        <button
          type="button"
          onClick={handlePlayToggle}
          className="absolute inset-0 flex items-center justify-center"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-[13px] font-semibold text-slate-900 shadow-[0_0_30px_rgba(248,250,252,0.6)] group-hover:bg-slate-100">
            {playing ? '❚❚' : '▶'}
          </span>
        </button>

        <audio
          ref={audioRef}
          src={audioUrl || ''}
          preload="metadata"
          className="hidden"
        />
      </div>

      <div className="px-3 pt-3 pb-2">
        <p className="line-clamp-1 text-[11px] font-semibold text-slate-50">
          {title || 'Untitled Beat'}
        </p>
        <p className="mt-0.5 line-clamp-1 text-[10px] text-slate-400">
          {producer || 'Unknown'}
        </p>
      </div>

      <div className="flex items-center justify-between gap-2 px-3 pb-3">
        <button
          type="button"
          onClick={handleAdd}
          className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-950 shadow-[0_0_24px_rgba(248,250,252,0.35)] hover:bg-slate-100"
        >
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-[11px]">
            🛍
          </span>
          <span>
            ${price?.toFixed ? price.toFixed(2) : Number(price || 0).toFixed(2)}
          </span>
        </button>

        {freeDownload && (
          <a
            href={`/checkout/${id}?mode=free`}
            onClick={(e) => {
              e.stopPropagation()
            }}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-600/80 bg-slate-900/80 text-[13px] text-slate-100 hover:border-emerald-400/70 hover:text-emerald-200"
            title="Free download"
          >
            ⬇
          </a>
        )}
      </div>
    </Wrapper>
  )
}

export default TrendingBeatCard


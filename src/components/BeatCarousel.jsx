import { useCallback, useEffect, useState, useRef } from 'react'
import useEmblaCarousel from 'embla-carousel-react'
import { Link } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { slugify } from '../utils/slugify'
import useSupabaseUser from '../hooks/useSupabaseUser'
import { toggleLike, likeCount, isLiked } from '../services/socialService'

/**
 * @typedef {Object} Beat
 * @property {string} id
 * @property {string} title
 * @property {string} producer
 * @property {number} [bpm]
 * @property {string} [key]
 * @property {string} [coverUrl]
 * @property {number} [price]
 */

export function TrendingBeatCard({ beat, onAddedToCart }) {
  const { addBeat } = useCart() || {}
  const { user } = useSupabaseUser()
  const slug = slugify(beat.title || '')
  const to = slug ? `/beat/${slug}` : `/beat/${beat.id}`
  const price = typeof beat.price === 'number' ? beat.price : Number(beat.price || 0)
  const priceLabel = price.toFixed(2)
  const [liked, setLiked] = useState(false)
  const [likes, setLikes] = useState(0)
  const [playing, setPlaying] = useState(false)
  const audioRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const c = await likeCount(beat.id)
        if (!cancelled) setLikes(c)
        if (user) {
          const l = await isLiked({ userId: user.id, beatId: beat.id })
          if (!cancelled) setLiked(l)
        }
      } catch {
        // ignore social errors
      }
    })()
    return () => {
      cancelled = true
    }
  }, [beat.id, user])

  const handleAdd = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (addBeat) {
      addBeat(beat.id, 'Basic')
    }
    if (onAddedToCart) {
      onAddedToCart(beat)
    }
  }

  const handleLikeClick = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (!user) return
    const optimistic = liked ? likes - 1 : likes + 1
    setLiked(!liked)
    setLikes(Math.max(0, optimistic))
    try {
      const res = await toggleLike({
        userId: user.id,
        beatId: beat.id,
        producerId: beat.userId,
      })
      if (typeof res.liked === 'boolean' && res.liked !== !liked) {
        setLiked(res.liked)
        setLikes(await likeCount(beat.id))
      }
    } catch {
      // fallback: reload count later
    }
  }

  const handlePlayClick = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (!beat.audioUrl || !audioRef.current) return
    setPlaying((prev) => !prev)
  }

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    if (playing) {
      audio
        .play()
        .catch(() => {
          setPlaying(false)
        })
    } else {
      audio.pause()
    }
  }, [playing])

  return (
    <Link
      to={to}
      className="group flex h-full flex-col rounded-2xl border border-white/10 bg-black/70 p-2 text-xs text-slate-100 shadow-[0_18px_40px_rgba(0,0,0,0.9)]"
    >
      <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-slate-900/80">
        {beat.coverUrl ? (
          <img
            src={beat.coverUrl}
            alt={beat.title || 'Beat artwork'}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-slate-800 via-slate-900 to-black" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />
        {/* Play button */}
        <button
          type="button"
          onClick={handlePlayClick}
          className="absolute inset-0 m-auto flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-[14px] font-semibold text-slate-900 shadow-lg transition group-hover:scale-105"
        >
          {playing ? '||' : '▶'}
        </button>
        {/* Heart / like */}
        <button
          type="button"
          onClick={handleLikeClick}
          className={`absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full border text-[11px] backdrop-blur-sm ${
            liked
              ? 'border-pink-400/80 bg-pink-500/80 text-white'
              : 'border-white/40 bg-black/70 text-white group-hover:border-pink-400/80'
          }`}
        >
          ♥
        </button>
      </div>
      <audio ref={audioRef} src={beat.audioUrl || ''} preload="none" className="hidden" />
      <div className="mt-2 flex flex-1 flex-col">
        <p className="line-clamp-1 text-[11px] font-semibold text-slate-50">
          {beat.title || 'Untitled beat'}
        </p>
        <p className="mt-0.5 line-clamp-1 text-[10px] text-slate-400">
          {beat.producer || 'Unknown producer'}
        </p>
        <div className="mt-auto pt-2 flex items-center justify-between">
          <button
            type="button"
            onClick={handleAdd}
            className="inline-flex items-center gap-1 rounded-full bg-white/95 px-3 py-1 text-[11px] font-semibold text-slate-950 shadow-[0_0_20px_rgba(248,250,252,0.45)] hover:bg-white"
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-[11px]">
              $
            </span>
            <span>${priceLabel}</span>
          </button>
          <div className="ml-2 flex items-center gap-2">
            {beat.freeDownload && (
              <a
                href={`/checkout/${beat.id}?mode=free`}
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                }}
                className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-600/80 bg-slate-900/80 text-[11px] text-slate-100 hover:border-emerald-400/70 hover:text-emerald-200"
                title="Free download"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4"
                >
                  <path d="M12 3v14" />
                  <path d="M6 11l6 6 6-6" />
                  <path d="M5 21h14" />
                </svg>
              </a>
            )}
            <span className="text-[10px] text-slate-400">{likes}</span>
          </div>
        </div>
      </div>
    </Link>
  )
}

/**
 * @param {{ beats: Beat[], onAddedToCart?: (beat: Beat) => void }} props
 */
export function BeatCarousel({ beats, onAddedToCart }) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: 'start',
    loop: false,
    dragFree: false,
    skipSnaps: false,
  })
  const [canScrollPrev, setCanScrollPrev] = useState(false)
  const [canScrollNext, setCanScrollNext] = useState(false)

  const onSelect = useCallback(() => {
    if (!emblaApi) return
    setCanScrollPrev(emblaApi.canScrollPrev())
    setCanScrollNext(emblaApi.canScrollNext())
  }, [emblaApi])

  useEffect(() => {
    if (!emblaApi) return
    onSelect()
    emblaApi.on('select', onSelect)
    emblaApi.on('reInit', onSelect)
  }, [emblaApi, onSelect])

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev()
  }, [emblaApi])

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext()
  }, [emblaApi])

  const handleKeyDown = (event) => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      scrollPrev()
    } else if (event.key === 'ArrowRight') {
      event.preventDefault()
      scrollNext()
    }
  }

  if (!beats || beats.length === 0) return null

  return (
    <div className="relative mt-5">
      {/* Navigation buttons (desktop-only) */}
      <button
        type="button"
        onClick={scrollPrev}
        disabled={!canScrollPrev}
        aria-label="Scroll previous beats"
        className="pointer-events-auto absolute left-0 top-1/2 z-20 hidden -translate-y-1/2 rounded-full border border-slate-700/70 bg-slate-900/80 p-2 text-slate-200 shadow-lg backdrop-blur hover:border-red-400/70 hover:text-red-300 disabled:opacity-40 disabled:hover:border-slate-700/70 md:inline-flex"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4 w-4"
        >
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>
      <button
        type="button"
        onClick={scrollNext}
        disabled={!canScrollNext}
        aria-label="Scroll next beats"
        className="pointer-events-auto absolute right-0 top-1/2 z-20 hidden -translate-y-1/2 rounded-full border border-slate-700/70 bg-slate-900/80 p-2 text-slate-200 shadow-lg backdrop-blur hover:border-red-400/70 hover:text-red-300 disabled:opacity-40 disabled:hover:border-slate-700/70 md:inline-flex"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4 w-4"
        >
          <path d="M9 6l6 6-6 6" />
        </svg>
      </button>

      {/* Embla viewport */}
      <div
        ref={emblaRef}
        className="overflow-hidden touch-pan-y overscroll-x-contain"
        tabIndex={0}
        onKeyDown={handleKeyDown}
        aria-label="Trending beats carousel"
      >
        <div className="flex cursor-grab active:cursor-grabbing">
          {beats.map((beat) => (
            <div
              key={beat.id}
              className="min-w-0 px-1 py-1 shrink-0 grow-0 basis-[80%] sm:basis-[60%] md:basis-1/3 lg:basis-1/5"
            >
              <div className="h-full w-full sm:h-auto">
                <TrendingBeatCard beat={beat} onAddedToCart={onAddedToCart} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default BeatCarousel

import { useCallback, useEffect, useState } from 'react'
import useEmblaCarousel from 'embla-carousel-react'
import { Link } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { slugify } from '../utils/slugify'

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

function TrendingBeatCard({ beat, onAddedToCart }) {
  const { addBeat } = useCart() || {}
  const slug = slugify(beat.title || '')
  const to = slug ? `/beat/${beat.id}-${slug}` : `/beat/${beat.id}`
  const price = typeof beat.price === 'number' ? beat.price : Number(beat.price || 0)
  const priceLabel = price.toFixed(2)

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

  return (
    <div className="flex h-full flex-col rounded-2xl border border-white/10 bg-black/70 p-2 text-xs text-slate-100 shadow-[0_18px_40px_rgba(0,0,0,0.9)]">
      <Link to={to} className="block">
        <div className="aspect-square w-full overflow-hidden rounded-xl bg-slate-900/80">
          {beat.coverUrl ? (
            <img
              src={beat.coverUrl}
              alt={beat.title || 'Beat artwork'}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-slate-800 via-slate-900 to-black" />
          )}
        </div>
      </Link>
      <div className="mt-2 flex flex-1 flex-col">
        <Link to={to} className="block">
          <p className="line-clamp-1 text-[11px] font-semibold text-slate-50">
            {beat.title || 'Untitled beat'}
          </p>
          <p className="mt-0.5 line-clamp-1 text-[10px] text-slate-400">
            {beat.producer || 'Unknown producer'}
          </p>
        </Link>
        <div className="mt-auto pt-2 flex items-center justify-between">
          <button
            type="button"
            onClick={handleAdd}
            className="inline-flex items-center gap-1 rounded-full bg-white/95 px-3 py-1 text-[11px] font-semibold text-slate-950 shadow-[0_0_20px_rgba(248,250,252,0.45)] hover:bg-white"
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-[11px]">
              🛒
            </span>
            <span>${priceLabel}</span>
          </button>
        </div>
      </div>
    </div>
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
        className="overflow-hidden"
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

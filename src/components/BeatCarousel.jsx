import { useCallback, useEffect, useState } from 'react'
import useEmblaCarousel from 'embla-carousel-react'
import { BeatCard } from './BeatCard'

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
                <BeatCard
                  id={beat.id}
                  title={beat.title}
                  producer={beat.producer}
                  bpm={beat.bpm}
                  genre={beat.genre}
                  musicalKey={beat.musicalKey || beat.key}
                  price={beat.price}
                  coverUrl={beat.coverUrl}
                  audioUrl={beat.audioUrl}
                  userId={beat.userId}
                  square
                  onAddedToCart={onAddedToCart}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}

export default BeatCarousel

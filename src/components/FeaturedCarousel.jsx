import { BeatCard } from './BeatCard'

export default function FeaturedCarousel({ beats = [] }) {
  const featured = beats.slice(0, 8)
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-slate-100">Featured Beats</h3>
      <div
        className="flex gap-4 overflow-x-auto overflow-y-hidden pb-2 -mx-1 px-1"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {featured.map((b) => (
          <div key={b.id} className="min-w-[220px] flex-shrink-0">
            <BeatCard
              {...b}
              coverUrl={b.coverUrl || null}
              audioUrl={b.audioUrl}
              square
            />
          </div>
        ))}
        {featured.length===0 && <p className="text-xs text-slate-500">No beats yet.</p>}
      </div>
    </div>
  )
}

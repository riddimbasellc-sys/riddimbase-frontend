import { BeatCard } from './BeatCard'

export default function FeaturedCarousel({ beats = [] }) {
  const featured = beats.slice(0, 8)
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-slate-100">Featured Beats</h3>
      <div className="flex gap-4 overflow-x-auto pb-2">
        {featured.map(b => (
          <div key={b.id} className="min-w-[190px] flex-shrink-0">
            <BeatCard {...b} coverUrl={b.coverUrl || null} audioUrl={b.audioUrl} />
          </div>
        ))}
        {featured.length===0 && <p className="text-xs text-slate-500">No beats yet.</p>}
      </div>
    </div>
  )
}

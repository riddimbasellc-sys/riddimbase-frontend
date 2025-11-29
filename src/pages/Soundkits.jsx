import BackButton from '../components/BackButton'

export function Soundkits() {
  return (
    <section className="bg-slate-950/95">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="flex items-center gap-3 mb-4">
          <BackButton />
          <div>
            <h1 className="font-display text-2xl font-semibold text-slate-50">
              Soundkits
            </h1>
            <p className="mt-1 text-sm text-slate-300">
              Discover drum kits, loop packs and sample folders from Caribbean & global producers.
            </p>
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/70 bg-rb-gloss-stripes bg-blend-soft-light p-5 shadow-rb-gloss-panel">
          <p className="text-xs text-slate-300">
            The Soundkits marketplace is being wired up. Producers with Producer Pro can already upload packs from
            their dashboard; browsing and purchasing will appear here next.
          </p>
        </div>
      </div>
    </section>
  )
}

export default Soundkits


export default function SpotlightBanner() {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-emerald-500/30 bg-gradient-to-r from-emerald-600 via-emerald-500 to-orange-500 p-6 md:p-8 text-slate-950 shadow-[0_8px_30px_rgba(16,185,129,0.35)]">
      <div className="max-w-xl">
        <p className="text-xs font-bold uppercase tracking-[0.25em]">Spotlight</p>
        <h2 className="mt-2 font-display text-2xl font-semibold leading-tight">Authentic Caribbean Sound. Global Reach.</h2>
        <p className="mt-2 text-sm font-medium">Discover dancehall, TrapHall, reggae & soca beats crafted by emerging producers across the islands.</p>
        <a href="/beats" className="mt-4 inline-block rounded-full bg-slate-950 px-5 py-2 text-xs font-semibold text-emerald-400 hover:bg-slate-900">Browse Beats</a>
      </div>
      <div className="pointer-events-none absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_30%_30%,white,transparent)]" />
    </div>
  )
}

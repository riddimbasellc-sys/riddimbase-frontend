import BackButton from '../../components/BackButton'
export function SupportEarnings() {
  return (
    <section className="mx-auto max-w-4xl px-4 py-12">
      <BackButton />
      <h1 className="mt-2 font-display text-2xl font-semibold text-slate-50">Producer Earnings</h1>
      <p className="mt-3 text-sm leading-relaxed text-slate-300">Managing payouts, tracking license revenue and understanding splits.</p>
      <div className="mt-6 space-y-5">
        <div className="rounded-xl border border-slate-800/70 bg-slate-900/60 p-5">
          <h2 className="text-sm font-semibold text-slate-200">Payout Schedule</h2>
          <p className="mt-1 text-sm text-slate-400">Standard payouts process weekly; larger transfers may require manual review for fraud prevention.</p>
        </div>
        <div className="rounded-xl border border-slate-800/70 bg-slate-900/60 p-5">
          <h2 className="text-sm font-semibold text-slate-200">Earnings Dashboard</h2>
          <p className="mt-1 text-sm text-slate-400">View lifetime earnings, pending clearance, and projected monthly totals. Export functionality coming soon.</p>
        </div>
        <div className="rounded-xl border border-slate-800/70 bg-slate-900/60 p-5">
          <h2 className="text-sm font-semibold text-slate-200">Splits</h2>
          <p className="mt-1 text-sm text-slate-400">Future collaboration tools will enable automatic percentage splits. For now, handle manual reconciliations off-platform.</p>
        </div>
      </div>
    </section>
  )
}

export default SupportEarnings

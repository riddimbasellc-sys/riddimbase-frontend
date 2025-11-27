import BackButton from '../../components/BackButton'
export function SupportLicensing() {
  return (
    <section className="mx-auto max-w-4xl px-4 py-12">
      <BackButton />
      <h1 className="mt-2 font-display text-2xl font-semibold text-slate-50">Licensing Help</h1>
      <p className="mt-3 text-sm leading-relaxed text-slate-300">Understanding tiers, permitted usage and upgrade paths.</p>
      <div className="mt-6 space-y-5">
        <div className="rounded-xl border border-slate-800/70 bg-slate-900/60 p-5">
          <h2 className="text-sm font-semibold text-slate-200">Tier Overview</h2>
          <p className="mt-1 text-sm text-slate-400">Basic covers limited streams & non‑monetized use. Premium expands distribution. Unlimited removes most caps. Exclusive transfers future licensing rights (beat removed from lower tiers once purchased).</p>
        </div>
        <div className="rounded-xl border border-slate-800/70 bg-slate-900/60 p-5">
          <h2 className="text-sm font-semibold text-slate-200">Upgrades</h2>
          <p className="mt-1 text-sm text-slate-400">You may upgrade prior purchases; you pay only the difference. Keep your original receipt for validation.</p>
        </div>
        <div className="rounded-xl border border-slate-800/70 bg-slate-900/60 p-5">
          <h2 className="text-sm font-semibold text-slate-200">Stems & Exclusives</h2>
          <p className="mt-1 text-sm text-slate-400">Stems are optionally bundled in higher tiers or exclusive purchases. If missing, contact producer to negotiate add-on rights.</p>
        </div>
      </div>
    </section>
  )
}

export default SupportLicensing

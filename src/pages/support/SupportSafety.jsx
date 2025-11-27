import BackButton from '../../components/BackButton'
export function SupportSafety() {
  return (
    <section className="mx-auto max-w-4xl px-4 py-12">
      <BackButton />
      <h1 className="mt-2 font-display text-2xl font-semibold text-slate-50">Trust & Safety</h1>
      <p className="mt-3 text-sm leading-relaxed text-slate-300">Keeping the community secure, respectful and rights‑protected.</p>
      <div className="mt-6 space-y-5">
        <div className="rounded-xl border border-slate-800/70 bg-slate-900/60 p-5">
          <h2 className="text-sm font-semibold text-slate-200">Reporting</h2>
          <p className="mt-1 text-sm text-slate-400">Use the "Report" button on beats or profiles to flag infringement, harassment, spam or suspicious activity. Reports are anonymous.</p>
        </div>
        <div className="rounded-xl border border-slate-800/70 bg-slate-900/60 p-5">
          <h2 className="text-sm font-semibold text-slate-200">Moderation Workflow</h2>
          <p className="mt-1 text-sm text-slate-400">Admin reviewers categorize and act (resolve or dismiss). Repeat violations escalate to temporary or permanent restrictions.</p>
        </div>
        <div className="rounded-xl border border-slate-800/70 bg-slate-900/60 p-5">
          <h2 className="text-sm font-semibold text-slate-200">Content Integrity</h2>
          <p className="mt-1 text-sm text-slate-400">Only upload assets you own or have licensed. DMCA style takedown tools will be integrated as features mature.</p>
        </div>
      </div>
    </section>
  )
}

export default SupportSafety

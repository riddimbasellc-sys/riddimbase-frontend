import BackButton from '../components/BackButton'
export function Terms() {
  return (
    <section className="mx-auto max-w-4xl px-4 py-12">
      <BackButton />
      <h1 className="mt-2 font-display text-2xl font-semibold text-slate-50">Terms of Service</h1>
      <p className="mt-4 text-sm leading-relaxed text-slate-300">These terms outline acceptable use, licensing rules and platform conduct. A full legal document will replace this condensed version.</p>
      <h2 className="mt-8 text-sm font-semibold text-slate-200">1. Licensing Framework</h2>
      <p className="mt-2 text-sm text-slate-400">Beats are licensed per selected tier. Unauthorized redistribution, resale or sublicensing is prohibited unless specified under Exclusive terms.</p>
      <h2 className="mt-6 text-sm font-semibold text-slate-200">2. Producer Content</h2>
      <p className="mt-2 text-sm text-slate-400">Producers must own or control rights to all uploaded audio, artwork and metadata.</p>
      <h2 className="mt-6 text-sm font-semibold text-slate-200">3. Fair Use & Conduct</h2>
      <p className="mt-2 text-sm text-slate-400">Harassment, fraud, spam and infringement will result in account review and potential suspension.</p>
      <h2 className="mt-6 text-sm font-semibold text-slate-200">4. Refunds</h2>
      <p className="mt-2 text-sm text-slate-400">Refunds are evaluated case-by-case for technical defects or misrepresentation.</p>
      <h2 className="mt-6 text-sm font-semibold text-slate-200">5. Changes</h2>
      <p className="mt-2 text-sm text-slate-400">Terms may evolve; continued use indicates acceptance of updates.</p>
      <p className="mt-8 text-[11px] text-slate-500">Last updated placeholder — formal policy coming soon.</p>
    </section>
  )
}

export default Terms

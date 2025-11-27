import BackButton from '../components/BackButton'
export function Privacy() {
  return (
    <section className="mx-auto max-w-4xl px-4 py-12">
      <BackButton />
      <h1 className="mt-2 font-display text-2xl font-semibold text-slate-50">Privacy Policy</h1>
      <p className="mt-4 text-sm leading-relaxed text-slate-300">We respect artist and producer privacy. This summary describes data we handle and upcoming transparency controls. A full policy document will replace this draft.</p>
      <h2 className="mt-8 text-sm font-semibold text-slate-200">Data Collected</h2>
      <ul className="mt-2 list-disc list-inside space-y-1 text-sm text-slate-400">
        <li>Account identifiers (email, display name)</li>
        <li>Profile metadata (social links, media)</li>
        <li>Transactional records (license purchases, payouts)</li>
        <li>Engagement metrics (likes, favorites, follows)</li>
      </ul>
      <h2 className="mt-6 text-sm font-semibold text-slate-200">Usage</h2>
      <p className="mt-2 text-sm text-slate-400">We use data to facilitate licensing, maintain trust & safety, and improve discovery features.</p>
      <h2 className="mt-6 text-sm font-semibold text-slate-200">Third Parties</h2>
      <p className="mt-2 text-sm text-slate-400">Payment processors and analytics providers operate under contractual confidentiality; no sale of personal data.</p>
      <h2 className="mt-6 text-sm font-semibold text-slate-200">Future Controls</h2>
      <p className="mt-2 text-sm text-slate-400">Download your data and fine-grained visibility settings are planned roadmap features.</p>
      <p className="mt-8 text-[11px] text-slate-500">Last updated placeholder — formal policy coming soon.</p>
    </section>
  )
}

export default Privacy

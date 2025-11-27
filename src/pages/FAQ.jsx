import BackButton from '../components/BackButton'
export function FAQ() {
  const faqs = [
    { q: 'How do I license a beat?', a: 'Open a beat detail page and select a license tier. Proceed through secure checkout to receive download and license document.' },
    { q: 'Can I upgrade my license later?', a: 'Yes. Contact support with your order reference; you pay only the tier difference.' },
    { q: 'Do you offer exclusive rights?', a: 'Producers may list Exclusive tiers; once purchased, lower tiers disable automatically.' },
    { q: 'What payment methods are supported?', a: 'Major cards currently; additional regional payment options are being integrated.' },
    { q: 'How do I report an issue?', a: 'Use the Report button on a beat or profile, or reach Support directly.' }
  ]
  return (
    <section className="mx-auto max-w-4xl px-4 py-12">
      <BackButton />
      <h1 className="mt-2 font-display text-2xl font-semibold text-slate-50">Frequently Asked Questions</h1>
      <div className="mt-6 space-y-6">
        {faqs.map(item => (
          <div key={item.q} className="rounded-xl border border-slate-800/70 bg-slate-900/60 p-4">
            <h2 className="text-sm font-semibold text-slate-200">{item.q}</h2>
            <p className="mt-1 text-sm text-slate-400 leading-relaxed">{item.a}</p>
          </div>
        ))}
      </div>
      <p className="mt-8 text-[11px] text-slate-500">Need more help? Visit Support for direct assistance.</p>
    </section>
  )
}

export default FAQ

import BackButton from '../components/BackButton'
export function About() {
  return (
    <section className="mx-auto max-w-4xl px-4 py-12">
      <BackButton />
      <h1 className="mt-2 font-display text-2xl font-semibold text-slate-50">About RiddimBase</h1>
      <p className="mt-4 text-sm leading-relaxed text-slate-300">RiddimBase is a dedicated marketplace and creative hub for Caribbean-influenced production: dancehall, reggae, soca, afrobeats crossover and emerging hybrid sounds. We help producers showcase catalogues, connect with artists and offer transparent licensing tiers.</p>
      <h2 className="mt-8 text-sm font-semibold text-slate-200">Mission</h2>
      <p className="mt-2 text-sm text-slate-400">Empower authentic Caribbean music creation globally with fair pricing, modern tooling and community-driven discovery.</p>
      <h2 className="mt-8 text-sm font-semibold text-slate-200">What We Provide</h2>
      <ul className="mt-2 space-y-2 text-sm text-slate-400 list-disc list-inside">
        <li>Streamlined beat licensing across clear tiers</li>
        <li>Producer profile pages with media & social presence</li>
        <li>Real-time engagement metrics for transparency</li>
        <li>Anonymous reporting & moderation for trust & safety</li>
        <li>Upcoming collaboration & stems marketplace features</li>
      </ul>
    </section>
  )
}

export default About

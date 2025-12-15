import BackButton from '../components/BackButton'
export function About() {
  return (
    <section className="mx-auto max-w-4xl px-4 py-12">
      <BackButton />
      <h1 className="mt-2 font-display text-2xl font-semibold text-slate-50">
        About RiddimBase
      </h1>
      <p className="mt-4 text-sm leading-relaxed text-slate-300">
        RiddimBase is a modern marketplace built to empower Caribbean producers
        and beat makers around the world.
      </p>
      <p className="mt-3 text-sm leading-relaxed text-slate-300">
        Our mission is simple: give producers the tools, visibility, and freedom
        to monetize their sound—without the barriers of traditional platforms.
      </p>
      <p className="mt-3 text-sm leading-relaxed text-slate-300">
        From dancehall and reggae to afrobeats, soca, and Caribbean-influenced
        trap, RiddimBase is designed to showcase authentic sounds while making
        it easy for artists to license, sell, and promote their beats.
      </p>

      <h2 className="mt-8 text-sm font-semibold text-slate-200">
        What We Offer
      </h2>
      <ul className="mt-2 space-y-2 text-sm text-slate-300 list-disc list-inside">
        <li>A dedicated marketplace for Caribbean beats</li>
        <li>Secure licensing and instant file delivery</li>
        <li>Producer dashboards with performance insights</li>
        <li>Real-time sales and activity notifications</li>
        <li>A growing community of creators and artists</li>
      </ul>

      <p className="mt-8 text-sm leading-relaxed text-slate-300">
        RiddimBase is more than a platform — it’s a home for producers building
        global careers from their sound.
      </p>
    </section>
  )
}

export default About

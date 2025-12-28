import { Link } from 'react-router-dom'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-zinc-900 to-black text-white">
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(236,72,153,0.15),transparent_60%)]" />
        <div className="relative mx-auto max-w-7xl px-6 py-32 text-center">
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight">
            The Caribbean Home for
            <span className="block bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
              Beats, Producers & Artists
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-zinc-300">
            Buy, sell, collaborate, record, and split royalties — all in one modern platform built for the culture.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Link to="/signup" className="rounded-full bg-pink-600 px-8 py-4 font-semibold hover:bg-pink-500 transition">
              Get Started Free
            </Link>
            <Link to="/beats" className="rounded-full border border-zinc-700 px-8 py-4 font-semibold hover:border-pink-500 hover:text-pink-400 transition">
              Browse Beats
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-24 grid gap-10 md:grid-cols-3">
        {[
          { title: 'Sell Beats Smarter', desc: 'Instant payouts, license automation, boosts, and global reach.' },
          { title: 'Recording Lab', desc: 'Record vocals, arrange tracks, and collaborate directly in your browser.' },
          { title: 'Automated Splits', desc: 'Add collaborators and let RiddimBase handle royalty splits automatically.' },
        ].map((f, i) => (
          <div key={i} className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-8 hover:border-pink-500/50 transition">
            <h3 className="text-xl font-bold">{f.title}</h3>
            <p className="mt-3 text-zinc-400">{f.desc}</p>
          </div>
        ))}
      </section>

      <section className="mx-auto max-w-7xl px-6 py-24 text-center">
        <div className="rounded-3xl border border-zinc-800 bg-gradient-to-r from-zinc-900 to-black p-16">
          <h2 className="text-3xl md:text-4xl font-bold">Start Building Your Catalog Today</h2>
          <p className="mt-4 text-zinc-400">Producers, artists, engineers — your new home starts here.</p>
          <Link to="/signup" className="mt-8 inline-block rounded-full bg-gradient-to-r from-pink-500 to-purple-600 px-10 py-4 font-semibold">
            Join RiddimBase
          </Link>
        </div>
      </section>

      <footer className="border-t border-zinc-800 py-8 text-center text-sm text-zinc-500">
        © {new Date().getFullYear()} RiddimBase. Built for the culture.
      </footer>
    </div>
  )
}

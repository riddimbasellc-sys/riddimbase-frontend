import { Link } from 'react-router-dom'
import { GenreChips } from './GenreChips'

export function Hero() {
  return (
    <section className="border-b border-slate-900/70 bg-rb-trop-radial">
      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-10 md:flex-row md:items-center md:py-16">
        <div className="flex-1">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-rb-sun-gold drop-shadow-rb-glow">
            RiddimBase • Home of Caribbean Beats
          </p>
          <h1 className="mt-3 font-display text-4xl font-semibold leading-tight text-slate-50 md:text-5xl">
            Discover & sell authentic{' '}
            <span className="bg-rb-trop-sunrise bg-clip-text text-transparent drop-shadow-rb-glow">
              Caribbean riddims
            </span>
            .
          </h1>
          <p className="mt-4 max-w-xl text-sm text-slate-200">
            A marketplace built for dancehall, reggae, soca, Afrobeats and TrapHall. Connect
            producers and artists across the Caribbean and the world.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/beats"
              className="rounded-full bg-rb-trop-sunrise px-5 py-2 text-xs font-semibold text-slate-950 shadow-rb-gloss-btn hover:brightness-110 transition duration-200 ease-snappy"
            >
              Browse Beats
            </Link>
            <Link
              to="/producer/dashboard"
              className="rounded-full border border-rb-trop-cyan/60 bg-slate-900/80 px-5 py-2 text-xs font-semibold text-rb-trop-cyan hover:bg-slate-900/90 hover:border-rb-sun-gold/70 hover:text-rb-sun-gold transition duration-200 ease-snappy"
            >
              I&apos;m a Producer
            </Link>
          </div>
          <GenreChips />
          <p className="mt-4 text-[11px] text-slate-400">
            Upload riddims, set your licenses, and turn your sound into income.
          </p>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="relative w-full max-w-md rounded-3xl border border-slate-800/80 bg-slate-950/90 bg-rb-gloss-stripes bg-blend-soft-light p-4 shadow-rb-gloss-panel">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-rb-trop-sunrise shadow-rb-gloss-btn" />
              <div>
                <p className="text-xs font-semibold text-slate-200">
                  Island Trap Type Beat
                </p>
                <p className="text-[11px] text-slate-400">
                  by BeatYaad • TrapHall • 140 BPM
                </p>
              </div>
              <span className="ml-auto rounded-full bg-rb-fiery-red/10 px-3 py-1 text-[10px] font-semibold text-rb-sun-gold border border-rb-fiery-red/60 drop-shadow-rb-glow">
                🔥 Featured
              </span>
            </div>
            <div className="mt-4 h-20 rounded-xl bg-slate-900/80">
              <div className="h-full w-full bg-[radial-gradient(circle_at_0_0,#22c55e22,transparent_55%),radial-gradient(circle_at_100%_100%,#f9731622,transparent_55%)] flex items-center justify-center text-[11px] text-slate-500">
                Waveform preview
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between gap-2">
              <button className="rounded-full bg-rb-trop-cyan px-4 py-1.5 text-xs font-semibold text-slate-950 shadow-rb-gloss-btn hover:brightness-110 transition duration-150 ease-snappy">
                ▶ Play
              </button>
              <div className="flex flex-col text-right">
                <span className="text-[11px] text-slate-400">Licenses from</span>
                <span className="text-sm font-semibold text-rb-sun-gold">
                  $29.00
                </span>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-[10px] text-slate-400">
              <div className="rounded-xl border border-slate-800/80 bg-slate-900/80 p-2">
                <p className="font-semibold text-slate-200">Dancehall</p>
                <p>Roots, modern & trap blends.</p>
              </div>
              <div className="rounded-xl border border-slate-800/80 bg-slate-900/80 p-2">
                <p className="font-semibold text-slate-200">Soca & Fete</p>
                <p>High-energy carnival riddims.</p>
              </div>
              <div className="rounded-xl border border-slate-800/80 bg-slate-900/80 p-2">
                <p className="font-semibold text-slate-200">Afro Fusion</p>
                <p>Island drums meet Afrobeats.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}


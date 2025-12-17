import { Link } from 'react-router-dom'
import { GenreChips } from './GenreChips'

export function Hero() {
  return (
    <section className="border-b border-slate-900/70 bg-rb-trop-radial">
      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-8 md:flex-row md:items-center md:py-14">
        <div className="flex-1">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-rb-sun-gold drop-shadow-rb-glow">
            RiddimBase • Home of Caribbean Beats
          </p>
          <h1 className="mt-3 font-display text-3xl font-semibold leading-tight text-slate-50 md:text-5xl">
            Discover & sell authentic{' '}
            <span className="bg-rb-trop-sunrise bg-clip-text text-transparent drop-shadow-rb-glow">
              Caribbean riddims
            </span>
            .
          </h1>
          <p className="mt-3 max-w-xl text-sm text-slate-200">
            A marketplace built for dancehall, reggae, soca, Afrobeats and TrapHall. Connect
            producers and artists across the Caribbean and the world.
          </p>
          {/* Primary search pill */}
          <div className="mt-5">
            <div className="flex items-center justify-center">
              <div className="flex w-full max-w-xl items-center gap-2 rounded-full bg-slate-950/90 px-4 py-2 shadow-rb-gloss-panel ring-1 ring-slate-800/70 md:px-6 md:py-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900/90 text-slate-300 md:h-9 md:w-9">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    className="h-4 w-4 md:h-5 md:w-5"
                  >
                    <circle cx="11" cy="11" r="6" />
                    <path d="m16 16 4 4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Explore new sounds — search beats, producers, services"
                  className="h-9 flex-1 bg-transparent text-[11px] text-slate-100 placeholder:text-slate-500 focus:outline-none md:h-10 md:text-sm"
                />
                <Link
                  to="/beats"
                  className="hidden shrink-0 rounded-full border border-emerald-400/70 bg-emerald-500/10 px-4 py-1.5 text-[11px] font-semibold text-emerald-200 hover:bg-emerald-500/20 md:inline-flex"
                >
                  Search
                </Link>
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <Link to="/beats" className="rb-btn-primary rb-hover-lift">Browse Beats</Link>
            <Link to="/producer/dashboard" className="rb-btn-outline rb-hover-lift">I&apos;m a Producer</Link>
          </div>
          <GenreChips />
          <p className="mt-3 text-[11px] text-slate-400">
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

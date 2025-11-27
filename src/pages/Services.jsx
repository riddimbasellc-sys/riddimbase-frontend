import BackButton from '../components/BackButton'
import { listProviders } from '../services/serviceProvidersService'
import { Link } from 'react-router-dom'
import SocialIconRow from '../components/SocialIconRow'

export function Services() {
  const providers = listProviders()
  return (
    <section className="bg-slate-950/95">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="flex items-center gap-3">
          <BackButton />
          <h1 className="font-display text-2xl font-semibold text-slate-50">Production Services</h1>
        </div>
        <p className="mt-1 max-w-2xl text-sm text-slate-300">
          Browse engineers and producers offering mix & master, custom beats, studio sessions and more.
        </p>
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {providers.map((p) => (
            <Link
              key={p.id}
              to={`/services/${p.id}`}
              className="group rounded-2xl border border-slate-800/70 bg-slate-900/70 p-5 hover:border-emerald-400/60 transition"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-slate-100 group-hover:text-emerald-300 transition">
                    {p.name}
                  </h2>
                  <p className="mt-1 text-[11px] text-slate-400">{p.location}</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800/80 text-[10px] font-bold text-slate-300">
                  {p.name
                    .split(' ')
                    .map((w) => w[0])
                    .slice(0, 2)
                    .join('')}
                </div>
              </div>
              <p className="mt-3 line-clamp-3 text-[11px] text-slate-400">{p.bio}</p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {p.tags.map((t) => (
                  <span
                    key={t}
                    className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-300"
                  >
                    {t}
                  </span>
                ))}
              </div>
              {p.contact && (
                <SocialIconRow
                  website={p.contact.website}
                  instagram={p.contact.instagram}
                  twitterX={p.contact.twitterX}
                  whatsapp={p.contact.whatsapp}
                  telegram={p.contact.telegram}
                  size="xs"
                />
              )}
              <div className="mt-4 flex items-center justify-between text-[10px] text-slate-400">
                <span>{p.catalog.length} / 3 catalog beats</span>
                <span className="text-emerald-400 group-hover:translate-x-1 transition-transform">
                  View �+'
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}

export default Services


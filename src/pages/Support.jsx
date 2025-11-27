import { Link } from 'react-router-dom'

const channels = [
  { key: 'general', title: 'General Inquiries', blurb: 'Questions about features or getting started.', cta: 'Contact', icon: GeneralIcon, color: 'from-emerald-500 via-emerald-400 to-cyan-500' },
  { key: 'licensing', title: 'Licensing Help', blurb: 'Usage rights, upgrades & exclusive terms.', cta: 'Licensing FAQ', icon: LicenseIcon, color: 'from-indigo-500 via-violet-500 to-fuchsia-500' },
  { key: 'earnings', title: 'Producer Earnings', blurb: 'Withdrawals, splits and payout delays.', cta: 'Payout Guide', icon: EarningsIcon, color: 'from-amber-500 via-orange-500 to-rose-500' },
  { key: 'safety', title: 'Trust & Safety', blurb: 'Report misconduct or policy violations.', cta: 'Report Center', icon: SafetyIcon, color: 'from-rose-500 via-red-500 to-orange-500' }
]

import BackButton from '../components/BackButton'
export function Support() {
  return (
    <section className="mx-auto max-w-5xl px-4 py-12">
      <BackButton />
      <h1 className="mt-2 font-display text-2xl font-semibold text-slate-50">Support</h1>
      <p className="mt-3 text-sm leading-relaxed text-slate-300 max-w-2xl">Guidance for licensing, earnings, trust & safety and general platform use. Select a channel below to view detailed resources.</p>
      <div className="mt-8 grid gap-5 sm:grid-cols-2">
        {channels.map(ch => (
          <Link
            key={ch.key}
            to={`/support/${ch.key}`}
            className="group relative overflow-hidden rounded-2xl border border-slate-800/70 bg-slate-900/60 p-5 transition hover:border-emerald-400/60 hover:bg-slate-900/80"
            aria-label={`${ch.title} – open details`}
          >
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition">
              <div className={`pointer-events-none absolute -inset-[2px] rounded-2xl bg-gradient-to-r ${ch.color} blur-xl opacity-30`} />
            </div>
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800/80 ring-1 ring-slate-700/60 group-hover:ring-emerald-400/60">
                <ch.icon className="h-5 w-5 text-emerald-300 group-hover:text-emerald-200 transition" />
              </span>
              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-slate-200 group-hover:text-emerald-300 transition">{ch.title}</h2>
                <p className="mt-1 text-[12px] text-slate-400 leading-relaxed">{ch.blurb}</p>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 text-[11px] font-medium text-emerald-300">
              <span>{ch.cta}</span>
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M13 6l6 6-6 6"/></svg>
            </div>
          </Link>
        ))}
      </div>
      <p className="mt-10 text-[11px] text-slate-500">Average response time: under 24 hours • Expanded documentation coming soon.</p>
    </section>
  )
}

function GeneralIcon(props){return(<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="12" cy="12" r="9"/><path d="M12 8v5"/><path d="M12 16h.01"/></svg>)}
function LicenseIcon(props){return(<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M8 8h8"/><path d="M8 12h5"/><path d="M8 16h6"/></svg>)}
function EarningsIcon(props){return(<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M4 10a8 8 0 0 1 16 0c0 4-4 8-8 10-4-2-8-6-8-10Z"/><path d="M12 10v4"/><path d="M12 14h3"/></svg>)}
function SafetyIcon(props){return(<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M12 3 4 6v6c0 5 3.3 9.4 8 10 4.7-.6 8-5 8-10V6l-8-3Z"/><path d="M12 9v4"/><path d="M12 16h.01"/></svg>)}

export default Support

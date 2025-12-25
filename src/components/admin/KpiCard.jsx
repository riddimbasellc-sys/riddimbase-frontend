import React from 'react'

export default function KpiCard({ label, value, sublabel, delta, positive, icon: Icon, onClick }) {
  const deltaColor = delta == null ? 'text-slate-400' : positive ? 'text-emerald-400' : 'text-rose-400'
  const deltaBg = delta == null ? 'bg-slate-900/60' : positive ? 'bg-emerald-500/10' : 'bg-rose-500/10'

  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex h-full w-full flex-col items-start justify-between rounded-2xl border border-slate-800/80 bg-slate-900/80 px-3 py-2 text-left shadow-sm transition hover:border-emerald-400/60 hover:bg-slate-900/95 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60"
    >
      <div className="flex w-full items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-[11px] font-medium text-slate-300">
          {Icon && (
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-slate-950/70 text-emerald-300 group-hover:text-emerald-200">
              <Icon className="h-3.5 w-3.5" />
            </span>
          )}
          <span className="truncate uppercase tracking-[0.18em] text-[10px] text-slate-400">
            {label}
          </span>
        </div>
        {delta != null && (
          <span className={`inline-flex items-center rounded-full px-2 py-[2px] text-[10px] font-semibold ${deltaBg} ${deltaColor}`}>
            {positive ? '+' : ''}{delta}%
          </span>
        )}
      </div>
      <div className="mt-1 flex w-full items-end justify-between">
        <p className="text-base font-semibold text-slate-50">
          {value}
        </p>
        {sublabel && (
          <p className="ml-2 max-w-[6rem] truncate text-[10px] text-slate-400">
            {sublabel}
          </p>
        )}
      </div>
    </button>
  )
}

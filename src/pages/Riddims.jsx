import BackButton from '../components/BackButton'
import { listOpenRiddims, reserveSlot } from '../services/riddimsService'
import { useState } from 'react'

export function Riddims() {
  const [items, setItems] = useState(listOpenRiddims())

  const handleReserve = (id) => {
    const updated = reserveSlot(id)
    if (updated) {
      setItems(listOpenRiddims())
    }
  }

  return (
    <section className="bg-slate-950/95">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="flex items-center gap-3">
          <BackButton />
          <h1 className="font-display text-2xl font-semibold text-slate-50">Riddim Marketplace</h1>
        </div>
        <p className="mt-1 text-sm text-slate-300">Claim a slot on open riddims and collaborate.</p>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {items.map(r => (
            <div key={r.id} className="rounded-2xl border border-slate-800/80 bg-slate-900/80 p-4 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-100">{r.name}</p>
                <span className="text-[10px] rounded-full bg-emerald-500/10 px-2 py-0.5 text-emerald-300">{r.genre}</span>
              </div>
              <p className="text-[11px] text-slate-400">{r.bpm} BPM • Slots {r.slotsFilled}/{r.slotsTotal}</p>
              <p className="text-[11px] text-slate-500">Slot: ${r.pricePerSlot}</p>
              <button
                disabled={r.slotsFilled >= r.slotsTotal}
                onClick={() => handleReserve(r.id)}
                className="mt-auto rounded-full bg-emerald-500 px-4 py-1.5 text-[11px] font-semibold text-slate-950 disabled:opacity-40"
              >
                {r.slotsFilled >= r.slotsTotal ? 'Filled' : 'Reserve Slot'}
              </button>
            </div>
          ))}
          {items.length === 0 && <p className="text-sm text-slate-400">No open riddims right now.</p>}
        </div>
      </div>
    </section>
  )
}

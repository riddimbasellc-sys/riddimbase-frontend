import { useAdminRole } from '../hooks/useAdminRole'
import BackButton from '../components/BackButton'
import { useState, useEffect } from 'react'
import { listAllPayouts, markPayoutCompleted } from '../services/payoutsRepository'
import { getSubscription } from '../services/subscriptionService'
import { addNotification } from '../services/notificationsRepository'

export function AdminPayouts() {
  const { isAdmin, loading } = useAdminRole()
  const [items, setItems] = useState([])
  const [loadingPayouts, setLoadingPayouts] = useState(true)
  const [plansByUser, setPlansByUser] = useState({})

  const parseMethodDetails = (value) => {
    if (!value) return {}
    if (typeof value === 'object') return value
    try {
      return JSON.parse(value)
    } catch {
      return {}
    }
  }

  useEffect(() => {
    ;(async () => {
      try {
        setItems(await listAllPayouts())
      } finally {
        setLoadingPayouts(false)
      }
    })()
  }, [])

  useEffect(() => {
    ;(async () => {
      if (!items.length) {
        setPlansByUser({})
        return
      }
      const ids = Array.from(new Set(items.map((p) => p.userId).filter(Boolean)))
      const map = {}
      for (const id of ids) {
        try {
          const sub = await getSubscription(id)
          const planId = sub?.planId || 'free'
          const payoutType = planId === 'producer-pro' ? 'instant' : 'regular'
          map[id] = { planId, payoutType }
        } catch {
          map[id] = { planId: 'free', payoutType: 'regular' }
        }
      }
      setPlansByUser(map)
    })()
  }, [items])

  if (loading) {
    return (
      <section className="min-h-screen flex items-center justify-center bg-slate-950/95">
        <p className="text-sm text-slate-400">Loading…</p>
      </section>
    )
  }
  if (!isAdmin) {
    return (
      <section className="min-h-screen flex items-center justify-center bg-slate-950/95">
        <p className="text-sm text-slate-400">Access denied.</p>
      </section>
    )
  }

  const complete = async (id) => {
    const updated = await markPayoutCompleted(id)
    if (updated && updated.userId) {
      try {
        await addNotification({
          recipientId: updated.userId,
          actorId: null,
          type: 'payout-completed',
          data: {
            amount: Number(updated.amount) || 0,
            currency: updated.currency || 'USD',
          },
        })
      } catch {
        // ignore notification failure
      }
    }
    setItems(await listAllPayouts())
  }

  return (
    <section className="bg-slate-950/95">
      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="flex items-center gap-3">
          <BackButton />
          <h1 className="font-display text-2xl font-semibold text-slate-50">
            Payout Management
          </h1>
        </div>
        <p className="mt-1 text-sm text-slate-300">
          Review and mark producer withdrawals. Producer Pro accounts qualify for instant payouts.
        </p>
        <div className="mt-6 space-y-3">
          {loadingPayouts && <p className="text-sm text-slate-400">Loading payouts…</p>}
          {!loadingPayouts &&
            items.map((p) => {
              const planInfo = plansByUser[p.userId]
              const details = parseMethodDetails(p.methodDetails)
              const addr = details.address || {}
              const payoutType =
                planInfo?.payoutType === 'instant' ? 'Instant payout' : 'Regular payout'
              const badgeClass =
                planInfo?.payoutType === 'instant'
                  ? 'border-emerald-400/70 bg-emerald-500/10 text-emerald-300'
                  : 'border-slate-600/70 bg-slate-800/80 text-slate-200'

              return (
                <div
                  key={p.id}
                  className="rounded-xl border border-slate-800/80 bg-slate-900/80 p-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between shadow-[0_12px_40px_rgba(15,23,42,0.8)]"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-100">Request #{p.id}</p>
                    <p className="mt-0.5 text-[11px] text-slate-400">
                      User: {p.userId} • Amount: ${p.amount} {p.currency}
                    </p>
                    {(details.firstName || details.lastName || details.paypalEmail) && (
                      <p className="mt-0.5 text-[11px] text-slate-400">
                        Recipient:{' '}
                        {[details.firstName, details.lastName].filter(Boolean).join(' ')}
                        {details.paypalEmail ? ` • PayPal: ${details.paypalEmail}` : ''}
                      </p>
                    )}
                    {addr.line1 && (
                      <p className="mt-0.5 text-[10px] text-slate-500">
                        Address: {addr.line1}
                        {addr.line2 ? `, ${addr.line2}` : ''}
                        {addr.city ? `, ${addr.city}` : ''}
                        {addr.state ? `, ${addr.state}` : ''}
                        {addr.postalCode ? `, ${addr.postalCode}` : ''}
                        {addr.country ? `, ${addr.country}` : ''}
                      </p>
                    )}
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px]">
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-[2px] font-semibold ${badgeClass}`}
                      >
                        {payoutType}
                      </span>
                      <span className="text-slate-500">Status: {p.status}</span>
                    </div>
                  </div>
                  <div className="mt-1 flex gap-2 text-[11px] md:mt-0">
                    {p.status === 'pending' && (
                      <button
                        onClick={() => complete(p.id)}
                        className="rounded-full border border-emerald-500/70 bg-emerald-500/10 px-3 py-1 text-emerald-200 hover:bg-emerald-500/20"
                      >
                        Mark Complete
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          {!loadingPayouts && items.length === 0 && (
            <p className="text-sm text-slate-400">No payout requests.</p>
          )}
        </div>
        <p className="mt-6 text-[11px] text-slate-500">
          Auto-email on payout completion will be implemented server-side.
        </p>
      </div>
    </section>
  )
}

export default AdminPayouts

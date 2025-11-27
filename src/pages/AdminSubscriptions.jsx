import AdminLayout from '../components/AdminLayout'
import { useAdminRole } from '../hooks/useAdminRole'
import { useEffect, useState } from 'react'
import { listPlans } from '../services/plansRepository'

export function AdminSubscriptions() {
  const { isAdmin, loading } = useAdminRole()
  const [plans, setPlans] = useState([])

  useEffect(() => {
    ;(async () => {
      setPlans(await listPlans())
    })()
  }, [])

  if (loading) {
    return (
      <section className="min-h-screen flex items-center justify-center bg-slate-950/95">
        <p className="text-sm text-slate-400">Loading admin access…</p>
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

  return (
    <AdminLayout
      title="Subscriptions"
      subtitle="High-level view of membership plans and how producers are using them."
    >
      <div className="grid gap-6 lg:grid-cols-[1.1fr,0.9fr]">
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-800/80 bg-gradient-to-br from-slate-900/90 to-slate-950/90 p-5 shadow-lg">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-emerald-300">
              Overview
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-100">
              Subscription health
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <Metric label="Active plans" value={plans.length} />
              <Metric label="Recurring billing" value="PayPal subscriptions" />
              <Metric label="Auto-renew" value="Enabled" />
            </div>
          </div>
          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/90 p-4 shadow-lg">
            <p className="text-sm font-semibold text-slate-100">Recommended setup</p>
            <ul className="mt-3 space-y-1.5 text-[11px] text-slate-300">
              <li>
                • Use PayPal Subscriptions or another billing provider to handle
                auto-charges and card updates.
              </li>
              <li>
                • Store active subscriptions in Supabase (user_id, plan_id, renews_at,
                auto_renew) as the source of truth.
              </li>
              <li>
                • Run a daily scheduled job that sends reminder emails 7, 2 and 1 days
                before renewals and updates statuses after failed payments.
              </li>
              <li>
                • Surface expiring users here so you can intervene with coupons or trial
                extensions.
              </li>
            </ul>
          </div>
        </div>
        <div className="space-y-3">
          {plans.map((p) => (
            <div
              key={p.id}
              className="rounded-2xl border border-slate-800/80 bg-slate-900/95 p-4 shadow-lg"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-slate-100">{p.name}</p>
                  <p className="text-[11px] text-slate-400">
                    ${p.monthly}/mo · ${p.yearly}/yr
                  </p>
                </div>
                {p.badge && (
                  <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-300">
                    {p.badge}
                  </span>
                )}
              </div>
              <ul className="mt-3 space-y-1 text-[11px] text-slate-300">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-emerald-400/90" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-[10px] text-slate-500">
                Hook this plan id (<span className="font-mono text-slate-300">{p.id}</span>
                ) into your Supabase subscriptions table and PayPal pricing IDs to track
                real subscribers.
              </p>
            </div>
          ))}
          {plans.length === 0 && (
            <div className="rounded-2xl border border-slate-800/80 bg-slate-900/95 p-4 text-[12px] text-slate-400">
              No plans defined yet. Create plans first, then wire this page to your
              billing backend.
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}

function Metric({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-800/80 bg-slate-950/90 p-3">
      <p className="text-[11px] text-slate-400">{label}</p>
      <p className="mt-1 text-base font-semibold text-slate-50">{value}</p>
    </div>
  )
}

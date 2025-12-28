import AdminLayout from '../components/AdminLayout'
import { useAdminRole } from '../hooks/useAdminRole'
import { useEffect, useState } from 'react'
import { listPlans } from '../services/plansRepository'
import { fetchAdminUsers } from '../services/adminUsersRepository'
import { getUserPlan } from '../services/subscriptionService'

export function AdminSubscriptions() {
  const { isAdmin, loading } = useAdminRole()
  const [plans, setPlans] = useState([])
  const [users, setUsers] = useState([])
  const [plansByUser, setPlansByUser] = useState({})
  const [usersLoading, setUsersLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    ;(async () => {
      setPlans(await listPlans())
    })()
  }, [])

  useEffect(() => {
    ;(async () => {
      try {
        const data = await fetchAdminUsers()
        setUsers(data || [])
      } catch {
        setUsers([])
      } finally {
        setUsersLoading(false)
      }
    })()
  }, [])

  useEffect(() => {
    ;(async () => {
      if (!users.length) {
        setPlansByUser({})
        return
      }
      const map = {}
      for (const u of users) {
        try {
          const planId = await getUserPlan(u.id)
          map[u.id] = planId || 'free'
        } catch {
          map[u.id] = 'free'
        }
      }
      setPlansByUser(map)
    })()
  }, [users])

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
      <div className="grid gap-6 xl:grid-cols-[1.1fr,1.1fr]">
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
        <div className="space-y-3">
          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/95 p-4 shadow-lg">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-emerald-300">
                  Users
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-100">
                  Plans by user
                </p>
                <p className="mt-0.5 text-[11px] text-slate-400">
                  See which plan each account is on, similar to BeatStars admin.
                </p>
              </div>
              <div className="w-48">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by email or id…"
                  className="w-full rounded-full border border-slate-700/80 bg-slate-900/80 px-3 py-1.5 text-[11px] text-slate-100 placeholder:text-slate-500 focus:border-emerald-400/80 focus:outline-none"
                />
              </div>
            </div>
            {usersLoading ? (
              <p className="mt-4 text-[12px] text-slate-400">Loading users…</p>
            ) : users.length === 0 ? (
              <p className="mt-4 text-[12px] text-slate-400">No users found.</p>
            ) : (
              <div
                className={`mt-4 space-y-2 ${users.length > 4 ? 'max-h-[60vh] overflow-y-auto pr-1' : ''}`}
              >
                {users
                  .filter((u) => {
                    if (!search.trim()) return true
                    const q = search.toLowerCase()
                    return (
                      (u.email && u.email.toLowerCase().includes(q)) ||
                      (u.id && u.id.toLowerCase().includes(q))
                    )
                  })
                  .map((u) => {
                    const planId = plansByUser[u.id] || 'free'
                    const isFree = planId === 'free' || !planId
                    const label = isFree ? 'Free' : planId
                    const badgeClass = isFree
                      ? 'border-slate-600/70 bg-slate-800/80 text-slate-200'
                      : 'border-emerald-400/80 bg-emerald-500/10 text-emerald-300'
                    return (
                      <div
                        key={u.id}
                        className="flex items-center justify-between gap-3 rounded-xl border border-slate-800/80 bg-slate-950/80 px-3 py-2 text-[11px] text-slate-200"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-[12px] font-semibold text-slate-100">
                            {u.email || 'No email'}
                          </p>
                          <p className="truncate text-[10px] text-slate-500">ID: {u.id}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center rounded-full border px-2 py-[2px] text-[10px] font-semibold ${badgeClass}`}
                          >
                            {label}
                          </span>
                          {u.producer && !u.banned && (
                            <span className="rounded-full bg-sky-500/10 px-2 py-[2px] text-[10px] font-semibold text-sky-300">
                              Producer
                            </span>
                          )}
                          {u.banned && (
                            <span className="rounded-full bg-rose-500/10 px-2 py-[2px] text-[10px] font-semibold text-rose-300">
                              Banned
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })}
              </div>
            )}
          </div>
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

import { useAdminRole } from '../hooks/useAdminRole'
import AdminLayout from '../components/AdminLayout'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  fetchAdminMetrics,
  fetchAdminBoostsSummary,
} from '../services/adminDashboardRepository'
import VisitorAnalytics from '../components/VisitorAnalytics.jsx'

export function AdminDashboard() {
  const { isAdmin, loading } = useAdminRole()
  const [m, setM] = useState(null)
  const [boosts, setBoosts] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isAdmin) return
    ;(async () => {
      try {
        setError('')
        const payload = await fetchAdminMetrics()
        setM(payload)
      } catch (e) {
        setError(e.message || 'Failed to load metrics')
        setM({
          totalBeats: 0,
          totalUsers: 0,
          totalSales: 0,
          monthlyRevenue: 0,
          monthlySales: 0,
        })
      }
    })()
  }, [isAdmin])

  useEffect(() => {
    if (!isAdmin) return
    ;(async () => {
      try {
        const list = await fetchAdminBoostsSummary()
        setBoosts(list)
      } catch {
        setBoosts([])
      }
    })()
  }, [isAdmin])

  if (loading) {
    return (
      <section className="min-h-screen flex items-center justify-center bg-slate-950/95">
        <p className="text-sm text-slate-400">Loading admin access...</p>
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

  if (!m) {
    return (
      <section className="min-h-screen flex items-center justify-center bg-slate-950/95">
        <p className="text-sm text-slate-400">Loading insights...</p>
      </section>
    )
  }

  return (
    <AdminLayout
      title="Insights"
      subtitle="High-level view of beats, jobs, subscriptions and boosts across RiddimBase."
    >
      <div className="grid gap-4 lg:grid-cols-4 md:grid-cols-2">
        <Metric label="Total Beats" value={m.totalBeats} />
        <Metric label="Total Users" value={m.totalUsers} />
        <Metric label="Total Sales" value={m.totalSales} />
        <Metric label="Monthly Revenue" value={`$${m.monthlyRevenue}`} />
        <Metric label="Monthly Sales" value={m.monthlySales} />
        <Metric label="Active Boosts" value={boosts.length} />
      </div>

      {error && (
        <p className="mt-3 text-[11px] text-rose-400">
          {error}
        </p>
      )}

      <div className="mt-10 grid gap-6 lg:grid-cols-[1.4fr,1fr]">
        <Panel title="Trending Beats">
          <p className="mb-2 text-[10px] text-slate-500">
            Beats ordered by recent plays, favorites and sales.
          </p>
          <div className="overflow-x-auto rounded-xl border border-slate-800/80 bg-slate-950/80">
            <table className="min-w-full text-[11px]">
              <thead className="bg-slate-900/90 text-slate-300">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">Beat</th>
                  <th className="px-3 py-2 text-left font-semibold">Producer</th>
                  <th className="px-3 py-2 text-right font-semibold">Plays</th>
                  <th className="px-3 py-2 text-right font-semibold">Sales</th>
                  <th className="px-3 py-2 text-right font-semibold">Boost</th>
                </tr>
              </thead>
              <tbody>
                {m.topBeats && m.topBeats.length ? (
                  m.topBeats.slice(0, 8).map((beat) => (
                    <tr
                      key={beat.id}
                      className="border-t border-slate-800/70 hover:bg-slate-900/60"
                    >
                      <td className="px-3 py-2 text-slate-100 truncate max-w-[140px]">
                        {beat.title}
                      </td>
                      <td className="px-3 py-2 text-slate-400 truncate max-w-[120px]">
                        {beat.producer || 'Unknown'}
                      </td>
                      <td className="px-3 py-2 text-right text-slate-300">
                        {beat.plays}
                      </td>
                      <td className="px-3 py-2 text-right text-emerald-300">
                        {beat.sales}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {beat.boostTier ? (
                          <span className="inline-flex items-center rounded-full border border-amber-400/60 bg-amber-500/10 px-2 py-[2px] text-[9px] font-semibold text-amber-200">
                            Tier {beat.boostTier}
                          </span>
                        ) : (
                          <span className="text-[9px] text-slate-500">None</span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-3 py-4 text-center text-[11px] text-slate-500"
                    >
                      No beats stats available yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel title="Quick Actions">
          <div className="grid gap-3 text-[11px]">
            <QuickAction
              title="Create Announcement"
              description="Post a global message for all users."
              to="/admin/announcements"
            />
            <QuickAction
              title="Send Email Blast"
              description="Email producers, artists or service providers."
              to="/admin/email-blast"
            />
            <QuickAction
              title="Review Payouts"
              description="Approve pending withdrawals and mark them paid."
              to="/admin/payouts"
            />
            <QuickAction
              title="Manage Boosted Ads"
              description="Pause, delete or review performance of boosted beats."
              to="/admin/ads"
            />
          </div>
        </Panel>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <Panel title="Support & Safety">
          <ul className="text-[11px] space-y-1.5 text-slate-300">
            <li>• Open tickets: {m.openTickets ?? 0}</li>
            <li>• Open reports: {m.openReports ?? 0}</li>
            <li>• Active support agents: {m.activeAgents ?? 0}</li>
          </ul>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              to="/admin/tickets"
              className="inline-flex items-center rounded-full bg-emerald-500 px-3 py-1 text-[10px] font-semibold text-slate-950 hover:bg-emerald-400 transition"
            >
              View Tickets
            </Link>
            <Link
              to="/admin/reports"
              className="inline-flex items-center rounded-full border border-rose-400/70 px-3 py-1 text-[10px] font-semibold text-rose-300 hover:bg-rose-500/10 transition"
            >
              View Reports
            </Link>
          </div>
        </Panel>

        <Panel title="Live Visitor Analytics">
          <VisitorAnalytics />
        </Panel>

        <Panel title="Subscriptions Snapshot">
          <ul className="text-[11px] space-y-1.5 text-slate-300">
            <li>• Active Starter: {m.activeStarter ?? 0}</li>
            <li>• Active Pro: {m.activePro ?? 0}</li>
            <li>• Active Producer Pro: {m.activeProducerPro ?? 0}</li>
          </ul>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              to="/admin/subscriptions"
              className="inline-flex items-center rounded-full bg-cyan-500 px-3 py-1 text-[10px] font-semibold text-slate-950 hover:bg-cyan-400 transition"
            >
              View Subscriptions
            </Link>
            <Link
              to="/admin/plans"
              className="inline-flex items-center rounded-full border border-slate-600 px-3 py-1 text-[10px] font-semibold text-slate-200 hover:bg-slate-800/70 transition"
            >
              Edit Plans
            </Link>
          </div>
        </Panel>

        <Panel title="Boosted Ads Overview">
          <p className="mb-2 text-[10px] text-slate-500">
            Active boosted beats currently running across the site.
          </p>
          <ul className="space-y-2 max-h-56 overflow-y-auto text-[11px]">
            {boosts.length ? (
              boosts.slice(0, 6).map((b) => (
                <li
                  key={b.id}
                  className="rounded-xl border border-amber-400/40 bg-amber-500/5 px-3 py-2 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-slate-100">{b.title}</p>
                    <p className="text-[10px] text-slate-400 truncate">
                      {b.producer || 'Producer'} · Tier {b.tier} · ends {b.expiresLabel}
                    </p>
                  </div>
                  <span className="text-xs">🔥</span>
                </li>
              ))
            ) : (
              <li className="text-[11px] text-slate-500">
                No active boosted beats right now.
              </li>
            )}
          </ul>
        </Panel>
      </div>
    </AdminLayout>
  )
}

function Metric({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-800/80 bg-gradient-to-br from-slate-900/90 to-slate-950/90 p-4 shadow-md">
      <p className="text-[11px] text-slate-400">{label}</p>
      <p className="mt-1 text-lg font-semibold text-emerald-400">{value}</p>
    </div>
  )
}

function Panel({ title, children }) {
  return (
    <div className="rounded-2xl border border-slate-800/80 bg-slate-900/80 p-5 flex flex-col shadow-md">
      <h2 className="text-sm font-semibold text-slate-100">{title}</h2>
      <div className="mt-3 flex-1">{children}</div>
    </div>
  )
}

function QuickAction({ title, description, to }) {
  return (
    <div className="rounded-xl border border-slate-800/80 bg-slate-950/80 p-3 flex items-center justify-between gap-3">
      <div>
        <p className="text-[11px] font-semibold text-slate-100">{title}</p>
        <p className="text-[10px] text-slate-400">{description}</p>
      </div>
      <Link
        to={to}
        className="inline-flex items-center rounded-full bg-emerald-500 px-3 py-1 text-[10px] font-semibold text-slate-950 hover:bg-emerald-400 transition"
      >
        Open
      </Link>
    </div>
  )
}

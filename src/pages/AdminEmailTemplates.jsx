import AdminLayout from '../components/AdminLayout'
import { useAdminRole } from '../hooks/useAdminRole'
import { useState } from 'react'

const templates = [
  {
    id: 'proposal',
    name: 'New proposal received',
    description: 'Sent to a job owner when someone sends a proposal.',
  },
  {
    id: 'job-accepted',
    name: 'Job accepted',
    description: 'Sent to a service provider when their proposal is accepted.',
  },
  {
    id: 'job-delivered',
    name: 'Job delivered',
    description: 'Sent to a job owner when files are delivered.',
  },
  {
    id: 'review-request',
    name: 'Review request',
    description: 'Sent after a job is marked completed to request a review.',
  },
  {
    id: 'subscription-expiring',
    name: 'Subscription expiring',
    description: 'Upcoming renewal reminders (7 / 2 / 1 days).',
  },
]

export function AdminEmailTemplates() {
  const { isAdmin, loading } = useAdminRole()
  const [activeId, setActiveId] = useState('proposal')
  const [body, setBody] = useState('')

  const activeTemplate = templates.find((t) => t.id === activeId)

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

  return (
    <AdminLayout
      title="Email Templates"
      subtitle="Review and adjust key transactional emails for jobs, subscriptions and boosts."
    >
      <div className="grid gap-6 lg:grid-cols-[0.9fr,1.1fr]">
        <div className="space-y-3">
          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/90 p-4 shadow-lg">
            <p className="text-sm font-semibold text-slate-100 mb-2">Templates</p>
            <ul className="space-y-1 text-[11px]">
              {templates.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => setActiveId(t.id)}
                    className={`w-full rounded-lg px-3 py-2 text-left transition ${
                      activeId === t.id
                        ? 'bg-slate-800/90 text-emerald-300 border border-emerald-500/40'
                        : 'bg-slate-950/70 text-slate-200 border border-slate-800/80 hover:bg-slate-900/80'
                    }`}
                  >
                    <p className="text-[11px] font-semibold">{t.name}</p>
                    <p className="text-[10px] text-slate-400">{t.description}</p>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="space-y-3">
          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/90 p-5 shadow-lg">
            <p className="text-sm font-semibold text-slate-100">{activeTemplate?.name}</p>
            <p className="mt-1 text-[11px] text-slate-400">{activeTemplate?.description}</p>
            <div className="mt-3 rounded-xl border border-slate-800/80 bg-slate-950/80 p-3 text-[10px] text-slate-400">
              <p className="font-semibold text-slate-300 mb-1">Available variables</p>
              <p className="mb-1">
                &#123;user_name&#125;, &#123;producer_name&#125;, &#123;job_title&#125;, &#123;plan_name&#125;,
                &#123;expires_at&#125;, &#123;beat_title&#125;, &#123;order_id&#125;
              </p>
              <p>Use them in the subject and body to personalize each email.</p>
            </div>
            <div className="mt-3 space-y-2 text-[11px]">
              <label className="block text-slate-300">Email body preview</label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={10}
                className="w-full rounded-xl border border-slate-800/80 bg-slate-950/80 px-3 py-2 text-[11px] text-slate-100 focus:border-emerald-400/70 focus:outline-none"
                placeholder="Write or paste the default body for this template..."
              />
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
              <button
                type="button"
                className="rounded-full bg-emerald-500 px-4 py-1.5 font-semibold text-slate-950 hover:bg-emerald-400 transition"
              >
                Save template (wire backend)
              </button>
              <button
                type="button"
                className="rounded-full border border-slate-600 px-3 py-1.5 font-semibold text-slate-200 hover:bg-slate-800/80 transition"
              >
                Send test email
              </button>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}

export default AdminEmailTemplates


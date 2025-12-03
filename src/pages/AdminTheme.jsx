import AdminLayout from '../components/AdminLayout'
import { useAdminRole } from '../hooks/useAdminRole'

export function AdminTheme() {
  const { isAdmin, loading } = useAdminRole()

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
      title="Brand & Theme"
      subtitle="Tune RiddimBase's tropical palette, gradients and glossy buttons from one place."
    >
      <div className="grid gap-6 lg:grid-cols-[1.1fr,0.9fr]">
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/90 p-5 shadow-lg">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-emerald-300">
              Colors
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-100">
              Tropical palette
            </p>
            <div className="mt-4 grid gap-4 md:grid-cols-3 text-[11px]">
              <div>
                <label className="block text-slate-400 mb-1">Primary accent</label>
                <input
                  type="color"
                  defaultValue="#22c55e"
                  className="h-9 w-full rounded-lg border border-slate-700/70 bg-slate-950/70"
                />
                <p className="mt-1 text-[10px] text-slate-500">
                  Used for main buttons and highlights.
                </p>
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Secondary accent</label>
                <input
                  type="color"
                  defaultValue="#f97316"
                  className="h-9 w-full rounded-lg border border-slate-700/70 bg-slate-950/70"
                />
                <p className="mt-1 text-[10px] text-slate-500">
                  Used for tags, chips and boost badges.
                </p>
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Tropical blue</label>
                <input
                  type="color"
                  defaultValue="#0ea5e9"
                  className="h-9 w-full rounded-lg border border-slate-700/70 bg-slate-950/70"
                />
                <p className="mt-1 text-[10px] text-slate-500">
                  Used for links and info states.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/90 p-5 shadow-lg">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-emerald-300">
              Surfaces
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-100">
              Gradients & gloss
            </p>
            <div className="mt-4 grid gap-4 md:grid-cols-2 text-[11px]">
              <div>
                <label className="block text-slate-400 mb-1">Background gradient</label>
                <select className="w-full rounded-lg border border-slate-700/70 bg-slate-950/70 px-2 py-1.5 text-slate-100 text-xs">
                  <option>Night beach (slate → blue)</option>
                  <option>Sunset (purple → orange)</option>
                  <option>Jungle (teal → emerald)</option>
                </select>
                <p className="mt-1 text-[10px] text-slate-500">
                  Controls the hero / app shell gradient.
                </p>
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Button gloss intensity</label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  defaultValue="60"
                  className="w-full accent-emerald-400"
                />
                <p className="mt-1 text-[10px] text-slate-500">
                  Higher values make primary buttons shinier.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/90 p-5 shadow-lg">
            <p className="text-sm font-semibold text-slate-100 mb-3">Live preview</p>
            <div className="rounded-3xl border border-slate-800/80 bg-gradient-to-br from-slate-900/90 via-slate-950 to-slate-900/90 p-4">
              <p className="text-[10px] uppercase tracking-[0.25em] text-emerald-300">
                Beat card
              </p>
              <div className="mt-3 flex gap-3">
                <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-yellow-400/60 via-emerald-400/40 to-cyan-500/40" />
                <div className="flex-1 space-y-1">
                  <p className="text-[12px] font-semibold text-slate-100 truncate">
                    Tropical Night (Dancehall)
                  </p>
                  <p className="text-[10px] text-slate-400">Prod. by RiddimBase</p>
                  <div className="flex items-center justify-between text-[10px] text-slate-300">
                    <span>140 BPM · Dancehall</span>
                    <span className="text-emerald-300 font-semibold">$29.99</span>
                  </div>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <button className="rounded-full bg-red-500 px-4 py-1.5 text-[10px] font-semibold text-slate-50 shadow-[0_10px_40px_rgba(248,113,113,0.55)] hover:bg-red-400">
                  Primary CTA
                </button>
                <button className="rounded-full border border-slate-600 px-3 py-1 text-[10px] text-slate-200 hover:bg-slate-800/80">
                  Secondary
                </button>
              </div>
            </div>
            <p className="mt-3 text-[10px] text-slate-500">
              This preview reflects your current design system. Saving changes will refresh the
              front-end theme on the next page load.
            </p>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}

export default AdminTheme

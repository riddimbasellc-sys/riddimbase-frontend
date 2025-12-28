import { useState } from 'react'
import { useCookieConsent } from '../hooks/useCookieConsent'

export default function CookieConsent() {
  const { status, acceptAll, rejectAll, setCustom } = useCookieConsent()
  const [showPrefs, setShowPrefs] = useState(false)
  const [analytics, setAnalytics] = useState(true)
  const [marketing, setMarketing] = useState(false)

  // Only render banner if no consent has been recorded yet
  const visible = status === 'unknown'
  if (!visible) return null

  const handleCustomizeSave = () => {
    setCustom({ analytics, marketing })
    setShowPrefs(false)
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-4 sm:px-6 sm:pb-6">
      <div className="w-full max-w-4xl overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-950/95 shadow-rb-soft backdrop-blur-md animate-rb-slide-up">
        <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:justify-between sm:p-5">
          <div className="space-y-2 text-xs sm:text-sm">
            <p className="font-semibold text-slate-100">Cookies on RiddimBase</p>
            <p className="text-slate-300">
              We use cookies to keep the site secure, remember your preferences, and understand how producers and artists use the platform.
              Analytics and marketing cookies are only used if you choose to enable them.
            </p>
            <p className="text-[10px] text-slate-500">
              You can change your choice at any time in our privacy settings. Read more in our{' '}
              <a href="/privacy" className="underline decoration-slate-500 decoration-dotted hover:text-rb-accent">Privacy Policy</a>.
            </p>
          </div>

          <div className="flex flex-col items-stretch gap-2 sm:w-64">
            <button
              type="button"
              onClick={acceptAll}
              className="inline-flex items-center justify-center rounded-full bg-rb-accent px-4 py-2 text-xs font-semibold text-slate-950 shadow-rb-gloss-btn transition hover:bg-rb-accent-soft"
            >
              Accept all
            </button>
            <button
              type="button"
              onClick={rejectAll}
              className="inline-flex items-center justify-center rounded-full border border-slate-700/80 px-4 py-2 text-xs font-semibold text-slate-100 transition hover:border-rb-accent hover:text-rb-accent"
            >
              Reject
            </button>
            <button
              type="button"
              onClick={() => setShowPrefs((v) => !v)}
              className="inline-flex items-center justify-center rounded-full px-4 py-2 text-[11px] font-medium text-slate-300 hover:text-slate-50"
            >
              {showPrefs ? 'Hide preferences' : 'Customize'}
            </button>
          </div>
        </div>

        {showPrefs && (
          <div className="border-t border-slate-800/80 bg-slate-950/95 px-4 py-3 text-[11px] text-slate-200 sm:px-5">
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <p className="font-semibold text-slate-100">Strictly necessary</p>
                <p className="mt-1 text-[10px] text-slate-400">
                  Required for things like secure login, payments, and saving your settings. These are always on.
                </p>
              </div>
              <label className="flex cursor-pointer items-start gap-2">
                <input
                  type="checkbox"
                  className="mt-[3px] h-3 w-3 rounded border-slate-600 bg-slate-900 text-rb-accent focus:ring-rb-accent"
                  checked={analytics}
                  onChange={(e) => setAnalytics(e.target.checked)}
                />
                <div>
                  <p className="font-semibold text-slate-100">Analytics</p>
                  <p className="mt-1 text-[10px] text-slate-400">
                    Help us understand which pages are most useful so we can improve producer and artist flows.
                  </p>
                </div>
              </label>
              <label className="flex cursor-pointer items-start gap-2">
                <input
                  type="checkbox"
                  className="mt-[3px] h-3 w-3 rounded border-slate-600 bg-slate-900 text-rb-accent focus:ring-rb-accent"
                  checked={marketing}
                  onChange={(e) => setMarketing(e.target.checked)}
                />
                <div>
                  <p className="font-semibold text-slate-100">Marketing</p>
                  <p className="mt-1 text-[10px] text-slate-400">
                    Used to show relevant RiddimBase promotions and partner offers on and off the platform.
                  </p>
                </div>
              </label>
            </div>
            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={handleCustomizeSave}
                className="inline-flex items-center justify-center rounded-full bg-slate-100 px-4 py-1.5 text-[11px] font-semibold text-slate-900 hover:bg-white"
              >
                Save preferences
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

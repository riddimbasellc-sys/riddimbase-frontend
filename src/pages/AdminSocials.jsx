import { useEffect, useState } from 'react'
import AdminLayout from '../components/AdminLayout'
import { getSocialLinks, updateSocialLink, resetSocialLinks } from '../services/socialLinksService'

const NETWORK_LABELS = {
  instagram: 'Instagram',
  youtube: 'YouTube',
  tiktok: 'TikTok',
  twitter: 'X / Twitter',
  facebook: 'Facebook',
  soundcloud: 'SoundCloud',
  spotify: 'Spotify',
}

export function AdminSocials() {
  const [rows, setRows] = useState([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setRows(getSocialLinks())
  }, [])

  const handleChange = (id, value) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, url: value } : r)))
  }

  const handleSave = () => {
    setSaving(true)
    rows.forEach((r) => {
      updateSocialLink(r.id, { url: r.url })
    })
    setSaving(false)
  }

  const handleReset = () => {
    const next = resetSocialLinks()
    setRows(next)
  }

  return (
    <AdminLayout
      title="Social Profiles"
      subtitle="Configure official RiddimBase social links. These icons appear in the site footer."
    >
      <div className="space-y-6">
        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/80 p-5">
          <p className="text-xs text-slate-300">
            Add your official brand URLs. Only links with a valid URL will show in the public footer, as glossy social
            icons aligned side by side.
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead>
                <tr className="text-slate-400">
                  <th className="text-left py-2 px-2 font-medium">Network</th>
                  <th className="text-left py-2 px-2 font-medium">URL</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-t border-slate-800/70">
                    <td className="py-2 px-2">
                      <span className="inline-flex items-center gap-2 text-slate-100">
                        <SocialIcon network={row.network} className="h-4 w-4 text-rb-sun-gold" />
                        <span>{NETWORK_LABELS[row.network] || row.network}</span>
                      </span>
                    </td>
                    <td className="py-2 px-2">
                      <input
                        type="url"
                        placeholder={`https://${row.network}.com/riddimbase`}
                        value={row.url}
                        onChange={(e) => handleChange(row.id, e.target.value)}
                        className="w-full rounded-lg border border-slate-700/70 bg-slate-950/70 px-2 py-1.5 text-[11px] text-slate-100 focus:border-emerald-400/70 focus:outline-none"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="rounded-full bg-emerald-500 px-5 py-1.5 text-[11px] font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save Social Links'}
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="rounded-full border border-slate-700/80 px-4 py-1.5 text-[11px] font-semibold text-slate-300 hover:border-emerald-400/60 hover:text-emerald-300"
            >
              Reset to defaults
            </button>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}

function SocialIcon({ network, className }) {
  switch (network) {
    case 'instagram':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
          <rect x="3" y="3" width="18" height="18" rx="5" />
          <circle cx="12" cy="12" r="4.5" />
          <circle cx="17" cy="7" r="1.2" />
        </svg>
      )
    case 'youtube':
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
          <path d="M21.6 7.2a2.5 2.5 0 0 0-1.76-1.77C18.1 5 12 5 12 5s-6.1 0-7.84.43A2.5 2.5 0 0 0 2.4 7.2 26 26 0 0 0 2 12a26 26 0 0 0 .4 4.8 2.5 2.5 0 0 0 1.76 1.77C5.9 19 12 19 12 19s6.1 0 7.84-.43A2.5 2.5 0 0 0 21.6 16.8 26 26 0 0 0 22 12a26 26 0 0 0-.4-4.8ZM10 15.25V8.75L15 12Z" />
        </svg>
      )
    case 'tiktok':
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
          <path d="M15.5 3h2.1c.2 1 .7 1.9 1.4 2.6a4 4 0 0 0 2.3 1v2.3a6.4 6.4 0 0 1-3.5-1.1v6.5A5.7 5.7 0 0 1 12 20.9 5.9 5.9 0 0 1 6.1 15 5.8 5.8 0 0 1 12 9.1h.5v2.8A3.1 3.1 0 0 0 9.9 15 3 3 0 0 0 12 18a3 3 0 0 0 3.1-3V3Z" />
        </svg>
      )
    case 'twitter':
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
          <path d="M16.5 3H20l-7 8.2L21 21h-4.5l-5-6-5.7 6H2.2l7.5-8.5L3 3h4.6l4.5 5.5Z" />
        </svg>
      )
    case 'facebook':
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
          <path d="M13.5 21v-7h2.3l.4-3h-2.7V9a1.1 1.1 0 0 1 1.2-1.2h1.6V5.1H14a3.4 3.4 0 0 0-3.6 3.6v2.3H8v3h2.4v7Z" />
        </svg>
      )
    case 'soundcloud':
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
          <path d="M9.5 7.2A4.7 4.7 0 0 1 14 4.5a4.8 4.8 0 0 1 4.6 3.4A3.4 3.4 0 0 1 22 11.2 3.3 3.3 0 0 1 18.7 15H9a3.2 3.2 0 0 1-3.2-3.1A3.3 3.3 0 0 1 9.5 7.2Z" />
          <path d="M4 9.5A2.7 2.7 0 0 0 2.5 12 2.7 2.7 0 0 0 4 14.5Z" />
        </svg>
      )
    case 'spotify':
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
          <path d="M12 2.5A9.5 9.5 0 1 0 21.5 12 9.5 9.5 0 0 0 12 2.5Zm3.8 12.6a.8.8 0 0 1-1.1.3 8.3 8.3 0 0 0-3.4-.9 7.9 7.9 0 0 0-2.8.4.8.8 0 0 1-.5-1.4 9.5 9.5 0 0 1 3.3-.5 9.9 9.9 0 0 1 4 .9.8.8 0 0 1 .5 1.2Zm1-3a.9.9 0 0 1-1.2.3 10.7 10.7 0 0 0-4.3-1 10 10 0 0 0-3.2.4.9.9 0 0 1-.5-1.7A11.8 11.8 0 0 1 12 9a12.5 12.5 0 0 1 5 1.2.9.9 0 0 1 .8 1.4Zm.1-3a.9.9 0 0 1-1.2.4 12.4 12.4 0 0 0-5-1.1 11.9 11.9 0 0 0-3.7.6.9.9 0 0 1-.6-1.7A13.9 13.9 0 0 1 12 6.7a14.6 14.6 0 0 1 5.8 1.4.9.9 0 0 1 .6 1.5Z" />
        </svg>
      )
    default:
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
          <circle cx="12" cy="12" r="9" />
          <path d="M8 12h8" />
        </svg>
      )
  }
}


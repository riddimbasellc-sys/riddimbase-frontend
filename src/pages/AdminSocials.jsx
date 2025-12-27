import { useEffect, useState } from 'react'
import AdminLayout from '../components/AdminLayout'
import { getSocialLinks, saveSocialLinks, resetSocialLinks } from '../services/socialLinksService'
import SocialIcon from '../components/SocialIcon'

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
    ;(async () => {
      const data = await getSocialLinks()
      setRows(data)
    })()
  }, [])

  const handleChange = (id, value) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, url: value } : r)))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const next = await saveSocialLinks(rows)
      setRows(next)
    } finally {
      setSaving(false)
    }
  }

  const handleReset = async () => {
    const next = await resetSocialLinks()
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
                        className="w-full rounded-lg border border-slate-700/70 bg-slate-950/70 px-2 py-1.5 text-[11px] text-slate-100 focus:border-red-400/70 focus:outline-none"
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
              className="rounded-full bg-red-500 px-5 py-1.5 text-[11px] font-semibold text-slate-50 hover:bg-red-400 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save Social Links'}
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="rounded-full border border-slate-700/80 px-4 py-1.5 text-[11px] font-semibold text-slate-300 hover:border-red-400/60 hover:text-red-300"
            >
              Reset to defaults
            </button>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}


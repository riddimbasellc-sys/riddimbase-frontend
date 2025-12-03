import { useEffect, useState } from 'react'
import AdminLayout from '../components/AdminLayout'
import {
  getFooterLinks,
  addFooterLink,
  updateFooterLink,
  deleteFooterLink,
  reorderFooterLinks,
} from '../services/siteLinksService'

export function AdminFooterLinks() {
  const [links, setLinks] = useState([])
  const [newLabel, setNewLabel] = useState('')
  const [newPath, setNewPath] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    ;(async () => {
      const data = await getFooterLinks()
      setLinks(data)
    })()
  }, [])

  async function refresh() {
    const data = await getFooterLinks()
    setLinks(data)
  }

  async function handleAdd(e) {
    e.preventDefault()
    if (!newLabel.trim() || !newPath.trim()) return
    setSaving(true)
    await addFooterLink({ label: newLabel.trim(), to: newPath.trim() })
    setNewLabel('')
    setNewPath('')
    await refresh()
    setSaving(false)
  }

  async function handleUpdate(id, field, value) {
    await updateFooterLink(id, { [field]: value })
    await refresh()
  }

  async function handleDelete(id) {
    if (!confirm('Delete this link?')) return
    await deleteFooterLink(id)
    await refresh()
  }

  async function handleMove(id, direction) {
    await reorderFooterLinks(id, direction)
    await refresh()
  }

  return (
    <AdminLayout title="Footer Links" description="Manage informational footer navigation entries.">
      <div className="space-y-6">
        <form onSubmit={handleAdd} className="flex flex-col gap-3 p-4 rounded bg-slate-800/40 border border-slate-700/40 max-w-md">
          <div className="font-medium text-sm text-slate-200">Add Link</div>
          <input
            type="text"
            placeholder="Label (e.g. About)"
            value={newLabel}
            onChange={e => setNewLabel(e.target.value)}
            className="bg-slate-900/60 border border-slate-700/50 rounded px-2 py-1 text-sm text-slate-200 focus:outline-none focus:ring focus:ring-emerald-500/40"
          />
          <input
            type="text"
            placeholder="Path (e.g. /about)"
            value={newPath}
            onChange={e => setNewPath(e.target.value)}
            className="bg-slate-900/60 border border-slate-700/50 rounded px-2 py-1 text-sm text-slate-200 focus:outline-none focus:ring focus:ring-emerald-500/40"
          />
          <button
            type="submit"
            disabled={saving}
            className="text-xs font-medium rounded bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 px-3 py-1 text-white transition"
          >Add</button>
        </form>
        <div className="overflow-x-auto">
          <table className="min-w-full text-xs">
            <thead>
              <tr className="text-slate-400">
                <th className="text-left py-2 px-2 font-medium">Order</th>
                <th className="text-left py-2 px-2 font-medium">Label</th>
                <th className="text-left py-2 px-2 font-medium">Path</th>
                <th className="text-left py-2 px-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {links.map((l, idx) => (
                <tr key={l.id} className="border-t border-slate-800/60">
                  <td className="py-2 px-2 text-slate-400">
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => handleMove(l.id, 'up')}
                        disabled={idx === 0}
                        className="px-2 py-1 rounded bg-slate-700/40 hover:bg-slate-600/40 disabled:opacity-40"
                        aria-label="Move up"
                      >↑</button>
                      <button
                        type="button"
                        onClick={() => handleMove(l.id, 'down')}
                        disabled={idx === links.length - 1}
                        className="px-2 py-1 rounded bg-slate-700/40 hover:bg-slate-600/40 disabled:opacity-40"
                        aria-label="Move down"
                      >↓</button>
                    </div>
                  </td>
                  <td className="py-2 px-2">
                    <input
                      value={l.label}
                      onChange={e => handleUpdate(l.id, 'label', e.target.value)}
                      className="w-full bg-slate-900/60 border border-slate-700/50 rounded px-2 py-1 text-slate-200 focus:outline-none focus:ring focus:ring-emerald-500/40"
                    />
                  </td>
                  <td className="py-2 px-2">
                    <input
                      value={l.to}
                      onChange={e => handleUpdate(l.id, 'to', e.target.value)}
                      className="w-full bg-slate-900/60 border border-slate-700/50 rounded px-2 py-1 text-slate-200 focus:outline-none focus:ring focus:ring-emerald-500/40"
                    />
                  </td>
                  <td className="py-2 px-2">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleDelete(l.id)}
                        className="px-3 py-1 rounded bg-red-600/80 hover:bg-red-500 text-white"
                      >Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
              {links.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-slate-500">No links found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  )
}

import { useAdminRole } from '../hooks/useAdminRole'
import BackButton from '../components/BackButton'
import AnnouncementRotator from '../components/AnnouncementRotator'
import { useEffect, useState } from 'react'
import { getAnnouncements, addAnnouncement, updateAnnouncement, deleteAnnouncement, clearAnnouncements, getRotationInterval, setRotationInterval } from '../services/announcementService'

export function AdminAnnouncements() {
  const { isAdmin, loading } = useAdminRole()
  const [announcements, setAnnouncementsState] = useState([])
  const [intervalSec, setIntervalSec] = useState(3)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (isAdmin) {
      ;(async () => {
        const [list, interval] = await Promise.all([
          getAnnouncements(),
          getRotationInterval(),
        ])
        setAnnouncementsState(list || [])
        setIntervalSec(interval || 3)
      })()
    }
  }, [isAdmin])

  if (loading) return <section className="min-h-screen flex items-center justify-center bg-slate-950/95"><p className="text-sm text-slate-400">Loading auth…</p></section>
  if (!isAdmin) return <section className="min-h-screen flex items-center justify-center bg-slate-950/95"><p className="text-sm text-slate-400">Access denied.</p></section>

  async function handleAdd() {
    if (announcements.length >= 5) return
    const created = await addAnnouncement({ message: '', severity: 'info' })
    if (!created) return
    const latest = await getAnnouncements()
    setAnnouncementsState(latest || [])
  }

  function handleChange(id, field, value) {
    const next = announcements.map(a => a.id === id ? { ...a, [field]: value } : a)
    setAnnouncementsState(next)
  }

  async function handleDelete(id) {
    await deleteAnnouncement(id)
    const latest = await getAnnouncements()
    setAnnouncementsState(latest || [])
  }

  async function handleClearAll() {
    await clearAnnouncements()
    setAnnouncementsState([])
  }

  async function handleSaveAll(e) {
    e.preventDefault()
    setSaving(true)
    const cleaned = announcements.map(a => ({ ...a, message: (a.message||'').trim() })).filter(a => a.message)
    // Replace existing announcements with cleaned set: simple approach is clear + reinsert
    await clearAnnouncements()
    for (const a of cleaned) {
      await addAnnouncement({ message: a.message, severity: a.severity || 'info' })
    }
    await setRotationInterval(intervalSec)
    const latest = await getAnnouncements()
    setAnnouncementsState(latest || [])
    setSaving(false)
  }

  return (
    <section className="bg-slate-950/95">
      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="flex items-center gap-3">
          <BackButton />
          <div>
            <h1 className="font-display text-2xl font-semibold text-slate-50 tracking-tight">Announcements</h1>
            <p className="mt-1 text-sm text-slate-300">Create up to 5 rotating banners with a right-to-left marquee. Use for launches, maintenance windows, promos.</p>
          </div>
        </div>
        <form onSubmit={handleSaveAll} className="mt-8 space-y-6">
          <div className="flex flex-col rounded-2xl border border-slate-800/80 bg-slate-900/70 backdrop-blur p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-slate-100 tracking-wide">Announcement Entries ({announcements.length}/5)</h2>
              <div className="flex items-center gap-2">
                <label className="text-[10px] font-semibold text-slate-400">Rotation Interval</label>
                <select value={intervalSec} onChange={e=>setIntervalSec(Number(e.target.value))} className="rounded-lg border border-slate-700/70 bg-slate-950/70 px-2 py-1 text-[11px] text-slate-100">
                  {[1,2,3,4,5].map(v => <option key={v} value={v}>{v}s</option>)}
                </select>
              </div>
            </div>
            <div className="space-y-5">
              {announcements.map(a => (
                <div key={a.id} className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold tracking-wide text-slate-400">Announcement #{announcements.indexOf(a)+1}</span>
                    <button type="button" onClick={()=>handleDelete(a.id)} className="text-[10px] px-2 py-1 rounded border border-red-500/50 text-red-400 hover:bg-red-500/10">Remove</button>
                  </div>
                  <div className="flex flex-col">
                    <label className="text-[10px] font-semibold text-slate-500">Message</label>
                    <textarea value={a.message} onChange={e=>handleChange(a.id,'message',e.target.value)} rows={2} className="mt-1 rounded-lg border border-slate-700/70 bg-slate-900/70 px-2 py-1.5 text-[12px] text-slate-100 placeholder:text-slate-500" placeholder="Promo text, update, launch note" />
                  </div>
                  <div className="flex flex-col w-40">
                    <label className="text-[10px] font-semibold text-slate-500">Severity</label>
                    <select value={a.severity} onChange={e=>handleChange(a.id,'severity',e.target.value)} className="mt-1 rounded-lg border border-slate-700/70 bg-slate-900/70 px-2 py-1.5 text-[11px] text-slate-100">
                      <option value="info">Info</option>
                      <option value="warning">Warning</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                </div>
              ))}
              {announcements.length === 0 && <p className="text-[11px] text-slate-500">No announcements yet. Add one below.</p>}
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <button type="button" onClick={handleAdd} disabled={announcements.length>=5} className="rounded-full bg-emerald-500 px-5 py-2 text-[11px] font-semibold text-slate-950 disabled:opacity-30 hover:bg-emerald-400">Add Announcement</button>
              <button type="submit" disabled={saving} className="rounded-full bg-cyan-500 px-5 py-2 text-[11px] font-semibold text-slate-950 hover:bg-cyan-400 disabled:opacity-40">Save All</button>
              {announcements.length>0 && <button type="button" onClick={handleClearAll} className="rounded-full bg-red-500/90 px-5 py-2 text-[11px] font-semibold text-slate-950 hover:bg-red-400">Clear All</button>}
            </div>
          </div>
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-slate-100 tracking-wide">Live Preview</h2>
            <p className="text-[11px] text-slate-400">Rotation every {intervalSec} second(s). Message scroll speed adapts to length.</p>
            <AnnouncementRotator announcements={announcements} intervalSec={intervalSec} />
          </div>
        </form>
      </div>
    </section>
  )
}

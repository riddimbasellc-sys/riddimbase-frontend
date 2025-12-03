import { useEffect, useMemo, useState } from 'react'
import AdminLayout from '../components/AdminLayout'
import { useAdminRole } from '../hooks/useAdminRole'
import { useBeats } from '../hooks/useBeats'
import {
  listPlaylists,
  createPlaylist,
  updatePlaylist,
  deletePlaylist,
  computeScore,
} from '../services/playlistsService'

export function AdminPlaylists() {
  const { isAdmin, loading } = useAdminRole()
  const { beats } = useBeats()
  const [items, setItems] = useState([])
  const [draft, setDraft] = useState({
    title: '',
    description: '',
    coverUrl: '',
    moods: '',
    beatIds: [],
  })
  const [editingId, setEditingId] = useState(null)

  useEffect(() => {
    ;(async () => {
      const rows = await listPlaylists()
      setItems(rows)
    })()
  }, [])

  const resetDraft = () => {
    setDraft({ title: '', description: '', coverUrl: '', moods: '', beatIds: [] })
    setEditingId(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const payload = {
      title: draft.title.trim() || 'Untitled Playlist',
      description: draft.description.trim(),
      coverUrl: draft.coverUrl.trim(),
      moods: draft.moods.split(',').map(m => m.trim()).filter(Boolean),
      beatIds: draft.beatIds,
    }
    if (editingId) {
      await updatePlaylist(editingId, payload)
    } else {
      await createPlaylist(payload)
    }
    setItems(await listPlaylists())
    resetDraft()
  }

  const startEdit = (p) => {
    setEditingId(p.id)
    setDraft({
      title: p.title,
      description: p.description,
      coverUrl: p.coverUrl,
      moods: p.moods.join(', '),
      beatIds: p.beatIds || [],
    })
  }

  const toggleBeat = (id) => {
    setDraft(prev => prev.beatIds.includes(id) ? { ...prev, beatIds: prev.beatIds.filter(b => b !== id) } : { ...prev, beatIds: [...prev.beatIds, id] })
  }

  const enriched = useMemo(() => items.map(p => ({
    ...p,
    score: computeScore(p),
    beatTitles: (p.beatIds || []).map(id => beats.find(b => b.id === id)?.title).filter(Boolean),
  })), [items, beats])

  if (loading) {
    return <section className="min-h-screen flex items-center justify-center bg-slate-950/95"><p className="text-sm text-slate-400">Loading authâ€¦</p></section>
  }
  if (!isAdmin) {
    return <section className="min-h-screen flex items-center justify-center bg-slate-950/95"><p className="text-sm text-slate-400">Access denied.</p></section>
  }

  return (
    <AdminLayout
      title="Playlists"
      subtitle="Curate homepage playlists with covers, moods and beat selections."
      actions={<button onClick={resetDraft} className="rounded-full border border-emerald-400/70 bg-emerald-500/10 px-4 py-1 text-xs font-semibold text-emerald-200 hover:bg-emerald-500/20">{editingId ? 'New Playlist' : 'Reset'}</button>}
    >
      <div className="grid gap-6 lg:grid-cols-[1.1fr,1fr]">
        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/80 p-5 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-100">{editingId ? 'Edit Playlist' : 'Create Playlist'}</p>
              <p className="text-[11px] text-slate-400">Add cover, moods, beats and publish.</p>
            </div>
            {editingId && <span className="rounded-full bg-slate-800 px-3 py-1 text-[11px] text-slate-300">Editing #{editingId}</span>}
          </div>
          <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-[11px] text-slate-300 flex flex-col gap-1">
                Title
                <input value={draft.title} onChange={e=>setDraft(prev=>({ ...prev, title: e.target.value }))} className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-emerald-400/70 focus:outline-none" placeholder="Playlist title" required />
              </label>
              <label className="text-[11px] text-slate-300 flex flex-col gap-1">
                Cover URL
                <input value={draft.coverUrl} onChange={e=>setDraft(prev=>({ ...prev, coverUrl: e.target.value }))} className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-emerald-400/70 focus:outline-none" placeholder="https://..." />
              </label>
            </div>
            <label className="text-[11px] text-slate-300 flex flex-col gap-1">
              Description
              <textarea value={draft.description} onChange={e=>setDraft(prev=>({ ...prev, description: e.target.value }))} className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-emerald-400/70 focus:outline-none" rows={2} placeholder="What listeners should expect" />
            </label>
            <label className="text-[11px] text-slate-300 flex flex-col gap-1">
              Moods / Tags <span className="text-[10px] text-slate-500">Comma separated (e.g. hype, trapdancehall, afro)</span>
              <input value={draft.moods} onChange={e=>setDraft(prev=>({ ...prev, moods: e.target.value }))} className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-emerald-400/70 focus:outline-none" />
            </label>
            <div>
              <p className="text-[11px] font-semibold text-slate-200 mb-2">Select Beats</p>
              <div className="grid max-h-52 overflow-auto gap-2 sm:grid-cols-2">
                {beats.map(b => (
                  <label key={b.id} className="flex items-start gap-2 rounded-lg border border-slate-800/70 bg-slate-950/60 px-3 py-2 text-[11px] text-slate-200 hover:border-emerald-400/60">
                    <input type="checkbox" checked={draft.beatIds.includes(b.id)} onChange={()=>toggleBeat(b.id)} className="mt-1" />
                    <div className="space-y-[2px]">
                      <p className="font-semibold">{b.title}</p>
                      <p className="text-[10px] text-slate-400">{b.genre} â€¢ {b.bpm} BPM</p>
                    </div>
                  </label>
                ))}
                {beats.length === 0 && <p className="text-[11px] text-slate-500">No beats to select yet.</p>}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-[11px] text-slate-500">Playlists surface on the homepage with engagement enabled.</p>
              <div className="flex gap-2">
                <button type="button" onClick={resetDraft} className="rounded-full border border-slate-700/70 px-4 py-1 text-[12px] text-slate-200 hover:border-slate-500/60">Clear</button>
                <button type="submit" className="rounded-full border border-emerald-400/70 bg-emerald-500/10 px-5 py-1.5 text-[12px] font-semibold text-emerald-200 hover:bg-emerald-500/20">{editingId ? 'Save Changes' : 'Create Playlist'}</button>
              </div>
            </div>
          </form>
        </div>
        <div className="space-y-3">
          {enriched.map(p => (
            <div key={p.id} className="rounded-2xl border border-slate-800/80 bg-gradient-to-br from-slate-900/90 to-slate-950/90 p-4 shadow-lg">
              <div className="flex items-start gap-3">
                <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl border border-slate-800/80 bg-slate-900">
                  {p.coverUrl ? <img src={p.coverUrl} alt={p.title} className="h-full w-full object-cover" /> : <div className="h-full w-full bg-gradient-to-br from-emerald-600/40 to-slate-900" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-100 truncate">{p.title}</p>
                    <span className="text-[11px] text-emerald-300 font-semibold">Score {Math.round(p.score)}</span>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-400 line-clamp-2">{p.description}</p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {p.moods.map(m => <span key={m} className="rounded-full border border-emerald-400/40 bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-200">{m}</span>)}
                    {p.moods.length === 0 && <span className="text-[10px] text-slate-500">No moods</span>}
                  </div>
                  <p className="mt-1 text-[10px] text-slate-500">{p.beatTitles.join(" - ")}</p>
                  <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-slate-400">
                    <span>Plays {p.plays}</span>
                    <span>Likes {p.likes}</span>
                    <span>Favs {p.favorites}</span>
                    <span>Comments {(p.comments||[]).length}</span>
                  </div>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-end gap-2 text-[11px]">
                <button onClick={()=>startEdit(p)} className="rounded-full border border-slate-700/70 px-3 py-1 text-slate-200 hover:border-emerald-400/70">Edit</button>
                <button onClick={async ()=>{ await deletePlaylist(p.id); setItems(await listPlaylists()); }} className="rounded-full border border-red-500/60 px-3 py-1 text-red-300 hover:bg-red-500/10">Delete</button>
              </div>
            </div>
          ))}
          {enriched.length === 0 && (
            <div className="rounded-2xl border border-slate-800/80 bg-slate-900/80 p-4 text-[12px] text-slate-400">
              No playlists yet. Create your first curation to feature on the homepage.
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}









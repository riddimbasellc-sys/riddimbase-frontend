import { useState } from 'react'
import useSupabaseUser from '../hooks/useSupabaseUser'
import { createJobRequest } from '../services/serviceJobRequestsService'
import { useNavigate } from 'react-router-dom'
import BackButton from '../components/BackButton'

export function JobPostForm() {
  const { user } = useSupabaseUser()
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('mixing')
  const [genres, setGenres] = useState([])
  const [budget, setBudget] = useState('')
  const [deadlineDate, setDeadlineDate] = useState('')
  const [revisions, setRevisions] = useState(2)
  const [referenceUrls, setReferenceUrls] = useState([])
  const [refUploading, setRefUploading] = useState(false)
  const [refInput, setRefInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  if (!user) return <div className="mx-auto max-w-3xl px-4 py-10 text-center text-slate-300">Log in to post a job request.</div>

  const toggleGenre = (g) => {
    setGenres(prev => prev.includes(g) ? prev.filter(x => x!==g) : [...prev, g])
  }
  const addReference = () => {
    if (!refInput.trim()) return
    setReferenceUrls(arr => [...arr, refInput.trim()])
    setRefInput('')
  }
  const uploadReferenceFiles = async (files) => {
    if (!files?.length) return
    setRefUploading(true)
    try {
      const uploaded = []
      for (const f of files) {
        const body = { filename: f.name, contentType: f.type || 'application/octet-stream', folder: 'jobrefs' }
        const pres = await fetch('/api/upload-url', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) }).then(r=>r.json())
        if (!pres.uploadUrl) throw new Error('Presign failed')
        await fetch(pres.uploadUrl, { method:'PUT', headers:{'Content-Type': body.contentType}, body: f })
        uploaded.push(pres.publicUrl)
      }
      setReferenceUrls(arr => [...arr, ...uploaded])
    } catch (e) {
      setError(e.message || 'Reference upload failed')
    } finally { setRefUploading(false) }
  }
  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(''); setSuccess(false); setLoading(true)
    try {
      const { job, error:err } = await createJobRequest({ userId: user.id, title, description, category, genres, budget, currency:'USD', deadlineDate, revisionsExpected: revisions, referenceUrls })
      if (err) throw new Error(err)
      setSuccess(true)
      // optional notify
      fetch('/api/notify', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ kind:'job-request', event:'posted', payload:{ title, requesterEmail: user.email } }) })
        .catch(()=>{})
      setTimeout(()=> navigate(`/jobs/${job.id}`), 800)
    } catch (e2) {
      setError(e2.message || 'Failed to post job')
    } finally { setLoading(false) }
  }

  const genreOptions = ['dancehall','reggae','afrobeats','trap','drill','pop','rnb']
  const catOptions = [
    { value:'mixing', label:'Mixing & Mastering' },
    { value:'custom-beat', label:'Custom Beat' },
    { value:'vocal-edit', label:'Vocal Editing' },
    { value:'remix', label:'Remix Production' }
  ]

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-6 flex items-center gap-3">
        <BackButton />
        <h1 className="text-2xl font-semibold tracking-tight text-slate-100">
          Post a Job Request
        </h1>
      </div>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-300">Title</label>
          <input value={title} onChange={e=>setTitle(e.target.value)} required className="w-full rounded-lg border border-slate-700 bg-slate-800/70 px-3 py-2 text-sm text-slate-100" placeholder="E.g. Need dancehall beat mixed" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-300">Category</label>
          <select value={category} onChange={e=>setCategory(e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-800/70 px-3 py-2 text-sm text-slate-100">
            {catOptions.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-300">Description / Requirements</label>
          <textarea value={description} onChange={e=>setDescription(e.target.value)} rows={5} className="w-full rounded-lg border border-slate-700 bg-slate-800/70 px-3 py-2 text-sm text-slate-100" placeholder="Describe what you need, deliverables, style, stems situation..." />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-300">Genres (select)</label>
          <div className="flex flex-wrap gap-2">
            {genreOptions.map(g => (
              <button type="button" key={g} onClick={()=>toggleGenre(g)} className={`rounded-full px-3 py-1 text-xs font-medium transition border ${genres.includes(g)?'bg-emerald-500 text-slate-950 border-emerald-500':'border-slate-700 text-slate-300 hover:border-emerald-400 hover:text-emerald-300'}`}>{g}</button>
            ))}
          </div>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-300">Budget (USD)</label>
            <input type="number" min="0" value={budget} onChange={e=>setBudget(e.target.value)} required className="w-full rounded-lg border border-slate-700 bg-slate-800/70 px-3 py-2 text-sm text-slate-100" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-300">Deadline</label>
            <input type="date" value={deadlineDate} onChange={e=>setDeadlineDate(e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-800/70 px-3 py-2 text-sm text-slate-100" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-300">Revisions Expected</label>
            <input type="number" min="1" value={revisions} onChange={e=>setRevisions(Number(e.target.value)||1)} className="w-full rounded-lg border border-slate-700 bg-slate-800/70 px-3 py-2 text-sm text-slate-100" />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-300">References</label>
          <div className="flex gap-2 mb-2">
            <input value={refInput} onChange={e=>setRefInput(e.target.value)} className="flex-1 rounded-lg border border-slate-700 bg-slate-800/70 px-3 py-2 text-sm text-slate-100" placeholder="Paste a YouTube / SoundCloud link" />
            <button type="button" onClick={addReference} className="rounded-lg bg-slate-700 px-3 py-2 text-xs font-semibold text-slate-100 hover:bg-slate-600">Add</button>
          </div>
          <div className="mb-2">
            <input type="file" multiple onChange={e=>uploadReferenceFiles(e.target.files)} className="text-[11px] text-slate-300" />
            {refUploading && <p className="mt-1 text-[10px] text-slate-400">Uploading references…</p>}
          </div>
          {referenceUrls.length>0 && <ul className="mt-2 space-y-1 text-xs text-emerald-300">{referenceUrls.map((r,i)=><li key={i}><a href={r} target="_blank" rel="noreferrer" className="hover:underline">{r}</a></li>)}</ul>}
        </div>
        {error && <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</div>}
        {success && <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">Job posted! Redirecting…</div>}
        <div className="pt-2">
          <button disabled={loading} className="rounded-full bg-gradient-to-r from-emerald-500 to-orange-400 px-6 py-2 text-sm font-semibold text-slate-950 shadow-rb-soft disabled:opacity-50">{loading? 'Posting...' : 'Post Job'}</button>
        </div>
      </form>
    </div>
  )
}

export default JobPostForm

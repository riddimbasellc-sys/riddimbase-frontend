import { useAdminRole } from '../hooks/useAdminRole'
import BackButton from '../components/BackButton'
import AdminLayout from '../components/AdminLayout'
import { listBanners, uploadBanner, setActiveBanner, deleteBanner } from '../services/bannerService'
import { getBannerContent, setBannerContent, resetBannerContent } from '../services/bannerContentService'
import { useEffect, useState } from 'react'

export function AdminBanners() {
  const { isAdmin, loading } = useAdminRole()
  const [items, setItems] = useState([])
  const [uploading, setUploading] = useState(false)
  const [content, setContent] = useState(getBannerContent())
  useEffect(()=> { if (isAdmin) setItems(listBanners()) }, [isAdmin])
  if (loading) return <section className="min-h-screen flex items-center justify-center bg-slate-950/95"><p className="text-sm text-slate-400">Loading auth…</p></section>
  if (!isAdmin) return <section className="min-h-screen flex items-center justify-center bg-slate-950/95"><p className="text-sm text-slate-400">Access denied.</p></section>

  const handleFile = async (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    setUploading(true)
    await uploadBanner(f)
    setItems(listBanners())
    setUploading(false)
  }

  const makeActive = (id) => { setActiveBanner(id); setItems(listBanners()) }
  const remove = (id) => { deleteBanner(id); setItems(listBanners()) }

  const updateField = (field, value) => {
    const updated = setBannerContent({ [field]: value })
    setContent(updated)
  }
  const handleReset = () => { setContent(resetBannerContent()) }

  return (
    <AdminLayout
      title="Homepage Banners"
      subtitle="Upload & configure the active promotional homepage banner"
      actions={<a href="/" target="_blank" rel="noreferrer" className="rounded-full bg-emerald-500/90 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-emerald-400 transition">Preview Home</a>}
    >
        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/80 p-4 space-y-3">
          <input type="file" accept="image/*" onChange={handleFile} className="text-[11px] text-slate-300" />
          {uploading && <p className="text-[11px] text-emerald-300">Uploading…</p>}
          <p className="text-[10px] text-slate-500">Recommended ratio ~16:9, optimized for ≤ 250KB. Stored locally for prototype.</p>
        </div>
        <div className="mt-8 rounded-2xl border border-slate-800/80 bg-gradient-to-br from-slate-900/90 to-slate-950/90 p-5 space-y-5 shadow-inner">
                    <h2 className="text-sm font-semibold text-slate-100">Edit Banner Text & Styling</h2>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-3">
                        <label className="text-[10px] font-semibold text-slate-400">Headline Text</label>
                        <input value={content.headline} onChange={e=>updateField('headline', e.target.value)} className="w-full rounded-lg border border-slate-700/70 bg-slate-950/70 px-3 py-2 text-[12px] text-slate-100" />
                        <div className="flex flex-wrap gap-2 text-[10px]">
                          <select value={content.headlineSize} onChange={e=>updateField('headlineSize', e.target.value)} className="rounded border border-slate-700/70 bg-slate-950/70 px-2 py-1 text-slate-200">
                            {['text-xl','text-2xl','text-3xl','text-4xl'].map(s=> <option key={s}>{s}</option>)}
                          </select>
                          <select value={content.headlineFont} onChange={e=>updateField('headlineFont', e.target.value)} className="rounded border border-slate-700/70 bg-slate-950/70 px-2 py-1 text-slate-200">
                            {['font-display','font-sans','font-serif','font-mono'].map(f=> <option key={f}>{f}</option>)}
                          </select>
                          <button onClick={()=>updateField('headlineBold', !content.headlineBold)} className={`rounded px-2 py-1 border ${content.headlineBold? 'border-emerald-500 text-emerald-300':'border-slate-700 text-slate-300'}`}>Bold</button>
                          <button onClick={()=>updateField('headlineItalic', !content.headlineItalic)} className={`rounded px-2 py-1 border ${content.headlineItalic? 'border-emerald-500 text-emerald-300':'border-slate-700 text-slate-300'}`}>Italic</button>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <label className="text-[10px] font-semibold text-slate-400">Body Text</label>
                        <textarea value={content.body} onChange={e=>updateField('body', e.target.value)} rows={4} className="w-full rounded-lg border border-slate-700/70 bg-slate-950/70 px-3 py-2 text-[12px] text-slate-100" />
                        <div className="flex flex-wrap gap-2 text-[10px]">
                          <select value={content.bodySize} onChange={e=>updateField('bodySize', e.target.value)} className="rounded border border-slate-700/70 bg-slate-950/70 px-2 py-1 text-slate-200">
                            {['text-xs','text-sm','text-base','text-lg'].map(s=> <option key={s}>{s}</option>)}
                          </select>
                          <select value={content.bodyFont} onChange={e=>updateField('bodyFont', e.target.value)} className="rounded border border-slate-700/70 bg-slate-950/70 px-2 py-1 text-slate-200">
                            {['font-sans','font-serif','font-mono','font-display'].map(f=> <option key={f}>{f}</option>)}
                          </select>
                          <button onClick={()=>updateField('bodyBold', !content.bodyBold)} className={`rounded px-2 py-1 border ${content.bodyBold? 'border-emerald-500 text-emerald-300':'border-slate-700 text-slate-300'}`}>Bold</button>
                          <button onClick={()=>updateField('bodyItalic', !content.bodyItalic)} className={`rounded px-2 py-1 border ${content.bodyItalic? 'border-emerald-500 text-emerald-300':'border-slate-700 text-slate-300'}`}>Italic</button>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-3 text-[10px]">
                      <button onClick={handleReset} className="rounded-full border border-slate-700/70 px-3 py-1 text-slate-300 hover:border-emerald-400/60 hover:text-emerald-300">Reset Default</button>
                    </div>
                    <div className="rounded-xl border border-slate-800/70 bg-slate-950/70 p-4">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-emerald-300">Featured</p>
                      <h3 className={`mt-2 ${content.headlineFont} ${content.headlineSize} ${content.headlineBold? 'font-bold':'font-medium'} ${content.headlineItalic? 'italic':''} text-slate-50`}>{content.headline || 'Headline...'}</h3>
                      <p className={`mt-2 max-w-md ${content.bodyFont} ${content.bodySize} ${content.bodyBold? 'font-semibold':''} ${content.bodyItalic? 'italic':''} text-slate-300`}>{content.body || 'Body text...'}</p>
                    </div>
                </div>
                <div className="mt-10 grid gap-4 md:grid-cols-3">
                  {/* banners list */}
          {items.map(b => (
            <div key={b.id} className={`relative rounded-xl border ${b.active? 'border-emerald-500/70':'border-slate-800/80'} bg-slate-900/80 p-3 flex flex-col gap-3`}>
              <img src={b.dataUrl} alt="banner" className="h-28 w-full object-cover rounded-lg" />
              <p className="text-[10px] text-slate-400">Uploaded {new Date(b.createdAt).toLocaleDateString()} {b.active && '• Active'}</p>
              <div className="flex gap-2 text-[10px]">
                {!b.active && <button onClick={()=>makeActive(b.id)} className="rounded-full border border-emerald-500/60 px-3 py-1 text-emerald-300 hover:bg-emerald-500/10">Set Active</button>}
                <button onClick={()=>remove(b.id)} className="rounded-full border border-red-500/60 px-3 py-1 text-red-300 hover:bg-red-500/10">Delete</button>
              </div>
            </div>
          ))}
          {items.length===0 && <p className="text-xs text-slate-500">No banners uploaded.</p>}
        </div>
    </AdminLayout>
  )
}

import BackButton from '../components/BackButton'
import useSupabaseUser from '../hooks/useSupabaseUser'
import { useState, useEffect } from 'react'
import { upsertUserProvider, updateUserProviderContacts, updateUserProviderServices, addProviderBeat, getProvider, removeProviderCatalogItem, userProviderCatalogRemaining } from '../services/serviceProvidersService'
import { fetchProviderProfile, upsertProviderProfile, fetchCatalog, addCatalogItem as addCatalogItemSupabase, removeCatalogItem as removeCatalogItemSupabase, reorderCatalog, updateProviderServices } from '../services/supabaseProvidersRepository'
import { uploadAudio, uploadArtwork } from '../services/storageService'
import { listProviderOrders, updateOrderStatus, computeProviderStats, getProviderAvailability, setProviderAvailability, queryOrders } from '../services/serviceOrdersService'
import { BeatPlayer } from '../components/BeatPlayer'

export function ManageServices() {
  const { user, loading } = useSupabaseUser()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const provider = user ? getProvider(user.id) || upsertUserProvider(user, {}) : null
  const [catalog, setCatalog] = useState([])
  const [profileLoaded, setProfileLoaded] = useState(false)

  const [bio, setBio] = useState(provider?.bio || '')
  const [location, setLocation] = useState(provider?.location || '')
  const [tagsInput, setTagsInput] = useState(provider?.tags?.join(', ') || '')

  // Predefined service categories
  const CATEGORY_KEYS = [
    { key: 'Mixing', id: 'mixing' },
    { key: 'Mastering', id: 'mastering' },
    { key: 'Mix + Master', id: 'mixing+mastering' },
    { key: 'Custom Beats', id: 'custom_beats' },
    { key: 'Studio Session', id: 'studio_session' }
  ]
  // Initialize prices from existing provider services if present
  const initialPrices = CATEGORY_KEYS.reduce((acc, c) => {
    const match = (provider?.services || []).find(s => s.name === c.key)
    acc[c.id] = match ? String(match.price) : ''
    return acc
  }, {})
  const [categoryPrices, setCategoryPrices] = useState(initialPrices)
  const [services, setServices] = useState(provider?.services || [])

  const [instagram, setInstagram] = useState(provider?.contact?.instagram || '')
  const [whatsapp, setWhatsapp] = useState(provider?.contact?.whatsapp || '')
  const [telegram, setTelegram] = useState(provider?.contact?.telegram || '')
  const [phone, setPhone] = useState(provider?.contact?.phone || '')
  const [email, setEmail] = useState(provider?.contact?.email || user?.email || '')

  const [catalogUploading, setCatalogUploading] = useState(false)
  const [catalogTitle, setCatalogTitle] = useState('')
  const [audioFile, setAudioFile] = useState(null)
  const [coverFile, setCoverFile] = useState(null)
  const remaining = provider ? Math.max(0, 3 - catalog.length) : 0

  // Load profile & catalog from Supabase (effect, not state initializer)
  useEffect(() => {
    let active = true
    async function load() {
      if (!user) return
      const prof = await fetchProviderProfile(user.id)
      if (!active) return
      if (prof) {
        setBio(prof.bio || '')
        setLocation(prof.location || '')
        setTagsInput((prof.tags || '').split(',').filter(Boolean).join(', '))
        if (prof.services && Array.isArray(prof.services)) {
          setServices(prof.services)
          setCategoryPrices(prev => {
            const copy = { ...prev }
            prof.services.forEach(s => {
              const match = CATEGORY_KEYS.find(c => c.key === s.name)
              if (match) copy[match.id] = String(s.price)
            })
            return copy
          })
        }
      }
      const cat = await fetchCatalog(user.id)
      if (!active) return
      setCatalog(cat.map(c => ({ id: c.id, title: c.title, audioUrl: c.audio_url, coverUrl: c.cover_url, ord: c.ord })))
      setProfileLoaded(true)
    }
    load()
    return () => { active = false }
  }, [user])

  // Jobs / Orders state (filters + pagination) - must be declared before early returns
  const [orders, setOrders] = useState([])
  const [ordersLoading, setOrdersLoading] = useState(true)
  const [orderSearch, setOrderSearch] = useState('')
  const [orderStatus, setOrderStatus] = useState('all')
  const [page, setPage] = useState(1)
  const [pageSize] = useState(8)
  const [totalOrders, setTotalOrders] = useState(0)
  const [stats, setStats] = useState({ pending:0, open:0, completed:0, cancelled:0, revenue:0, completionRate:0 })
  const [availability, setAvailability] = useState(user ? getProviderAvailability(user.id) : false)
  const [showInstructions, setShowInstructions] = useState(false)
  const instructionsTemplate = 'Thanks for booking! Please send your audio stems (48kHz WAV), reference track, target loudness, and any mix notes. Typical turnaround: 2-3 business days.'

  const loadOrders = async () => {
    if (!user) return
    setOrdersLoading(true)
    try {
      const { data, count } = await queryOrders({ providerId: user.id, status: orderStatus, search: orderSearch, page, pageSize })
      setOrders(data || [])
      setTotalOrders(count || 0)
      const s = await computeProviderStats(user.id)
      setStats(s)
    } catch (e) {
      // local fallback
      const local = listProviderOrders(user.id)
      setOrders(local)
      setTotalOrders(local.length)
      const s = await computeProviderStats(user.id)
      setStats(s)
    } finally { setOrdersLoading(false) }
  }
  // Initial load + reload on key filter changes
  useEffect(() => { if (user) loadOrders() }, [user, orderStatus, orderSearch, page])
  const refreshOrders = () => { loadOrders() }
  const acceptOrder = async (id) => { const res = await updateOrderStatus(id,'open'); refreshOrders(); if (res?.order) fetch('/api/notify',{ method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ kind:'service-order', event:'accepted', payload:{ orderId: res.order.id, buyerEmail: res.order.buyerEmail } }) }).catch(()=>{}) }
  const declineOrder = async (id) => { await updateOrderStatus(id,'cancelled'); refreshOrders() }
  const completeOrder = async (id) => { const res = await updateOrderStatus(id,'completed'); refreshOrders(); if (res?.order) fetch('/api/notify',{ method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ kind:'service-order', event:'completed', payload:{ orderId: res.order.id, buyerEmail: res.order.buyerEmail } }) }).catch(()=>{}) }
  const toggleAvailability = () => { const next = !availability; setAvailability(next); if (user) setProviderAvailability(user.id,next) }

  if (loading) return <p className="p-6 text-xs text-slate-400">Loading...</p>
  if (!user) return <p className="p-6 text-xs text-rose-400">You must be logged in.</p>

  const computeServices = () => {
    const arr = CATEGORY_KEYS
      .map(c => ({ name: c.key, price: Number(categoryPrices[c.id]) }))
      .filter(s => s.price > 0)
    setServices(arr)
    return arr
  }

  const validateUrls = () => {
    const urlFields = [instagram, whatsapp, telegram]
    const urlRegex = /^(https?:\/\/)[\w.-]+(\.[\w.-]+)+[\w\-._~:/?#[\]@!$&'()*+,;=.]*$/i
    for (const u of urlFields) {
      if (u && !urlRegex.test(u)) return 'Invalid URL format in socials (must start with http:// or https://)'
    }
    return null
  }

  const saveAll = async () => {
    setSaving(true)
    setError('')
    try {
      const urlErr = validateUrls()
      if (urlErr) throw new Error(urlErr)
      const tagsArr = tagsInput.split(',').map(t=>t.trim()).filter(Boolean)
      // In-memory immediate update
      upsertUserProvider(user, { bio, location, tags: tagsArr })
      const computed = computeServices()
      updateUserProviderServices(user, computed)
      updateUserProviderContacts(user, { instagram, whatsapp, telegram, phone, email })
      // Persist to Supabase
      await upsertProviderProfile(user.id, { bio, location, tags: tagsArr.join(','), contact_email: email, contact_phone: phone, instagram, whatsapp, telegram })
    } catch (e) {
      setError(e.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const addCatalogItem = async (e) => {
    e.preventDefault()
    if (!catalogTitle.trim() || !audioFile) return
    if (remaining <= 0) return
    setCatalogUploading(true)
    setError('')
    try {
      const { publicUrl: audioUrl } = await uploadAudio(audioFile)
      let coverUrl = null
      if (coverFile) {
        const { publicUrl } = await uploadArtwork(coverFile)
        coverUrl = publicUrl
      }
      // In-memory
      const res = addProviderBeat(user.id, { title: catalogTitle.trim(), audioUrl, coverUrl })
      if (res.error) setError(res.error)
      // Supabase persistence
      const sup = await addCatalogItemSupabase(user.id, { title: catalogTitle.trim(), audioUrl, coverUrl })
      if (sup) {
        setCatalog(prev => [...prev, { id: sup.id, title: sup.title, audioUrl: sup.audio_url, coverUrl: sup.cover_url, ord: sup.ord }])
      }
      setCatalogTitle('')
      setAudioFile(null)
      setCoverFile(null)
    } catch (err) {
      setError(err.message || 'Upload failed')
    } finally {
      setCatalogUploading(false)
    }
  }

  const removeItem = async (itemId) => {
    removeProviderCatalogItem(user.id, itemId)
    await removeCatalogItemSupabase(itemId)
    setCatalog(prev => prev.filter(c => c.id !== itemId).map((c,i)=> ({...c, ord:i})))
    await reorderCatalog(user.id, catalog.filter(c=>c.id!==itemId).map(c=>c.id))
  }

  const refreshedProvider = getProvider(user.id)

  const moveItem = async (index, dir) => {
    setCatalog(prev => {
      const arr = [...prev]
      const target = index + dir
      if (target < 0 || target >= arr.length) return prev
      const tmp = arr[index]
      arr[index] = arr[target]
      arr[target] = tmp
      return arr.map((c,i)=> ({...c, ord:i}))
    })
    // After state update schedule persistence
    setTimeout(async () => {
      await reorderCatalog(user.id, catalog.map(c=>c.id))
    }, 50)
  }

  return (
    <section className="bg-slate-950/95">
      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="flex items-center gap-3">
          <BackButton />
          <h1 className="font-display text-2xl font-semibold text-slate-50">Manage Services</h1>
        </div>
        <p className="mt-1 text-sm text-slate-300 max-w-2xl">Update your offerings, pricing, contact info and showcase up to 3 catalog demos.</p>

        {error && <p className="mt-3 text-xs text-rose-400">{error}</p>}

        <div className="mt-8 grid gap-8 lg:grid-cols-3">
          {/* Left Column: Profile & Services (span 2) */}
          <div className="lg:col-span-2">
            <div className="grid gap-4 md:grid-cols-2 mb-8">
              <div className="rounded-2xl border border-slate-800/80 bg-slate-900/80 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-emerald-300">Jobs Overview</p>
                <div className="mt-3 grid grid-cols-2 gap-3 text-[11px]">
                  <div className="rounded-xl border border-slate-800/70 bg-slate-950/70 p-3"><p className="text-xs font-semibold text-slate-100">Pending</p><p className="mt-1 text-emerald-300 font-semibold">{stats.pending}</p></div>
                  <div className="rounded-xl border border-slate-800/70 bg-slate-950/70 p-3"><p className="text-xs font-semibold text-slate-100">Open</p><p className="mt-1 text-emerald-300 font-semibold">{stats.open}</p></div>
                  <div className="rounded-xl border border-slate-800/70 bg-slate-950/70 p-3"><p className="text-xs font-semibold text-slate-100">Completed</p><p className="mt-1 text-emerald-300 font-semibold">{stats.completed}</p></div>
                  <div className="rounded-xl border border-slate-800/70 bg-slate-950/70 p-3"><p className="text-xs font-semibold text-slate-100">Revenue</p><p className="mt-1 text-emerald-300 font-semibold">${stats.revenue.toFixed(2)}</p></div>
                </div>
                <p className="mt-3 text-[10px] text-slate-500">Completion Rate: {(stats.completionRate*100).toFixed(1)}%</p>
                {stats.fallback && <p className="mt-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-[10px] text-amber-300">Offline mode (local data)</p>}
                <div className="mt-4 flex items-center gap-3">
                  <button onClick={toggleAvailability} className={`rounded-full px-4 py-1.5 text-[11px] font-semibold ${availability ? 'bg-emerald-500 text-slate-950':'bg-slate-800/70 text-slate-300 hover:bg-slate-700/70'}`}>{availability ? 'Accepting Jobs' : 'Closed to New Jobs'}</button>
                  <button onClick={()=>setShowInstructions(true)} className="rounded-full px-4 py-1.5 text-[11px] font-semibold bg-slate-800/70 text-slate-300 hover:bg-slate-700/70">Instructions Template</button>
                </div>
              </div>
              <div className="rounded-2xl border border-slate-800/80 bg-slate-900/80 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-emerald-300">Job Queue</p>
                <p className="mt-2 text-[10px] text-slate-400">Manage current service bookings.</p>
                <div className="mt-3 space-y-3 max-h-72 overflow-auto pr-1">
                  <div className="flex gap-2 mb-2">
                    <input value={orderSearch} onChange={e=>{setOrderSearch(e.target.value); setPage(1); loadOrders()}} placeholder="Search client/service" className="flex-1 rounded-md border border-slate-800/60 bg-slate-950/60 px-2 py-1 text-[10px] text-slate-200" />
                    <select value={orderStatus} onChange={e=>{setOrderStatus(e.target.value); setPage(1); loadOrders()}} className="rounded-md border border-slate-800/60 bg-slate-950/60 px-2 py-1 text-[10px] text-slate-200">
                      <option value="all">All</option>
                      <option value="pending">Pending</option>
                      <option value="open">Open</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                  {ordersLoading && <p className="text-[11px] text-slate-500">Loading…</p>}
                  {!ordersLoading && orders.length === 0 && <p className="text-[11px] text-slate-500">No jobs found.</p>}
                  {orders.map(o => (
                    <div key={o.id} className="rounded-xl border border-slate-800/70 bg-slate-950/70 p-3 text-[11px]">
                      <div className="flex justify-between">
                        <span className="font-semibold text-slate-100">{o.serviceName}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${o.status==='pending'?'bg-amber-500/15 text-amber-300':o.status==='open'?'bg-emerald-500/15 text-emerald-300':o.status==='completed'?'bg-blue-500/15 text-blue-300':'bg-rose-500/15 text-rose-300'}`}>{o.status}</span>
                      </div>
                      <p className="mt-1 text-slate-400">Client: {o.buyerName || 'N/A'} • {o.buyerEmail || 'email pending'}</p>
                      <p className="text-slate-400">Price: <span className="text-emerald-300 font-medium">${o.price}</span></p>
                      <div className="mt-2 flex gap-2 flex-wrap">
                        {o.status==='pending' && (
                          <>
                            <button onClick={()=>acceptOrder(o.id)} className="rounded-full bg-emerald-500 px-3 py-1 text-[10px] font-semibold text-slate-950 hover:bg-emerald-400">Accept</button>
                            <button onClick={()=>declineOrder(o.id)} className="rounded-full bg-slate-800/70 px-3 py-1 text-[10px] font-semibold text-slate-300 hover:bg-rose-500/20 hover:text-rose-300">Decline</button>
                          </>
                        )}
                        {o.status==='open' && (
                          <button onClick={()=>completeOrder(o.id)} className="rounded-full bg-blue-500 px-3 py-1 text-[10px] font-semibold text-slate-950 hover:bg-blue-400">Mark Complete</button>
                        )}
                      </div>
                    </div>
                  ))}
                  {totalOrders > pageSize && !ordersLoading && (
                    <div className="mt-3 flex items-center justify-between text-[10px] text-slate-400">
                      <button disabled={page===1} onClick={()=>{setPage(p=>p-1); loadOrders()}} className="rounded-full border border-slate-800/60 px-3 py-1 disabled:opacity-40">Prev</button>
                      <span>Page {page} / {Math.ceil(totalOrders/pageSize)}</span>
                      <button disabled={page*pageSize>=totalOrders} onClick={()=>{setPage(p=>p+1); loadOrders()}} className="rounded-full border border-slate-800/60 px-3 py-1 disabled:opacity-40">Next</button>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <h2 className="text-sm font-semibold text-slate-100">Profile</h2>
            <label className="mt-4 block text-xs font-medium text-slate-300">Bio</label>
            <textarea value={bio} onChange={e=>setBio(e.target.value)} rows={5} className="mt-1 w-full rounded-xl border border-slate-700/70 bg-slate-900/70 p-2 text-xs text-slate-100 focus:border-emerald-400/70 focus:outline-none" />
            <label className="mt-4 block text-xs font-medium text-slate-300">Location</label>
            <input value={location} onChange={e=>setLocation(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-700/70 bg-slate-900/70 px-3 py-2 text-xs text-slate-100 focus:border-emerald-400/70 focus:outline-none" />
            <label className="mt-4 block text-xs font-medium text-slate-300">Tags (comma separated)</label>
            <input value={tagsInput} onChange={e=>setTagsInput(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-700/70 bg-slate-900/70 px-3 py-2 text-xs text-slate-100 focus:border-emerald-400/70 focus:outline-none" />
            <div className="mt-5 flex gap-3">
              <button onClick={saveAll} disabled={saving} className="rounded-full bg-emerald-500 px-5 py-2 text-[11px] font-semibold text-slate-950 disabled:opacity-50">{saving ? 'Saving…' : 'Save Profile'}</button>
            </div>
            <h2 className="mt-8 text-sm font-semibold text-slate-100">Contact</h2>
            <div className="mt-3 space-y-3">
              <div>
                <label className="text-[10px] font-medium text-slate-400">Email</label>
                <input value={email} onChange={e=>setEmail(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-700/70 bg-slate-900/70 px-2 py-1.5 text-[11px] text-slate-100" />
              </div>
              <div>
                <label className="text-[10px] font-medium text-slate-400">Phone</label>
                <input value={phone} onChange={e=>setPhone(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-700/70 bg-slate-900/70 px-2 py-1.5 text-[11px] text-slate-100" />
              </div>
              <div>
                <label className="text-[10px] font-medium text-slate-400">Instagram</label>
                <input value={instagram} onChange={e=>setInstagram(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-700/70 bg-slate-900/70 px-2 py-1.5 text-[11px] text-slate-100" />
              </div>
              <div>
                <label className="text-[10px] font-medium text-slate-400">WhatsApp</label>
                <input value={whatsapp} onChange={e=>setWhatsapp(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-700/70 bg-slate-900/70 px-2 py-1.5 text-[11px] text-slate-100" />
              </div>
              <div>
                <label className="text-[10px] font-medium text-slate-400">Telegram</label>
                <input value={telegram} onChange={e=>setTelegram(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-700/70 bg-slate-900/70 px-2 py-1.5 text-[11px] text-slate-100" />
              </div>
              <button onClick={()=>{updateUserProviderContacts(user,{ email, phone, instagram, whatsapp, telegram });}} className="mt-2 rounded-full bg-emerald-500 px-4 py-1.5 text-[11px] font-semibold text-slate-950">Save Contacts</button>
            </div>
            <h2 className="mt-8 text-sm font-semibold text-slate-100">Service Offerings</h2>
            <p className="mt-1 text-[11px] text-slate-400">Enter pricing for any services you offer. Leave blank to exclude.</p>
            <div className="mt-3 space-y-3">
              {CATEGORY_KEYS.map(c => (
                <div key={c.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-800/70 bg-slate-900/70 px-3 py-2">
                  <span className="text-[11px] font-medium text-slate-200">{c.key}</span>
                  <input
                    type="number"
                    min="0"
                    value={categoryPrices[c.id]}
                    onChange={e=>setCategoryPrices(p=>({...p, [c.id]: e.target.value }))}
                    placeholder="Price"
                    className="w-28 rounded-md border border-slate-700/70 bg-slate-800/70 px-2 py-1 text-[11px] text-slate-100 focus:border-emerald-400/70"
                  />
                </div>
              ))}
              <button onClick={()=>{const arr = computeServices(); updateUserProviderServices(user, arr); updateProviderServices(user.id, arr)}} className="rounded-full bg-emerald-500 px-4 py-1.5 text-[11px] font-semibold text-slate-950">Save Services</button>
              {services.length > 0 && (
                <div className="mt-2 space-y-1">
                  <div className="text-[10px] font-semibold text-slate-400">Current:</div>
                  {services.map(s => (
                    <div key={s.name} className="text-[10px] text-emerald-300">{s.name}: ${s.price}</div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="lg:col-span-1">
            <h2 className="text-sm font-semibold text-slate-100">Catalog (max 3)</h2>
            {remaining > 0 && (
              <p className="mt-1 text-[11px] text-emerald-300">{remaining} remaining uploads.</p>
            )}
            <div className="mt-4 space-y-3">
              {catalog.map((item, idx) => (
                <div key={item.id} className="rounded-xl border border-slate-800/70 bg-slate-900/70 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-100">{item.title}</span>
                    <div className="flex items-center gap-2">
                      <button onClick={()=>moveItem(idx,-1)} disabled={idx===0} className="text-[10px] text-slate-400 hover:text-emerald-300 disabled:opacity-30">↑</button>
                      <button onClick={()=>moveItem(idx,1)} disabled={idx===catalog.length-1} className="text-[10px] text-slate-400 hover:text-emerald-300 disabled:opacity-30">↓</button>
                      <button onClick={()=>removeItem(item.id)} className="text-[10px] text-rose-400 hover:text-rose-300">Remove</button>
                    </div>
                  </div>
                  <BeatPlayer src={item.audioUrl} className="mt-3" />
                </div>
              ))}
            </div>
            {remaining > 0 && (
              <form onSubmit={addCatalogItem} className="mt-6 space-y-3 rounded-2xl border border-slate-800/70 bg-slate-900/70 p-4">
                <h3 className="text-xs font-semibold text-slate-100">Add Catalog Item</h3>
                <input value={catalogTitle} onChange={e=>setCatalogTitle(e.target.value)} placeholder="Title" className="w-full rounded-lg border border-slate-800/70 bg-slate-900/70 px-2 py-1.5 text-[11px] text-slate-100" required />
                <div>
                  <label className="text-[10px] font-medium text-slate-400">Audio File</label>
                  <input type="file" accept="audio/*" onChange={e=>setAudioFile(e.target.files?.[0]||null)} className="mt-1 w-full text-[11px] text-slate-300" required />
                </div>
                <div>
                  <label className="text-[10px] font-medium text-slate-400">Cover (optional)</label>
                  <input type="file" accept="image/*" onChange={e=>setCoverFile(e.target.files?.[0]||null)} className="mt-1 w-full text-[11px] text-slate-300" />
                </div>
                <button type="submit" disabled={catalogUploading} className="rounded-full bg-emerald-500 px-4 py-1.5 text-[11px] font-semibold text-slate-950 disabled:opacity-50">{catalogUploading ? 'Uploading…' : 'Add Item'}</button>
              </form>
            )}
          </div>
        </div>
      </div>
      {showInstructions && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/80 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-800/80 bg-slate-900/90 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-100">Instructions Template</h3>
              <button onClick={()=>setShowInstructions(false)} className="rounded-full bg-slate-800/70 px-3 py-1 text-[10px] text-slate-300 hover:bg-slate-700/70">Close</button>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">Provide clients with clear delivery guidelines. Customize before sending.</p>
            <div className="rounded-xl border border-slate-800/70 bg-slate-950/70 p-3 text-[11px] text-slate-200 whitespace-pre-line">{instructionsTemplate}</div>
            <button onClick={()=>{ navigator.clipboard?.writeText(instructionsTemplate) }} className="rounded-full bg-emerald-500 px-4 py-1.5 text-[11px] font-semibold text-slate-950 hover:bg-emerald-400">Copy to Clipboard</button>
          </div>
        </div>
      )}
    </section>
  )
}

export default ManageServices

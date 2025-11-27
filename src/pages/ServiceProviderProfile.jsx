import BackButton from '../components/BackButton'
import { useParams } from 'react-router-dom'
import { getProvider } from '../services/serviceProvidersService'
import { useEffect, useState } from 'react'
import ProfileShareModal from '../components/ProfileShareModal'
import { fetchProviderProfile, fetchCatalog } from '../services/supabaseProvidersRepository'
import { BeatPlayer } from '../components/BeatPlayer'
import { useMemo } from 'react'
import PayPalButtonsGroup from '../components/payments/PayPalButtonsGroup'
import { createServiceOrder } from '../services/serviceOrdersService'
import ProviderReviews from '../components/ProviderReviews'

export function ServiceProviderProfile() {
  const { id } = useParams()
  const baseProvider = getProvider(id)
  const [profile, setProfile] = useState(null)
  const [catalog, setCatalog] = useState([])
  const [shareOpen, setShareOpen] = useState(false)
  const [bookOpen, setBookOpen] = useState(false)
  const [selectedService, setSelectedService] = useState(null)
  const [buyerName, setBuyerName] = useState('')
  const [buyerEmail, setBuyerEmail] = useState('')
  const [result, setResult] = useState(null)
  const provider = profile ? {
    ...baseProvider,
    bio: profile.bio || baseProvider?.bio || '',
    location: profile.location || baseProvider?.location || '',
    tags: (profile.tags ? profile.tags.split(',').filter(Boolean) : baseProvider?.tags) || [],
    contact: {
      email: profile.contact_email || baseProvider?.contact?.email,
      phone: profile.contact_phone || baseProvider?.contact?.phone || '',
      instagram: profile.instagram || '',
      whatsapp: profile.whatsapp || '',
      telegram: profile.telegram || ''
    },
    catalog: catalog.length ? catalog : baseProvider?.catalog || []
  } : baseProvider

  useEffect(() => {
    let active = true
    async function load() {
      const prof = await fetchProviderProfile(id)
      const cat = await fetchCatalog(id)
      if (!active) return
      if (prof) setProfile(prof)
      if (cat?.length) setCatalog(cat.map(c => ({ id: c.id, title: c.title, audioUrl: c.audio_url, coverUrl: c.cover_url })))
    }
    load()
    return () => { active = false }
  }, [id])

  if (!provider) {
    return (
      <section className="bg-slate-950/95">
        <div className="mx-auto max-w-3xl px-4 py-10">
          <BackButton />
          <p className="mt-6 text-sm text-rose-400">Provider not found.</p>
        </div>
      </section>
    )
  }

  return (
    <section className="bg-slate-950/95">
      <div className="mx-auto max-w-4xl px-4 py-10">
        <div className="flex items-center gap-3">
          <BackButton />
          <h1 className="font-display text-2xl font-semibold text-slate-50">{provider.name}</h1>
        </div>
        <p className="mt-1 text-sm text-slate-300">{provider.location}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {provider.tags.map(t => (
            <span key={t} className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-300">{t}</span>
          ))}
        </div>
        <p className="mt-5 max-w-2xl text-[13px] leading-relaxed text-slate-300">{provider.bio}</p>
        <ProviderReviews providerId={id} />
        <div className="mt-8 rounded-2xl border border-slate-800/70 bg-slate-900/70 p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-100">Services</h2>
            <div className="flex items-center gap-2">
              <button onClick={() => setShareOpen(true)} className="rounded-full bg-slate-800/70 border border-slate-700/60 px-3 py-1.5 text-[10px] text-slate-200 hover:border-emerald-400/60 hover:text-emerald-300 transition">Share Profile</button>
              {provider.services.length>0 && (
                <button onClick={() => { setBookOpen(true); setSelectedService(provider.services[0]) }} className="rounded-full bg-emerald-500 px-3 py-1.5 text-[10px] font-semibold text-slate-950 hover:bg-emerald-400 transition">Request Service</button>
              )}
            </div>
          </div>
          <ul className="mt-3 divide-y divide-slate-800/60">
            {provider.services.map(s => (
              <li key={s.name} className="flex items-center justify-between py-2 text-[12px] text-slate-300">
                <span>{s.name}</span>
                <div className="flex items-center gap-3">
                  <span className="font-medium text-emerald-300">${s.price}</span>
                  <button onClick={()=>{ setSelectedService(s); setBookOpen(true) }} className="rounded-full bg-slate-800/70 px-3 py-1 text-[10px] text-slate-200 hover:bg-slate-700/70">Book</button>
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex flex-wrap gap-2">
            {provider.contact.email && <a href={`mailto:${provider.contact.email}`} className="rounded-full bg-emerald-500 px-5 py-2 text-[11px] font-semibold text-slate-950 hover:bg-emerald-400 transition">Email</a>}
            {provider.contact.instagram && <a href={provider.contact.instagram} target="_blank" rel="noreferrer" className="rounded-full border border-slate-700/70 bg-slate-800/80 px-4 py-2 text-[11px] font-semibold text-slate-200 hover:border-emerald-400/70 hover:text-emerald-300 transition">Instagram</a>}
            {provider.contact.whatsapp && <a href={provider.contact.whatsapp} target="_blank" rel="noreferrer" className="rounded-full border border-slate-700/70 bg-slate-800/80 px-4 py-2 text-[11px] font-semibold text-slate-200 hover:border-emerald-400/70 hover:text-emerald-300 transition">WhatsApp</a>}
            {provider.contact.telegram && <a href={provider.contact.telegram} target="_blank" rel="noreferrer" className="rounded-full border border-slate-700/70 bg-slate-800/80 px-4 py-2 text-[11px] font-semibold text-slate-200 hover:border-emerald-400/70 hover:text-emerald-300 transition">Telegram</a>}
            {provider.contact.phone && <span className="rounded-full border border-slate-700/70 bg-slate-800/80 px-4 py-2 text-[11px] font-semibold text-slate-200">{provider.contact.phone}</span>}
          </div>
        </div>
        <div className="mt-10">
          <h2 className="text-sm font-semibold text-slate-100">Catalog (max 3)</h2>
          {provider.catalog.length === 0 && <p className="mt-2 text-[11px] text-slate-500">No catalog beats yet.</p>}
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {provider.catalog.map(b => (
              <div key={b.id} className="rounded-xl border border-slate-800/70 bg-slate-900/70 p-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-slate-100">{b.title}</h3>
                  <span className="text-[10px] text-slate-500">ID {b.id.slice(-5)}</span>
                </div>
                <BeatPlayer src={b.audioUrl} className="mt-3" />
              </div>
            ))}
          </div>
        </div>
      </div>
      <ProfileShareModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        profileType="service"
        profileId={id}
        displayName={provider?.name || profile?.display_name || id}
      />
      {bookOpen && selectedService && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/80 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-800/80 bg-slate-900/90 p-5 shadow-xl space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-100">Request {selectedService.name}</h2>
              <button onClick={()=>{ setBookOpen(false); setResult(null) }} className="rounded-full bg-slate-800/70 px-3 py-1 text-[11px] text-slate-300 hover:bg-slate-700/70">Close</button>
            </div>
            <div className="text-[12px] text-slate-300">
              <p className="font-medium text-slate-200">Provider: {provider.name}</p>
              <p className="text-[11px] text-slate-500">Service: {selectedService.name} • <span className="text-emerald-300">${selectedService.price}</span></p>
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              <div>
                <label className="text-[10px] font-semibold text-slate-400">Your Name</label>
                <input value={buyerName} onChange={e=>setBuyerName(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-700/70 bg-slate-950/70 px-2 py-1.5 text-[12px] text-slate-100" />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-400">Email</label>
                <input value={buyerEmail} onChange={e=>setBuyerEmail(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-700/70 bg-slate-950/70 px-2 py-1.5 text-[12px] text-slate-100" />
              </div>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-slate-400">How will you pay?</p>
              <div className="mt-2">
                <PayPalButtonsGroup
                  amount={selectedService.price}
                  currency="USD"
                  description={`${selectedService.name} with ${provider.name}`}
                  payerName={buyerName}
                  payerEmail={buyerEmail}
                  onSuccess={async () => {
                    try {
                      const res = await createServiceOrder({ providerId: id, serviceName: selectedService.name, price: selectedService.price, buyerName, buyerEmail })
                      if (res.error) {
                        setResult({ success:false, error: res.error })
                      } else {
                        setResult({ success:true, order: res.order })
                        // Notify client order posted
                        fetch('/api/notify', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ kind:'service-order', event:'posted', payload:{ orderId: res.order.id, buyerEmail } }) }).catch(()=>{})
                      }
                    } catch (e) {
                      setResult({ success:false, error: e.message || 'Order creation failed' })
                    }
                  }}
                  onError={(err) => setResult({ success:false, error: err?.message || 'PayPal error' })}
                />
              </div>
              <p className="mt-2 text-[10px] text-slate-500">Provider will contact you at the provided email after payment.</p>
            </div>
            {result && (
              <div className="rounded-xl border border-slate-800/70 bg-slate-950/70 p-3 text-[11px] text-slate-300 space-y-1">
                {result.success ? (
                  <>
                    <p className="text-emerald-300">Payment successful. Request submitted.</p>
                    {result.order && <p className="text-[10px] text-slate-500">Order ID: {result.order.id.slice(-8)} (Status: pending – provider must accept)</p>}
                  </>
                ) : (
                  <p className="text-red-300">Payment failed: {result.error || ''}</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  )
}

export default ServiceProviderProfile

import { useNavigate, useParams } from 'react-router-dom'
import { useBeats } from '../hooks/useBeats'
import BackButton from '../components/BackButton'
import { BeatCard } from '../components/BeatCard'
import { followerCount, isFollowing, toggleFollow } from '../services/socialService'
import { useEffect, useState } from 'react'
import useSupabaseUser from '../hooks/useSupabaseUser'
import { getSubscription } from '../services/subscriptionService'
import ProfileShareModal from '../components/ProfileShareModal'
import { addNotification } from '../services/notificationsRepository'
import YouTubePreview from '../components/YouTubePreview'
import { getProducerProfile, ensureSampleProfile } from '../services/producerProfileService'
import ReportModal from '../components/ReportModal'
import { isBeatBoosted } from '../services/boostsService'

export function ProducerProfile() {
  const { producerId } = useParams()
  const { beats } = useBeats()
  const catalog = beats.filter(b => b.userId === producerId)
  const [followers, setFollowers] = useState(0)
  const { user } = useSupabaseUser()
  const navigate = useNavigate()
  const [sub, setSub] = useState(null)
  const [shareOpen, setShareOpen] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const [following, setFollowing] = useState(false)

  useEffect(()=> {
    (async ()=> {
      if (producerId) setFollowers(await followerCount(producerId))
      if (producerId && user && user.id !== producerId) {
        try {
          const isF = await isFollowing({ followerId: user.id, producerId })
          setFollowing(isF)
        } catch {}
      } else {
        setFollowing(false)
      }
    })()
  }, [producerId, user])
  useEffect(()=> {
    let active = true
    if (user) {
      ;(async () => {
        const s = await getSubscription(user.id)
        if (active) setSub(s)
      })()
    } else {
      setSub(null)
    }
    return () => { active = false }
  }, [user])
  // Ensure a sample profile for prototype if none exists
  const [profile, setProfile] = useState(null)
  useEffect(()=> { (async ()=> { if (producerId) { await ensureSampleProfile(producerId); setProfile(await getProducerProfile(producerId)) } })() }, [producerId])
  const youtubeUrl = profile?.youtubeUrl || null
  const isOwnProfile = user && catalog.some(b => b.userId === user.id)
  const showProBadge = isOwnProfile && sub
  const handleFollow = async () => {
    if (!user || user.id === producerId) return
    try {
      const optimisticFollowers = following ? followers - 1 : followers + 1
      setFollowing(!following)
      setFollowers(Math.max(0, optimisticFollowers))
      const res = await toggleFollow({ followerId: user.id, producerId })
      if (res.following !== !following) {
        setFollowing(res.following)
        setFollowers(await followerCount(producerId))
      } else if (res.following) {
        try {
          await addNotification({
            recipientId: producerId,
            actorId: user.id,
            type: 'follow',
            data: { user: user.email },
          })
        } catch (e) {
          console.warn('follow notification failed', e)
        }
      }
    } catch (e) {
      setFollowing(false)
      setFollowers(await followerCount(producerId))
    }
  }

  const handleMessage = () => {
    if (!user || user.id === producerId) return
    navigate(`/producer/inbox?to=${encodeURIComponent(producerId)}`)
  }
  return (
    <section className="bg-slate-950/95">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="flex items-center gap-3">
          <BackButton />
          <h1 className="font-display text-2xl font-semibold text-slate-50">Producer Profile</h1>
        </div>
        <div className="mt-6 rounded-3xl border border-slate-800/80 bg-slate-900/80 p-6 grid gap-8 md:grid-cols-[1.2fr,1fr]">
          <div className="space-y-6">
            <div className="flex items-start gap-5">
              <div className="h-28 w-28 rounded-2xl bg-gradient-to-br from-emerald-500 via-emerald-400 to-orange-500" />
              <div className="flex-1">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300 flex items-center gap-2">Producer {showProBadge && <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-300">Pro</span>}</p>
                <h2 className="text-xl font-semibold text-slate-50 truncate">{producerId}</h2>
                <p className="mt-1 text-sm text-slate-300">Authentic Caribbean riddims & type beats.</p>
                 <div className="mt-2 flex items-center gap-3">
                   <p className="text-[11px] text-slate-400">Followers: {followers}</p>
                   <button onClick={() => setShareOpen(true)} className="flex items-center gap-1 rounded-full border border-slate-700/60 bg-slate-800/70 px-3 py-1 text-[10px] font-medium text-slate-300 hover:border-emerald-400/60 hover:text-emerald-300 transition">
                     <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3">
                       <path d="M22 2 11 13" />
                       <path d="M22 2 15 22 11 13 2 9 22 2" />
                     </svg>
                     <span>Share</span>
                   </button>
                    <button onClick={()=>setReportOpen(true)} className="flex items-center gap-1 rounded-full border border-slate-700/60 bg-slate-800/70 px-3 py-1 text-[10px] font-medium text-slate-300 hover:border-rose-400/60 hover:text-rose-300 transition">Report</button>
                 </div>
                 <div className="mt-3 flex items-center gap-2">
                   <button onClick={handleFollow} className="rounded-full border border-emerald-400/70 px-4 py-2 text-[11px] font-semibold text-emerald-300 hover:bg-emerald-500/10">
                     {following ? 'Following' : 'Follow'}
                   </button>
                   <button onClick={handleMessage} className="rounded-full bg-emerald-500 px-4 py-2 text-[11px] font-semibold text-slate-950 hover:bg-emerald-400">
                     Message
                   </button>
                 </div>
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-100">Bio</h3>
              <p className="mt-2 text-sm text-slate-300 leading-relaxed">This is a placeholder bio. Producer can customize their description, influences, achievements and collaboration interests.</p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-100">Licensing Info</h3>
              <ul className="mt-2 space-y-1 text-[12px] text-slate-300">
                <li>• Basic / Premium / Unlimited tiers supported</li>
                <li>• Exclusive purchases handled manually (contact to negotiate)</li>
                <li>• Instant delivery + PDF license</li>
              </ul>
            </div>
            {youtubeUrl && (
              <YouTubePreview youtubeUrl={youtubeUrl} />
            )}
          </div>
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-100">Beat Catalog ({catalog.length})</h3>
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
              {catalog.map(b => (
                <BeatCard
                  key={b.id}
                  {...b}
                  coverUrl={b.coverUrl || null}
                  audioUrl={b.audioUrl}
                  sponsored={isBeatBoosted(b.id)}
                  compact={true}
                />
              ))}
              {catalog.length===0 && <p className="text-xs text-slate-500">No beats uploaded yet.</p>}
            </div>
          </div>
        </div>
        <ProfileShareModal open={shareOpen} onClose={() => setShareOpen(false)} profileType="producer" profileId={producerId} displayName={producerId} />
        <ReportModal open={reportOpen} onClose={()=>setReportOpen(false)} targetId={producerId} type="producer" />
      </div>
    </section>
  )
}

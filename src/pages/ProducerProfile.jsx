import { useNavigate, useParams, Link } from 'react-router-dom'
import { useBeats } from '../hooks/useBeats'
import BackButton from '../components/BackButton'
import { BeatCard } from '../components/BeatCard'
import { followerCount, isFollowing, toggleFollow } from '../services/socialService'
import { useEffect, useState, useRef } from 'react'
import useSupabaseUser from '../hooks/useSupabaseUser'
import { getSubscription } from '../services/subscriptionService'
import ProfileShareModal from '../components/ProfileShareModal'
import { addNotification } from '../services/notificationsRepository'
import YouTubePreview from '../components/YouTubePreview'
import { getProducerProfile } from '../services/producerProfileService'
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
  useEffect(() => {
    ;(async () => {
      if (producerId) {
        setProfile(await getProducerProfile(producerId))
      }
    })()
  }, [producerId])
  const youtubeUrl = profile?.youtubeUrl || null
  const isOwnProfile = user && producerId === user.id
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

  const sampleBeat = catalog[0] || null
  const authFallbackName =
    isOwnProfile &&
    (user.user_metadata?.display_name ||
      user.email?.split('@')[0] ||
      null)
  const displayName =
    profile?.displayName ||
    authFallbackName ||
    sampleBeat?.producer ||
    producerId
  const bioText =
    profile?.bio?.trim()?.length
      ? profile.bio
      : 'This producer has not added a bio yet.'

  const normalizeUrl = (url) => {
    if (!url) return null
    const trimmed = url.trim()
    if (!trimmed) return null
    if (/^https?:\/\//i.test(trimmed)) return trimmed
    return `https://${trimmed}`
  }

  return (
    <section className="bg-slate-950/95">
      <div className="mx-auto max-w-6xl px-3 py-6 sm:px-4 sm:py-10">
        <div className="flex items-center gap-3">
          <BackButton />
          <h1 className="font-display text-xl font-semibold text-slate-50 sm:text-2xl">Producer Profile</h1>
        </div>
        <div className="mt-6 rounded-3xl border border-slate-800/80 bg-slate-900/80 p-6 grid gap-8 md:grid-cols-[1.2fr,1fr]">
          <div className="space-y-6">
            <div className="flex items-start gap-5">
              <div className="h-28 w-28 overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 via-emerald-400 to-orange-500">
                {profile?.avatarUrl && (
                  <img
                    src={profile.avatarUrl}
                    alt={displayName}
                    className="h-full w-full object-cover"
                  />
                )}
              </div>
              <div className="flex-1">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300 flex items-center gap-2">
                  Producer{' '}
                  {showProBadge && (
                    <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-300">
                      Pro
                    </span>
                  )}
                </p>
                <h2 className="text-xl font-semibold text-slate-50 truncate">
                  {displayName}
                </h2>
                <p className="mt-1 text-sm text-slate-300">
                  {bioText}
                </p>
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
                   {(profile?.website ||
                     profile?.instagram ||
                     profile?.twitterX ||
                     youtubeUrl) && (
                     <div className="ml-auto flex items-center gap-2">
                       {profile?.website && (
                         <a
                           href={normalizeUrl(profile.website)}
                           target="_blank"
                           rel="noreferrer"
                           className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-700/80 bg-slate-900/80 text-[11px] text-slate-200 hover:border-emerald-400/70"
                         >
                           {/* Globe icon */}
                           <svg
                             xmlns="http://www.w3.org/2000/svg"
                             viewBox="0 0 24 24"
                             className="h-3.5 w-3.5"
                             fill="none"
                             stroke="currentColor"
                             strokeWidth="1.6"
                           >
                             <circle cx="12" cy="12" r="9" />
                             <path d="M3 12h18" />
                             <path d="M12 3a15.3 15.3 0 0 1 4 9 15.3 15.3 0 0 1-4 9 15.3 15.3 0 0 1-4-9 15.3 15.3 0 0 1 4-9z" />
                           </svg>
                         </a>
                       )}
                       {profile?.instagram && (
                         <a
                           href={normalizeUrl(
                             profile.instagram.startsWith('@')
                               ? `https://instagram.com/${profile.instagram.slice(1)}`
                               : profile.instagram,
                           )}
                           target="_blank"
                           rel="noreferrer"
                           className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-700/80 bg-slate-900/80 text-[11px] text-slate-200 hover:border-emerald-400/70"
                         >
                           {/* Instagram logo */}
                           <svg
                             xmlns="http://www.w3.org/2000/svg"
                             viewBox="0 0 24 24"
                             className="h-3.5 w-3.5"
                             fill="none"
                             stroke="currentColor"
                             strokeWidth="1.6"
                           >
                             <rect x="4" y="4" width="16" height="16" rx="4" />
                             <circle cx="12" cy="12" r="3.5" />
                             <circle cx="17" cy="7" r="0.8" fill="currentColor" />
                           </svg>
                         </a>
                       )}
                       {profile?.twitterX && (
                         <a
                           href={normalizeUrl(
                             profile.twitterX.startsWith('@')
                               ? `https://x.com/${profile.twitterX.slice(1)}`
                               : profile.twitterX,
                           )}
                           target="_blank"
                           rel="noreferrer"
                           className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-700/80 bg-slate-900/80 text-[11px] text-slate-200 hover:border-emerald-400/70"
                         >
                           {/* X logo */}
                           <svg
                             xmlns="http://www.w3.org/2000/svg"
                             viewBox="0 0 24 24"
                             className="h-3.5 w-3.5"
                             fill="none"
                             stroke="currentColor"
                             strokeWidth="1.8"
                           >
                             <path d="M4 4l16 16m0-16L4 20" />
                           </svg>
                         </a>
                       )}
                       {youtubeUrl && (
                         <a
                           href={normalizeUrl(youtubeUrl)}
                           target="_blank"
                           rel="noreferrer"
                           className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-700/80 bg-slate-900/80 text-[11px] text-slate-200 hover:border-emerald-400/70"
                         >
                           {/* YouTube play logo */}
                           <svg
                             xmlns="http://www.w3.org/2000/svg"
                             viewBox="0 0 24 24"
                             className="h-3.5 w-3.5"
                             fill="currentColor"
                           >
                             <path d="M21.6 7.2s-.2-1.5-.8-2.1c-.8-.8-1.7-.8-2.1-.9C15.2 4 12 4 12 4h0s-3.2 0-6.7.2c-.4.1-1.3.1-2.1.9C2.6 5.7 2.4 7.2 2.4 7.2S2.2 8.9 2.2 10.6v1.7c0 1.7.2 3.4.2 3.4s.2 1.5.8 2.1c.8.8 1.9.8 2.4.9 1.8.2 7.4.2 7.4.2s3.2 0 6.7-.2c.4-.1 1.3-.1 2.1-.9.6-.6.8-2.1.8-2.1s.2-1.7.2-3.4v-1.7c0-1.7-.2-3.4-.2-3.4zM10 14.8V8.8l5 3-5 3z" />
                           </svg>
                         </a>
                       )}
                     </div>
                   )}
                 </div>
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-100">Bio</h3>
              <p className="mt-2 text-sm text-slate-300 leading-relaxed">
                {bioText}
              </p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-100">Licensing</h3>
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
            <div className="grid gap-4 sm:grid-cols-3 md:grid-cols-4">
              {catalog.map((b) => (
                <BeatSquareCard
                  key={b.id}
                  beat={b}
                  boosted={isBeatBoosted(b.id)}
                />
              ))}
              {catalog.length === 0 && (
                <p className="text-xs text-slate-500">No beats uploaded yet.</p>
              )}
            </div>
          </div>
        </div>
        <ProfileShareModal open={shareOpen} onClose={() => setShareOpen(false)} profileType="producer" profileId={producerId} displayName={displayName} />
        <ReportModal open={reportOpen} onClose={()=>setReportOpen(false)} targetId={producerId} type="producer" />
      </div>
    </section>
  )
}

function BeatSquareCard({ beat, boosted }) {
  const [playing, setPlaying] = useState(false)
  const audioRef = useRef(null)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    if (playing) {
      audio.play().catch(() => setPlaying(false))
    } else {
      audio.pause()
    }
  }, [playing])

  const handlePlay = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (!beat.audioUrl || !audioRef.current) return
    setPlaying((p) => !p)
  }

  return (
    <Link
      to={`/beat/${beat.id}`}
      className="group relative aspect-square w-full overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/80 shadow-[0_14px_40px_rgba(0,0,0,0.75)] transition hover:border-red-500/70 hover:bg-slate-900"
    >
      {beat.coverUrl ? (
        <img
          src={beat.coverUrl}
          alt={beat.title}
          className="h-full w-full object-cover transition duration-200 group-hover:scale-[1.03]"
        />
      ) : (
        <div className="h-full w-full bg-gradient-to-br from-red-500 via-fuchsia-500 to-amber-400" />
      )}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

      {boosted && (
        <span className="absolute left-2 top-2 rounded-full border border-red-400/80 bg-red-500/20 px-2 py-[1px] text-[9px] font-semibold text-red-100 shadow">
          Boosted
        </span>
      )}

      <button
        type="button"
        onClick={handlePlay}
        className="absolute inset-0 m-auto flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-[15px] font-semibold text-slate-900 shadow-lg transition group-hover:scale-105"
      >
        {playing ? '❚❚' : '▶'}
      </button>

      <div className="absolute inset-x-2 bottom-2">
        <p className="truncate text-[11px] font-semibold text-slate-50">
          {beat.title}
        </p>
        <p className="truncate text-[10px] text-slate-300">
          {beat.genre || 'Caribbean'} • {beat.bpm || 0} BPM
        </p>
      </div>

      <audio
        ref={audioRef}
        src={beat.audioUrl || ''}
        preload="metadata"
        className="hidden"
      />
    </Link>
  )
}

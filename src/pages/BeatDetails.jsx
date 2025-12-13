import { useParams, useLocation, useNavigate } from 'react-router-dom'
import { useState, useEffect, useMemo } from 'react'
import { LICENSE_TERMS, DEFAULT_TERMS } from '../constants/licenseTerms'
import BackButton from '../components/BackButton'
import { BeatPlayer } from '../components/BeatPlayer'
import { BeatCard } from '../components/BeatCard'
import useSupabaseUser from '../hooks/useSupabaseUser'
import {
  toggleLike,
  toggleFavorite,
  likeCount,
  favoriteCount,
  isLiked,
  isFavorited,
  toggleFollow,
  isFollowing,
  followerCount,
  listBeatComments,
  addBeatComment,
  subscribeBeatComments,
} from '../services/socialService'
import { getBeat } from '../services/beatsService'
import { fetchBeat as fetchBeatRemote } from '../services/beatsRepository'
import { useCart } from '../context/CartContext'
import ReportModal from '../components/ReportModal'
import { useBeats } from '../hooks/useBeats'
import { getPlayCount } from '../services/analyticsService'

export function BeatDetails() {
  const params = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const locationBeat = location.state && location.state.beat ? location.state.beat : null
  const raw = params.id || params.idSlug
  const id = raw ? raw.split('-')[0] : null
  const [selected, setSelected] = useState(null)
  const { user } = useSupabaseUser()
  const localBeat = locationBeat || getBeat(id)
  const [remoteBeat, setRemoteBeat] = useState(null)
  const beat = localBeat || remoteBeat
  const producerId = beat?.userId || beat?.user_id || null
  const [liked, setLiked] = useState(false)
  const [favorited, setFavorited] = useState(false)
  const [likes, setLikes] = useState(0)
  const [favs, setFavs] = useState(0)
  const [following, setFollowing] = useState(false)
  const [followers, setFollowers] = useState(0)
  const [reportOpen, setReportOpen] = useState(false)
  const { beats: allBeats } = useBeats()
  const { addBeat } = useCart() || {}
  const [comments, setComments] = useState([])
  const [commentText, setCommentText] = useState('')
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false)
  useEffect(()=> { (async () => {
    setLikes(await likeCount(id))
    setFavs(await favoriteCount(id))
    if (producerId) setFollowers(await followerCount(producerId))
    if (user) {
      setLiked(await isLiked({ userId: user.id, beatId: id }))
      setFavorited(await isFavorited({ userId: user.id, beatId: id }))
      if (producerId) setFollowing(await isFollowing({ followerId: user.id, producerId }))
    }
  })() }, [id, user, producerId])
  // Fallback to Supabase if not in local cache
  useEffect(()=> { (async () => {
    if (localBeat || !id) return
    const data = await fetchBeatRemote(id)
    if (data) {
      setRemoteBeat({
        id: data.id,
        title: data.title,
        producer: data.producer || 'Unknown',
        collaborator: data.collaborator || null,
        musicalKey: data.musical_key || null,
        userId: data.user_id || null,
        genre: data.genre || 'Dancehall',
        bpm: data.bpm || 0,
        price: data.price || 29,
        audioUrl: data.audio_url || null,
        untaggedUrl: data.untagged_url || null,
        coverUrl: data.cover_url || null,
        bundleUrl: data.bundle_url || null,
        description: data.description || '',
        licensePrices: data.license_prices || null,
        freeDownload: !!data.free_download,
      })
    }
  })() }, [id, localBeat])
  const handleLike = async () => {
    if (!user) return
    const optimistic = liked ? likes - 1 : likes + 1
    setLiked(!liked)
    setLikes(Math.max(0, optimistic))
    const res = await toggleLike({ userId: user.id, beatId: id, producerId })
    if (res.liked !== !liked) {
      setLiked(res.liked)
      setLikes(await likeCount(id))
    }
  }
  const handleFav = async () => {
    if (!user) return
    const optimistic = favorited ? favs - 1 : favs + 1
    setFavorited(!favorited)
    setFavs(Math.max(0, optimistic))
    const res = await toggleFavorite({
      userId: user.id,
      beatId: id,
      producerId,
    })
    if (res.favorited !== !favorited) {
      setFavorited(res.favorited)
      setFavs(await favoriteCount(id))
    }
  }
  const handleFollow = async () => {
    if (!user || !producerId) return
    const optimistic = following ? followers - 1 : followers + 1
    setFollowing(!following)
    setFollowers(Math.max(0, optimistic))
    const res = await toggleFollow({ followerId: user.id, producerId })
    if (res.following !== !following) {
      setFollowing(res.following)
      setFollowers(await followerCount(producerId))
    }
  }
  const handleAddToCart = () => {
    if (!beat || !selected || !addBeat) return
    addBeat(beat.id, selected)
  }

  // Comments: load + realtime subscription
  useEffect(() => {
    let unsub = null
    ;(async () => {
      if (!id) return
      const initial = await listBeatComments(id)
      setComments(initial)
      unsub = subscribeBeatComments({
        beatId: id,
        onComment: (c) => {
          setComments((prev) => {
            const exists = prev.some((p) => p.id === c.id)
            if (exists) return prev
            return [c, ...prev]
          })
        },
      })
    })()
    return () => {
      if (unsub) unsub()
    }
  }, [id])

  const handleSubmitComment = async (e) => {
    e?.preventDefault?.()
    if (!user || !id || !commentText.trim()) return
    const text = commentText.trim()
    setCommentText('')
    const res = await addBeatComment({ beatId: id, userId: user.id, content: text })
    if (res.success && res.comment) {
      setComments((prev) => [res.comment, ...prev])
    } else {
      // restore text on failure
      setCommentText(text)
      // eslint-disable-next-line no-alert
      alert('Could not post comment. Please try again.')
    }
  }

  const suggestedNext = useMemo(() => {
    if (!beat || !allBeats?.length) return []
    const baseGenre = beat.genre
    const baseBpm = beat.bpm || 0
    return allBeats
      .filter(b => b.id !== beat.id)
      .map(b => {
        let score = getPlayCount(b.id)
        if (baseGenre && b.genre === baseGenre) score += 50
        if (baseBpm && b.bpm) {
          const diff = Math.abs((b.bpm || 0) - baseBpm)
          if (diff <= 5) score += 20
          else if (diff <= 10) score += 10
        }
        return { beat: b, score }
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 4)
      .map(row => row.beat)
  }, [beat, allBeats])

  const licensePrices = useMemo(() => {
    const fallback = {
      Basic: 29,
      Premium: 59,
      Unlimited: 149,
      Exclusive: 399,
    }
    if (!beat) return fallback
    const lp = beat.licensePrices || beat.license_prices
    if (!lp) return fallback
    return {
      Basic: lp.Basic ?? lp.basic ?? fallback.Basic,
      Premium: lp.Premium ?? lp.premium ?? fallback.Premium,
      Unlimited: lp.Unlimited ?? lp.unlimited ?? fallback.Unlimited,
      Exclusive: lp.Exclusive ?? lp.exclusive ?? fallback.Exclusive,
    }
  }, [beat])

  return (
    <section className="bg-slate-950/95">
      <div className="mx-auto max-w-6xl px-3 py-6 sm:px-4 sm:py-10">
        <div className="grid gap-10 lg:grid-cols-[420px,1fr]">
          {/* Left column (cover + meta) */}
          <div className="space-y-6">
            <BackButton />
            <div className="rounded-3xl border border-slate-800/80 bg-slate-900/80 p-4">
              <div className="relative w-full overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 via-emerald-400 to-orange-500 h-64">
                {beat?.coverUrl ? (
                  <img src={beat.coverUrl} alt={beat?.title || 'Beat Cover'} className="h-full w-full object-cover opacity-90" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-[12px] font-semibold text-slate-950/80">Cover</div>
                )}
                <button onClick={handleLike} className={`absolute right-3 top-3 h-8 w-8 flex items-center justify-center rounded-full border text-[11px] backdrop-blur-sm ${liked? 'border-pink-400/70 bg-pink-500/20 text-pink-300':'border-slate-700/70 bg-slate-900/40 text-slate-300 hover:border-pink-400/60 hover:text-pink-300'}`}>❤</button>
              </div>
                  
              <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-300">Beat #{id}</p>
              <h1 className="mt-1 font-display text-2xl font-semibold text-slate-50 leading-tight">{beat?.title || 'Beat'}</h1>
              <p className="mt-1 text-[13px] text-slate-300">by {beat?.producer || 'Producer'} • {beat?.genre || 'Genre'} • {beat?.bpm || 0} BPM</p>
              <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                <button onClick={handleFav} className={`rounded-full px-3 py-1 text-[10px] font-semibold border ${favorited ? 'border-amber-400/70 bg-amber-500/10 text-amber-300' : 'border-slate-700/70 text-slate-400 hover:border-amber-400/60 hover:text-amber-300'}`}>★ {favs}</button>
                {producerId && <button onClick={handleFollow} className={`rounded-full px-3 py-1 text-[10px] font-semibold border ${following ? 'border-emerald-400/80 bg-emerald-500/10 text-emerald-300' : 'border-slate-700/70 text-slate-400 hover:border-emerald-400/70 hover:text-emerald-300'}`}>{following ? 'Following' : 'Follow'} • {followers}</button>}
                <button onClick={()=>setReportOpen(true)} className="rounded-full px-3 py-1 text-[10px] font-semibold border border-slate-700/70 text-slate-400 hover:border-rose-400/60 hover:text-rose-300">Report</button>
              </div>
              <div className="mt-4">
                <BeatPlayer
                  src={beat?.audioUrl || null}
                  beatId={id}
                  producerId={producerId}
                />
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-100">Description</h2>
                <p className="mt-2 text-sm text-slate-300 leading-relaxed">{beat?.description && beat.description.trim().length ? beat.description : "High-quality instrumental. Add your vocals and license appropriately."}</p>
                <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-slate-300">
                  {[beat?.genre || 'Riddim', `BPM ${beat?.bpm || 0}`].map(t => <span key={t} className="rounded-full bg-slate-900/80 px-3 py-1">{t}</span>)}
                </div>
              </div>
              <div className="rounded-2xl border border-slate-800/80 bg-slate-900/80 p-4">
                <h3 className="text-xs font-semibold uppercase tracking-[0.15em] text-emerald-300">Producer</h3>
                <p className="mt-1 text-sm font-medium text-slate-200">{beat?.producer || 'Producer'}</p>
                <p className="text-[11px] text-slate-500">Original production. Contact for customs and exclusives.</p>
                {producerId && <p className="mt-2 text-[10px] text-slate-400">Followers: {followers}</p>}
                {producerId && <button onClick={handleFollow} className={`mt-3 rounded-full px-4 py-2 text-[11px] font-semibold ${following ? 'bg-emerald-500 text-slate-950' : 'border border-emerald-400/70 text-emerald-300 hover:bg-emerald-500/10'}`}>{following ? 'Following' : 'Follow Producer'}</button>}
              </div>
            </div>
          </div>
          {/* Right column licensing */}
          <aside className="space-y-6">
            <div className="rounded-3xl border border-slate-800/80 bg-slate-900/80 p-5">
              <h2 className="text-sm font-semibold text-slate-100">Licensing</h2>
              {beat?.freeDownload && (
                <div className="mt-3 rounded-xl border border-emerald-400/60 bg-emerald-500/10 p-3 flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-semibold text-emerald-300">Free Download Available</p>
                    <p className="text-[10px] text-emerald-200/80">Instant download without payment.</p>
                  </div>
                  <a href={`/checkout/${id}?mode=free`} className="rounded-full bg-emerald-500 px-3 py-1.5 text-[11px] font-semibold text-slate-950 hover:bg-emerald-400">Download Now</a>
                </div>
              )}
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <LicenseRow
                  name="Basic"
                  full="Basic MP3 License"
                  desc="MP3 file, non-exclusive, up to 50k streams."
                  price={licensePrices.Basic}
                  active={selected==='Basic'}
                  onSelect={()=>setSelected('Basic')}
                />
                <LicenseRow
                  name="Premium"
                  full="Premium WAV License"
                  desc="WAV + MP3, non-exclusive, up to 200k streams."
                  price={licensePrices.Premium}
                  active={selected==='Premium'}
                  onSelect={()=>setSelected('Premium')}
                />
                <LicenseRow
                  name="Unlimited"
                  full="Unlimited License"
                  desc="Untagged files, unlimited streams, monetization."
                  price={licensePrices.Unlimited}
                  active={selected==='Unlimited'}
                  onSelect={()=>setSelected('Unlimited')}
                />
                <LicenseRow
                  name="Exclusive"
                  full="Exclusive Rights"
                  desc="Full exclusive rights, beat removed after purchase."
                  price={licensePrices.Exclusive}
                  active={selected==='Exclusive'}
                  onSelect={()=>setSelected('Exclusive')}
                />
              </div>
              <TermsPreview selected={selected} />
              <div className="mt-4 flex flex-col gap-2">
                <button
                  disabled={!selected}
                  onClick={() => {
                    if (!selected) return
                    const licenseParam = encodeURIComponent(selected)
                    navigate(`/checkout/${id}?license=${licenseParam}`, {
                      state: {
                        beat: {
                          id,
                          title: beat?.title,
                          producer: beat?.producer,
                          userId: beat?.userId || beat?.user_id || null,
                          genre: beat?.genre,
                          bpm: beat?.bpm,
                          price: beat?.price,
                          audioUrl: beat?.audioUrl || beat?.audio_url || null,
                          untaggedUrl: beat?.untaggedUrl || beat?.untagged_url || null,
                          coverUrl: beat?.coverUrl || beat?.cover_url || null,
                          bundleUrl: beat?.bundleUrl || beat?.bundle_url || null,
                          description: beat?.description,
                          licensePrices: beat?.licensePrices || beat?.license_prices || null,
                          freeDownload: !!(beat?.freeDownload || beat?.free_download),
                        },
                      },
                    })
                  }}
                  className={`w-full rounded-full px-4 py-2 text-xs font-semibold ${selected ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400' : 'bg-slate-700/60 text-slate-400 cursor-not-allowed'}`}
                >
                  {selected
                    ? `Buy Now - $${selected==='Basic'
                      ? licensePrices.Basic
                      : selected==='Premium'
                      ? licensePrices.Premium
                      : selected==='Unlimited'
                      ? licensePrices.Unlimited
                      : licensePrices.Exclusive}`
                    : 'Select a License'}
                </button>
                <button disabled={!selected} onClick={handleAddToCart} className={`w-full rounded-full px-4 py-2 text-xs font-semibold ${selected ? 'bg-slate-800 text-slate-200 hover:bg-slate-700' : 'bg-slate-700/60 text-slate-400 cursor-not-allowed'}`}>Add to Cart</button>
              </div>
              <p className="mt-3 text-[11px] text-slate-500 leading-relaxed">Instant delivery of files & license PDF after payment. Taxes may apply.</p>
            </div>
            <div className="rounded-3xl border border-slate-800/80 bg-slate-900/80 p-5">
              <h2 className="text-sm font-semibold text-slate-100">Usage Terms</h2>
              <p className="mt-2 text-[11px] text-slate-400">Key term summary for selected license.</p>
              <div className="mt-4 grid grid-cols-2 gap-3 text-[10px] text-slate-300 md:grid-cols-3">
                <div className="flex items-center gap-2"><span className="text-emerald-300">🎙</span> Music Recording</div>
                <div className="flex items-center gap-2"><span className="text-emerald-300">📤</span> Distribution</div>
                <div className="flex items-center gap-2"><span className="text-emerald-300">🌐</span> Online Streams</div>
                <div className="flex items-center gap-2"><span className="text-emerald-300">🎬</span> Music Video</div>
                <div className="flex items-center gap-2"><span className="text-emerald-300">🎟</span> Live Performances</div>
                <div className="flex items-center gap-2"><span className="text-emerald-300">📻</span> Broadcasting</div>
              </div>
            </div>
          </aside>
        </div>
      </div>
      <ReportModal open={reportOpen} onClose={()=>setReportOpen(false)} targetId={id} type="beat" />
      {/* Global comments section (mobile-friendly fallback) */}
      <div className="mx-auto mt-6 max-w-6xl px-3 pb-8 sm:px-4">
        <div className="rounded-3xl border border-slate-800/80 bg-slate-900/80 p-5">
          <h2 className="text-sm font-semibold text-slate-100">Comments</h2>
          <p className="mt-2 text-[11px] text-slate-400">
            Share feedback or ask a question about this beat.
          </p>
          <form
            onSubmit={handleSubmitComment}
            className="mt-3 flex items-center gap-2 rounded-full border border-slate-700/70 bg-slate-950/70 px-3 py-1.5"
          >
            <button
              type="button"
              onClick={() => setEmojiPickerOpen((o) => !o)}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-800 text-base leading-none text-slate-200 hover:bg-slate-700"
            >
              😊
            </button>
            <input
              type="text"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder={user ? 'Add a comment…' : 'Log in to comment on this beat'}
              disabled={!user}
              className="flex-1 bg-transparent text-[12px] text-slate-100 placeholder:text-slate-500 outline-none"
            />
            <button
              type="submit"
              disabled={!user || !commentText.trim()}
              className="rounded-full bg-rb-trop-sunrise px-3 py-1 text-[11px] font-semibold text-slate-950 shadow-rb-gloss-btn disabled:opacity-40"
            >
              Post
            </button>
          </form>
          {emojiPickerOpen && (
            <div className="mt-2 grid grid-cols-8 gap-1 rounded-2xl border border-slate-700/70 bg-slate-950/95 p-2 text-lg">
              {['🔥','💯','🎧','🎶','👌','🙏','😎','😍','🥶','🤯','🧡','💥','⭐','👏','🤑','🕺'].map((emo) => (
                <button
                  key={emo}
                  type="button"
                  onClick={() => {
                    setCommentText((t) => `${t}${emo}`)
                  }}
                  className="flex items-center justify-center rounded-full px-1 py-1 hover:bg-slate-800"
                >
                  {emo}
                </button>
              ))}
            </div>
          )}
          <div className="mt-4 space-y-3 max-h-64 overflow-y-auto">
            {comments.map((c) => (
              <div
                key={c.id}
                className="rounded-2xl border border-slate-800/80 bg-slate-950/80 p-3 text-[11px] text-slate-200"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-slate-100">
                    {c.displayName || 'User'}
                  </p>
                  <p className="text-[10px] text-slate-500">
                    {c.createdAt
                      ? new Date(c.createdAt).toLocaleDateString()
                      : ''}
                  </p>
                </div>
                <p className="mt-1 text-[11px] text-slate-300 whitespace-pre-wrap">
                  {c.content}
                </p>
              </div>
            ))}
            {comments.length === 0 && (
              <p className="text-[11px] text-slate-500">
                No comments yet. Be the first to share your thoughts.
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

function LicenseRow({ name, full, desc, price, active, onSelect }) {
  const [show, setShow] = useState(false)
  const terms = (LICENSE_TERMS[name] && LICENSE_TERMS[name].length) ? LICENSE_TERMS[name] : DEFAULT_TERMS
  const snippet = terms.slice(0,2)
  return (
    <div className={`w-full rounded-xl border p-3 transition ${active ? 'border-emerald-400/80 bg-emerald-500/10 shadow-lg shadow-emerald-500/10' : 'border-slate-800/80 bg-slate-950/80 hover:border-emerald-400/50'}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1">
          <p className={`text-xs font-semibold ${active ? 'text-emerald-300' : 'text-slate-100'}`}>{full}</p>
          <p className={`mt-0.5 text-[11px] ${active ? 'text-emerald-200/80' : 'text-slate-400'}`}>{desc}</p>
          {show && (
            <ul className="mt-1 space-y-0.5">
              {snippet.map((t,i)=>(<li key={i} className="text-[10px] text-slate-500">• {t}</li>))}
              {terms.length>2 && <li className="text-[10px] text-slate-500">…more in full terms</li>}
            </ul>
          )}
          <button type="button" onClick={()=>setShow(s=>!s)} className="mt-1 text-[10px] font-medium text-emerald-300 hover:text-emerald-200">{show ? 'Hide Terms' : 'View Terms'}</button>
        </div>
        <div className="text-right flex flex-col items-end gap-1">
          <p className={`text-xs font-semibold ${active ? 'text-emerald-300' : 'text-emerald-400'}`}>${price}</p>
          <button type="button" onClick={onSelect} className={`rounded-full px-3 py-0.5 text-[10px] font-semibold ${active ? 'bg-emerald-500 text-slate-950' : 'border border-emerald-400/70 text-emerald-300 hover:bg-emerald-500/10'}`}>{active ? 'Selected' : 'Select'}</button>
        </div>
      </div>
    </div>
  )
}

function TermsPreview({ selected }) {
  const [open, setOpen] = useState(true)
  if (!selected) return null
  const terms = (LICENSE_TERMS[selected] && LICENSE_TERMS[selected].length) ? LICENSE_TERMS[selected] : DEFAULT_TERMS
  return (
    <div className="mt-4 rounded-xl border border-slate-800/70 bg-slate-950/80 p-3">
      <button type="button" onClick={()=>setOpen(o=>!o)} className="flex w-full items-center justify-between text-left">
        <span className="text-xs font-semibold text-slate-100">{selected} License Terms</span>
        <span className="text-[10px] text-emerald-300">{open ? 'Hide' : 'Show'}</span>
      </button>
      {open && (
        <ul className="mt-2 space-y-1">
          {terms.map((t,i)=>(
            <li key={i} className="text-[11px] text-slate-400 leading-snug">• {t}</li>
          ))}
        </ul>
      )}
      <p className="mt-2 text-[10px] text-slate-500">License PDF will include these terms.</p>
    </div>
  )
}

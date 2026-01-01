import { useEffect, useState } from 'react'
import FilePickerButton from '../components/FilePickerButton'
import BackButton from '../components/BackButton'
import { createBeat, countBeatsForUser } from '../services/beatsRepository'
import ShareBeatModal from '../components/ShareBeatModal'
import { useNavigate } from 'react-router-dom'
import { uploadArtwork, uploadBundle, uploadAudio, uploadBeatWithMetadata } from '../services/storageService'
import useUserPlan from '../hooks/useUserPlan'
import { BeatCard } from '../components/BeatCard'
import { listProducerLicenses, setBeatLicenses } from '../services/licenseService'

const GENRES = [
  'Dancehall',
  'Trap Dancehall',
  'Reggae',
  'Afrobeat',
  'Soca',
  'Trap',
  'Hip Hop',
  'Drill',
]

export function UploadBeat() {
  const [title, setTitle] = useState('')
  const [genre, setGenre] = useState(GENRES[0])
  const [bpm, setBpm] = useState('')
  const [price, setPrice] = useState('')
  const [description, setDescription] = useState('')
  const [basicPrice, setBasicPrice] = useState(29)
  const [premiumPrice, setPremiumPrice] = useState(59)
  const [unlimitedPrice, setUnlimitedPrice] = useState(149)
  const [exclusivePrice, setExclusivePrice] = useState(399)
  const [audioFile, setAudioFile] = useState(null)
  const [untaggedFile, setUntaggedFile] = useState(null)
  const [artworkFile, setArtworkFile] = useState(null)
  const [bundleFile, setBundleFile] = useState(null)
  const [audioProgress, setAudioProgress] = useState(0)
  const [untaggedProgress, setUntaggedProgress] = useState(0)
  const [artworkProgress, setArtworkProgress] = useState(0)
  const [bundleProgress, setBundleProgress] = useState(0)
  const [artworkUrl, setArtworkUrl] = useState(null)
  const [audioUrlRemote, setAudioUrlRemote] = useState(null)
  const [untaggedUrl, setUntaggedUrl] = useState(null)
  const [bundleUrl, setBundleUrl] = useState(null)
  const [producerName, setProducerName] = useState('')
  const [collaborators, setCollaborators] = useState([])
  const addCollaborator = () => setCollaborators(prev => [...prev, { userId: '', email: '', role: '', split: 0 }])
  const updateCollaborator = (index, field, value) => {
    const copy = [...collaborators]
    copy[index][field] = value
    setCollaborators(copy)
  }
  const removeCollaborator = (index) => setCollaborators(prev => prev.filter((_, i) => i !== index))
  const totalSplit = collaborators.reduce((sum, c) => sum + Number(c.split || 0), 0)
  const isValidSplit = Math.round(totalSplit) === 100 || collaborators.length === 0
  const [musicalKey, setMusicalKey] = useState('')
  const [uploadingBeat, setUploadingBeat] = useState(false)
  const [error, setError] = useState('')
  const [shareBeat, setShareBeat] = useState(null)
  const [freeDownload, setFreeDownload] = useState(false)
  const [artworkPreviewUrl, setArtworkPreviewUrl] = useState(null)
  const [audioPreviewUrl, setAudioPreviewUrl] = useState(null)
  const [userBeatsCount, setUserBeatsCount] = useState(0)
  const [producerLicenses, setProducerLicenses] = useState([])
  const [selectedLicenseIds, setSelectedLicenseIds] = useState([])

  // cancellation tokens
  const [artworkToken, setArtworkToken] = useState(null)
  const [audioToken, setAudioToken] = useState(null)
  const [untaggedToken, setUntaggedToken] = useState(null)
  const [bundleToken, setBundleToken] = useState(null)
  const navigate = useNavigate()
  const { plan, user, loading } = useUserPlan()

  useEffect(() => {
    if (!producerName && user) {
      const derived =
        user.user_metadata?.display_name ||
        user.email?.split('@')[0] ||
        'Producer'
      setProducerName(derived)
    }
  }, [user, producerName])

  useEffect(() => {
    let active = true

    async function loadUserBeatCount() {
      if (!user?.id) {
        if (active) setUserBeatsCount(0)
        return
      }
      const count = await countBeatsForUser(user.id)
      if (active) setUserBeatsCount(count || 0)
    }

    loadUserBeatCount()

    return () => {
      active = false
    }
  }, [user?.id])

  // Load producer license templates for selection
  useEffect(() => {
    let active = true
    ;(async () => {
      if (!user?.id) {
        if (active) {
          setProducerLicenses([])
          setSelectedLicenseIds([])
        }
        return
      }
      const rows = await listProducerLicenses(user.id)
      if (!active) return
      setProducerLicenses(rows)
      setSelectedLicenseIds(rows.map((l) => l.id))
    })()
    return () => {
      active = false
    }
  }, [user?.id])

  function startSimulatedUpload(file, setProgress, setUrl, doUpload, setToken) {
    if (!file) return
    setProgress(0)
    const token = { cancelled: false }
    setToken(token)
    let pct = 0
    const step = async () => {
      if (token.cancelled) return
      pct += Math.random()*18 + 7
      if (pct >= 85) {
        try {
          const { publicUrl } = await doUpload(file)
          if (token.cancelled) return
          setUrl(publicUrl)
          setProgress(100)
        } catch (err) {
          console.error('[Upload] error', err)
          setError(err.message || 'Upload failed')
          setProgress(0)
        }
        return
      }
      setProgress(Math.min(85, Math.round(pct)))
      setTimeout(step, 180)
    }
    setTimeout(step, 140)
  }

  function cancelUpload(setToken, setProgress, clearFile, setUrl) {
    setToken(prev => prev && (prev.cancelled = true))
    setProgress(0)
    clearFile(null)
    if (setUrl) setUrl(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!audioFile) {
      setError('Please upload a preview audio file for your beat.')
      return
    }
    if (!selectedLicenseIds.length) {
      setError('Select at least one license to offer for this beat. Manage licenses from your Licenses dashboard.')
      return
    }
    setUploadingBeat(true)

    if (!isValidSplit) {
      setError('Collaborator split percentages must total 100%.')
      setUploadingBeat(false)
      return
    }
    const collaboratorString = collaborators
      .map((c) => c.email || c.userId || '')
      .filter(Boolean)
      .join(', ')

    // 1) Upload audio + metadata via backend /beats/upload-beat (S3 + Supabase)
    let createdBeat = null
    let supabaseAudioUrl = null
    try {
      const { beat, audioUrl } = await uploadBeatWithMetadata({
        file: audioFile,
        userId: user?.id || null,
        title,
        genre,
        bpm: Number(bpm),
        description,
        price: Number(price),
        producerName: producerName || null,
        collaborator: collaboratorString || null,
        musicalKey: musicalKey || null,
        freeDownload,
      })
      createdBeat = beat
      supabaseAudioUrl = audioUrl
      setAudioUrlRemote(audioUrl || null)
    } catch (err) {
      console.error('[UploadBeat] backend upload failed', err)
      setUploadingBeat(false)
      setError(err.message || 'Failed to upload beat audio.')
      return
    }

    // Local preview URLs for immediate UX
    const localAudioUrl =
      supabaseAudioUrl ||
      audioPreviewUrl ||
      (audioFile ? URL.createObjectURL(audioFile) : null)
    const localUntaggedUrl = untaggedUrl || (untaggedFile ? URL.createObjectURL(untaggedFile) : null)
    const localCoverUrl = artworkUrl || (artworkFile ? URL.createObjectURL(artworkFile) : null)
    const localBundleUrl = bundleUrl || null
    // Supabase should only store stable remote URLs (from S3), never blob: URLs
    const supabaseUntaggedUrl = untaggedUrl || null
    const supabaseCoverUrl = artworkUrl || null
    const supabaseBundleUrl = bundleUrl || null
    const attachedLicenses = producerLicenses.filter((l) =>
      selectedLicenseIds.includes(l.id),
    )
    const licensePrices = attachedLicenses.length
      ? attachedLicenses.reduce((acc, lic) => {
          const key = lic.name
          if (!key) return acc
          return { ...acc, [key]: Number(lic.price || 0) }
        }, {})
      : {
          Basic: basicPrice,
          Premium: premiumPrice,
          Unlimited: unlimitedPrice,
          Exclusive: exclusivePrice,
        }

    // 3) Optionally patch Supabase row with extra URLs (untagged / artwork / bundle)
    try {
        if (createdBeat?.id) {
          await createBeat({
            id: createdBeat.id,
            title: createdBeat.title,
            description: createdBeat.description,
            genre: createdBeat.genre,
            bpm: createdBeat.bpm,
            price: createdBeat.price,
            producer: producerName,
            collaborator: collaboratorString || createdBeat.collaborator || null,
            musical_key: musicalKey || createdBeat.musical_key || null,
            user_id: createdBeat.user_id,
            audio_url: createdBeat.audio_url,
            untagged_url: supabaseUntaggedUrl,
            cover_url: supabaseCoverUrl,
      bundle_url: supabaseBundleUrl,
      bundle_name: bundleFile?.name || createdBeat.bundle_name || null,
      license_prices: createdBeat.license_prices || licensePrices,
      free_download: createdBeat.free_download ?? freeDownload,
        })
      }
    } catch (err) {
      console.warn('[UploadBeat] optional Supabase patch failed', err)
    }

    // 4) Persist collaborators via backend
    try {
      if (createdBeat?.id && collaborators.length > 0) {
        const base = import.meta.env.VITE_API_BASE_URL || 'https://riddimbase-backend.onrender.com'
        await fetch(`${base}/collab/set`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            beat_id: createdBeat.id,
            collaborators: collaborators.map(c => ({ user_id: c.userId || null, email: c.email || null, role: c.role || null, split_percentage: Number(c.split || 0) }))
          })
        })
      }
    } catch (e) {
      console.warn('[UploadBeat] collaborator save failed', e)
    }

    // Attach selected licenses to beat
    try {
      if (createdBeat?.id && selectedLicenseIds.length) {
        await setBeatLicenses(createdBeat.id, selectedLicenseIds)
      }
    } catch (e) {
      console.warn('[UploadBeat] setBeatLicenses failed', e)
    }

    setUploadingBeat(false)
    if (createdBeat?.id) {
      setShareBeat({ id: createdBeat.id, title })
    } else {
      navigate('/producer/dashboard')
    }
  }

  const remainingFree = Math.max(0, 5 - userBeatsCount)
  const limitReached = plan === 'free' && userBeatsCount >= 5

  return (
    <section className="bg-slate-950/95">
      <div className="mx-auto max-w-6xl px-3 py-6 sm:px-4 sm:py-10">
        <div className="flex items-center gap-3">
          <BackButton />
          <h1 className="font-display text-2xl font-semibold text-slate-50">Upload Beat</h1>
        </div>
        <p className="mt-1 text-sm text-slate-300">Provide metadata, files & pricing. Preview updates live.</p>
        {!loading && plan === 'free' && !limitReached && (
          <div className="mt-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-[11px] text-emerald-300">
            Free plan: {remainingFree} of 5 complimentary uploads left.
          </div>
        )}
        {!loading && limitReached && (
          <div className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-[11px] text-rose-300">
            Limit reached (5 uploads). Upgrade for unlimited catalog growth.
            <div className="mt-3 flex gap-2">
              <button onClick={()=>navigate('/pricing')} className="rounded-full bg-emerald-500 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-emerald-400 transition">View Plans</button>
            </div>
          </div>
        )}
        {!limitReached && (
          <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr,0.9fr]">
            {/* Left: form steps */}
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Step 1: Metadata */}
                <div className="rounded-3xl border border-slate-800/80 bg-slate-900/80 p-6 space-y-5">
                  <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-2">Metadata <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] text-slate-300">Step 1</span></h2>
                  <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-300">Title</label>
                    <input value={title} onChange={e=>setTitle(e.target.value)} required className="mt-1 w-full rounded-xl border border-slate-700/70 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 focus:border-emerald-400/70 focus:outline-none" placeholder="e.g. Midnight Rain (TrapHall)" />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-300">Producer name</label>
                    <input
                      value={producerName}
                      onChange={e => setProducerName(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-700/70 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 focus:border-emerald-400/70 focus:outline-none"
                      placeholder="e.g. DJ IslandWave"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-300">Genre</label>
                    <select value={genre} onChange={e=>setGenre(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-700/70 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 focus:border-emerald-400/70 focus:outline-none">
                      {GENRES.map(g=> <option key={g}>{g}</option>)}
                    </select>
                  </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-300">BPM</label>
                      <input type="number" value={bpm} onChange={e=>setBpm(e.target.value)} required className="mt-1 w-full rounded-xl border border-slate-700/70 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 focus:border-emerald-400/70 focus:outline-none" placeholder="140" />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-300">Key (optional)</label>
                      <input
                        value={musicalKey}
                        onChange={(e) => setMusicalKey(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-slate-700/70 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 focus:border-emerald-400/70 focus:outline-none"
                        placeholder="e.g. F#m"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-300">Base Price (USD)</label>
                      <input type="number" value={price} onChange={e=>setPrice(e.target.value)} required className="mt-1 w-full rounded-xl border border-slate-700/70 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 focus:border-emerald-400/70 focus:outline-none" placeholder="29" />
                    </div>
                  </div>
                <div className="mt-3">
                  <label className="text-[11px] font-semibold text-slate-300 flex items-center justify-between">
                    Description <span className="text-[10px] font-normal text-slate-500">(optional)</span>
                  </label>
                    <textarea
                      value={description}
                      onChange={e=>setDescription(e.target.value)}
                      rows={3}
                      className="mt-1 w-full rounded-xl border border-slate-700/70 bg-slate-950/70 px-3 py-2 text-[12px] text-slate-100 placeholder:text-slate-500 focus:border-emerald-400/70 focus:outline-none"
                      placeholder="Describe the mood, instruments, key artists it fits, and any licensing notes."
                    />
                  </div>
                  <div className="mt-3">
                    <label className="text-[11px] font-semibold text-slate-300 flex items-center justify-between">
                      Collaborators <span className="text-[10px] font-normal text-slate-500">(optional)</span>
                    </label>
                    <div className="mt-2 space-y-2">
                      {collaborators.map((c, index) => (
                        <div key={index} className="grid grid-cols-1 gap-2 sm:grid-cols-4">
                          <input
                            value={c.email}
                            onChange={(e) => updateCollaborator(index, 'email', e.target.value)}
                            className="rounded-xl border border-slate-700/70 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 focus:border-emerald-400/70 focus:outline-none"
                            placeholder="Email (for non‑user collaborator)"
                          />
                          <input
                            value={c.userId}
                            onChange={(e) => updateCollaborator(index, 'userId', e.target.value)}
                            className="rounded-xl border border-slate-700/70 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 focus:border-emerald-400/70 focus:outline-none"
                            placeholder="User ID (optional)"
                          />
                          <input
                            value={c.role}
                            onChange={(e) => updateCollaborator(index, 'role', e.target.value)}
                            className="rounded-xl border border-slate-700/70 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 focus:border-emerald-400/70 focus:outline-none"
                            placeholder="Role (producer/engineer)"
                          />
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              value={c.split}
                              onChange={(e) => updateCollaborator(index, 'split', Number(e.target.value) || 0)}
                              className="flex-1 rounded-xl border border-slate-700/70 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 focus:border-emerald-400/70 focus:outline-none"
                              placeholder="Split %"
                            />
                            <button
                              type="button"
                              onClick={() => removeCollaborator(index)}
                              className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-700/70 bg-slate-900/80 text-xs font-semibold text-slate-300 hover:border-rose-400/70 hover:text-rose-300"
                              aria-label="Remove collaborator"
                            >
                              ×
                            </button>
                          </div>
                        </div>
                      ))}
                      <div className="flex items-center justify-between">
                        <button type="button" onClick={addCollaborator} className="rb-btn-outline">Add Collaborator</button>
                        {collaborators.length > 0 && (
                          <p className={`text-[11px] ${isValidSplit ? 'text-emerald-300' : 'text-rose-300'}`}>Total split: {totalSplit}% {isValidSplit ? '' : '(must equal 100%)'}</p>
                        )}
                      </div>
                    </div>
                  </div>
                <p className="text-[10px] text-slate-500">Choose a clear, searchable title, add a helpful description, and set an accurate genre for better discovery.</p>
              </div>
              {/* Step 2: Files */}
              <div className="rounded-3xl border border-slate-800/80 bg-slate-900/80 p-6 space-y-6">
                <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-2">Assets <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] text-slate-300">Step 2</span></h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <FilePickerButton
                      label="Artwork (JPG/PNG/WebP)"
                      accept="image/*"
                      onSelect={(f)=>{ setArtworkFile(f); if (f) startSimulatedUpload(f, setArtworkProgress, setArtworkUrl, uploadArtwork, setArtworkToken) }}
                      onCancel={()=>cancelUpload(setArtworkToken, setArtworkProgress, setArtworkFile, setArtworkUrl)}
                      progress={artworkProgress}
                      file={artworkFile}
                    />
                    {artworkUrl && artworkProgress === 100 && (
                      <img src={artworkUrl} alt="preview" className="mt-3 h-24 w-24 rounded-xl object-cover ring-1 ring-emerald-500/40" />
                    )}
                  </div>
                  <div>
                    <FilePickerButton
                      label="Tagged Preview (MP3/WAV)"
                      accept="audio/mpeg,audio/wav"
                      onSelect={(f)=>{ setAudioFile(f); if (f) startSimulatedUpload(f, setAudioProgress, setAudioUrlRemote, uploadAudio, setAudioToken) }}
                      onCancel={()=>cancelUpload(setAudioToken, setAudioProgress, setAudioFile, setAudioUrlRemote)}
                      progress={audioProgress}
                      file={audioFile}
                    />
                    {audioProgress>0 && audioProgress<100 && <p className="mt-2 text-[10px] text-slate-500">Uploading audio… {audioProgress}%</p>}
                  </div>
                  <div>
                    <FilePickerButton
                      label="Beat Bundle (ZIP/RAR)"
                      accept=".zip,.rar,application/zip,application/x-rar-compressed"
                      onSelect={(f)=>{ setBundleFile(f); if (f) startSimulatedUpload(f, setBundleProgress, setBundleUrl, uploadBundle, setBundleToken) }}
                      onCancel={()=>cancelUpload(setBundleToken, setBundleProgress, setBundleFile, setBundleUrl)}
                      progress={bundleProgress}
                      file={bundleFile}
                    />
                    {bundleProgress>0 && bundleProgress<100 && <p className="mt-2 text-[10px] text-slate-500">Uploading bundle… {bundleProgress}%</p>}
                  </div>
                </div>
              </div>
              {/* Step 3: Licensing */}
              <div className="rounded-3xl border border-slate-800/80 bg-slate-900/80 p-6 space-y-5">
                <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                  Pricing & Licenses
                  <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] text-slate-300">Step 3</span>
                </h2>
                <div className="rounded-xl border border-slate-800/70 bg-slate-950/70 p-3 flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-semibold text-slate-200">Enable Free Download</p>
                    <p className="text-[10px] text-slate-500">
                      Shows a download icon and allows instant, free checkout.
                    </p>
                  </div>
                  <label className="inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={freeDownload}
                      onChange={(e) => setFreeDownload(e.target.checked)}
                    />
                    <span
                      className={`relative inline-block h-5 w-9 rounded-full transition ${
                        freeDownload ? 'bg-emerald-500' : 'bg-slate-600'
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition ${
                          freeDownload ? 'right-0.5' : 'left-0.5'
                        }`}
                      />
                    </span>
                  </label>
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-slate-300">License tier pricing</p>
                  <p className="mt-1 text-[10px] text-slate-500">
                    Set suggested prices for each license. Basic is typically your starting price, with higher tiers
                    offering more rights.
                  </p>
                  <div className="mt-3 grid gap-3 md:grid-cols-4 text-[11px]">
                    <div className="rounded-xl border border-slate-800/70 bg-slate-950/70 p-3 flex flex-col gap-1">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-400">Basic</p>
                      <input
                        type="number"
                        value={basicPrice}
                        onChange={(e) => setBasicPrice(Number(e.target.value) || 0)}
                        className="mt-1 w-full rounded-lg border border-slate-700/70 bg-slate-900/70 px-2 py-1.5 text-sm text-slate-100 focus:border-emerald-400/70 focus:outline-none"
                      />
                      <p className="text-[10px] text-slate-500">MP3 · entry license</p>
                    </div>
                    <div className="rounded-xl border border-slate-800/70 bg-slate-950/70 p-3 flex flex-col gap-1">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-400">Premium</p>
                      <input
                        type="number"
                        value={premiumPrice}
                        onChange={(e) => setPremiumPrice(Number(e.target.value) || 0)}
                        className="mt-1 w-full rounded-lg border border-slate-700/70 bg-slate-900/70 px-2 py-1.5 text-sm text-slate-100 focus:border-emerald-400/70 focus:outline-none"
                      />
                      <p className="text-[10px] text-slate-500">MP3 + WAV · mid tier</p>
                    </div>
                    <div className="rounded-xl border border-slate-800/70 bg-slate-950/70 p-3 flex flex-col gap-1">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-400">Unlimited</p>
                      <input
                        type="number"
                        value={unlimitedPrice}
                        onChange={(e) => setUnlimitedPrice(Number(e.target.value) || 0)}
                        className="mt-1 w-full rounded-lg border border-slate-700/70 bg-slate-900/70 px-2 py-1.5 text-sm text-slate-100 focus:border-emerald-400/70 focus:outline-none"
                      />
                      <p className="text-[10px] text-slate-500">MP3 + WAV + stems</p>
                    </div>
                    <div className="rounded-xl border border-slate-800/70 bg-slate-950/70 p-3 flex flex-col gap-1">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-400">Exclusive</p>
                      <input
                        type="number"
                        value={exclusivePrice}
                        onChange={(e) => setExclusivePrice(Number(e.target.value) || 0)}
                        className="mt-1 w-full rounded-lg border border-slate-700/70 bg-slate-900/70 px-2 py-1.5 text-sm text-slate-100 focus:border-emerald-400/70 focus:outline-none"
                      />
                      <p className="text-[10px] text-slate-500">Full rights · one buyer</p>
                    </div>
                  </div>
                </div>
                <div className="mt-5 rounded-2xl border border-slate-800/80 bg-slate-950/80 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                        License selection
                      </p>
                      <p className="mt-1 text-[11px] text-slate-400">
                        Choose which of your license templates apply to this beat.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => navigate('/producer/licenses')}
                      className="rounded-full border border-slate-700/80 px-3 py-1 text-[10px] font-semibold text-slate-200 hover:border-emerald-400/70 hover:text-emerald-200"
                    >
                      Manage Licenses
                    </button>
                  </div>
                  {producerLicenses.length === 0 ? (
                    <p className="mt-3 text-[11px] text-slate-500">
                      You have no license templates yet. Create them from the
                      Licenses page in your producer dashboard.
                    </p>
                  ) : (
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      {producerLicenses.map((lic) => {
                        const active = selectedLicenseIds.includes(lic.id)
                        return (
                          <button
                            key={lic.id}
                            type="button"
                            onClick={() => {
                              setSelectedLicenseIds((prev) =>
                                prev.includes(lic.id)
                                  ? prev.filter((id) => id !== lic.id)
                                  : [...prev, lic.id],
                              )
                            }}
                            className={`flex items-center justify-between rounded-xl border px-3 py-2 text-left text-[11px] transition ${
                              active
                                ? 'border-emerald-400/80 bg-emerald-500/10 text-emerald-100'
                                : 'border-slate-800/80 bg-slate-950/80 text-slate-200 hover:border-emerald-400/60'
                            }`}
                          >
                            <div>
                              <p className="text-[11px] font-semibold">
                                {lic.name}
                              </p>
                              <p className="mt-0.5 text-[10px] text-slate-400">
                                ${Number(lic.price || 0).toFixed(2)}
                                {lic.is_exclusive && ' • Exclusive'}
                              </p>
                            </div>
                            <span className="text-[10px] font-semibold">
                              {active ? 'Selected' : 'Select'}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  )}
                  <p className="mt-2 text-[10px] text-slate-500">
                    Buyers will see one card per selected license on the beat
                    details page.
                  </p>
                </div>
                {error && <p className="text-xs text-red-400">{error}</p>}
                <button type="submit" className="mt-2 rounded-full bg-emerald-500 px-6 py-2 text-xs font-semibold text-slate-950 hover:bg-emerald-400 transition disabled:opacity-60" disabled={limitReached || uploadingBeat || (audioProgress>0 && audioProgress<100) || (artworkProgress>0 && artworkProgress<100) || (bundleProgress>0 && bundleProgress<100)}>{uploadingBeat ? 'Saving…' : 'Publish Beat'}</button>
              </div>
            </form>
            {/* Right: Live Preview & Tips */}
            <div className="space-y-6">
              <div className="rounded-3xl border border-slate-800/80 bg-slate-900/80 p-6">
                <h2 className="text-sm font-semibold text-slate-100 mb-4">Live Preview</h2>
                <BeatCard
                  id={999999}
                  title={title || 'Untitled Beat'}
                  producer={producerName || user?.email || 'You'}
                  userId={user?.id || null}
                  genre={genre}
                  bpm={bpm || 0}
                  price={Number(price) || basicPrice}
                  coverUrl={artworkUrl || null}
                  audioUrl={audioUrlRemote || null}
                  freeDownload={freeDownload}
                  initialLikes={0}
                  initialFavs={0}
                  initialFollowers={0}
                  noLink
                  square
                />
                <p className="mt-3 text-[10px] text-slate-500">Preview simulates marketplace appearance. Actions are disabled for unpublished content.</p>
              </div>
              <div className="rounded-3xl border border-slate-800/80 bg-slate-900/80 p-6 space-y-3">
                <h2 className="text-sm font-semibold text-slate-100">Optimization Tips</h2>
                <ul className="space-y-1 text-[11px] text-slate-400">
                  <li>• Use high-quality artwork (square, 800×800).</li>
                  <li>• Include BPM & mood words in title.</li>
                  <li>• Keep preview under 2 minutes & properly tagged.</li>
                  <li>• Set fair incremental license pricing.</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
      <ShareBeatModal beat={shareBeat} onClose={() => { setShareBeat(null); navigate('/producer/dashboard') }} />
    </section>
  )
}

// Legacy LicenseBox removed – pricing now uses per-tier editable fields.

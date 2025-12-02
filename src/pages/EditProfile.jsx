import { useState, useRef, useEffect } from 'react'
import BackButton from '../components/BackButton'
import useUserProfile from '../hooks/useUserProfile'
import { uploadAvatar } from '../services/storageService'
import countries from '../constants/countries'
import { supabase } from '../lib/supabaseClient'

const ACCOUNT_TYPES = [
  { value: 'producer', label: 'Producer' },
  { value: 'artist', label: 'Artist' },
  { value: 'hybrid', label: 'Producer + Artist' },
]

export function EditProfile() {
  const { profile, updateProfile, loading, user, saving } = useUserProfile()
  const initialDisplay = profile?.displayName || ''
  const existingRoles = (profile?.accountType || 'producer').split('+')
  const [displayName, setDisplayName] = useState(initialDisplay)
  const ROLE_OPTIONS = ['mix-master engineer', 'producer', 'beat maker', 'artist']
  const [selectedRoles, setSelectedRoles] = useState(existingRoles)
  const [avatarFile, setAvatarFile] = useState(null)
  const fileRef = useRef(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [savedStamp, setSavedStamp] = useState(0)
  // New extended profile fields
  const [email, setEmail] = useState(user?.email || '')
  const [country, setCountry] = useState(profile?.country || '')
  const [phone, setPhone] = useState(profile?.phone || '')
  const [bio, setBio] = useState(profile?.bio || '')
  const [website, setWebsite] = useState(profile?.website || '')
  const [instagram, setInstagram] = useState(profile?.instagram || '')
  const [twitterX, setTwitterX] = useState(profile?.twitterX || '')
  const [youtube, setYoutube] = useState(profile?.youtube || '')
  const [savingYoutube, setSavingYoutube] = useState(false)
  const [authMessage, setAuthMessage] = useState('')
  const [authError, setAuthError] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [genres, setGenres] = useState([])
  const GENRE_OPTIONS = ['Hip-Hop','Trap','RnB','Afrobeat','Dancehall','Reggae','EDM','Pop','Drill','Funk','Jazz']
  // Cropper state
  const [showCropper, setShowCropper] = useState(false)
  const [rawImage, setRawImage] = useState(null)
  const [zoom, setZoom] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const dragRef = useRef(null)
  const lastPosRef = useRef(null)

  const handleAvatar = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const img = new Image()
    img.onload = () => {
      setRawImage(img)
      setZoom(1)
      setOffset({ x: 0, y: 0 })
      setShowCropper(true)
    }
    img.src = URL.createObjectURL(file)
  }

  const beginDrag = (e) => {
    e.preventDefault()
    lastPosRef.current = { x: e.clientX, y: e.clientY }
    document.addEventListener('mousemove', onDrag)
    document.addEventListener('mouseup', endDrag)
  }
  const onDrag = (e) => {
    if (!lastPosRef.current) return
    const dx = e.clientX - lastPosRef.current.x
    const dy = e.clientY - lastPosRef.current.y
    lastPosRef.current = { x: e.clientX, y: e.clientY }
    setOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }))
  }
  const endDrag = () => {
    document.removeEventListener('mousemove', onDrag)
    document.removeEventListener('mouseup', endDrag)
    lastPosRef.current = null
  }
  useEffect(() => () => endDrag(), [])

  const finalizeCrop = () => {
    if (!rawImage) return
    const SIZE = 300
    const canvas = document.createElement('canvas')
    canvas.width = SIZE
    canvas.height = SIZE
    const ctx = canvas.getContext('2d')
    const displayW = rawImage.width * zoom
    const displayH = rawImage.height * zoom
    const drawX = offset.x + SIZE/2 - displayW/2
    const drawY = offset.y + SIZE/2 - displayH/2
    ctx.drawImage(rawImage, drawX, drawY, displayW, displayH)
    canvas.toBlob(blob => {
      if (!blob) return
      const croppedFile = new File([blob], 'avatar-cropped.png', { type: 'image/png' })
      setAvatarFile(croppedFile)
      setShowCropper(false)
    }, 'image/png')
  }

  const doUploadAvatar = async () => {
    if (!avatarFile) return
    try {
      setUploading(true)
      const { publicUrl } = await uploadAvatar(avatarFile)
      updateProfile({ avatarUrl: publicUrl })
    } catch (err) {
      setError(err.message || 'Avatar upload failed')
    } finally {
      setUploading(false)
    }
  }

  const toggleRole = (role) => {
    setSelectedRoles(prev => prev.includes(role) ? prev.filter(r=>r!==role) : [...prev, role])
  }

  // Load extended profile: prefer Supabase profile, fall back to legacy localStorage
  useEffect(() => {
    if (!user) return

    if (profile) {
      // Keep display name in sync with the stored profile so it always
      // shows the current username when you open this page.
      setDisplayName(
        profile.displayName ||
          profile.display_name ||
          user.email?.split('@')[0] ||
          '',
      )
      setSelectedRoles((profile.accountType || 'producer').split('+'))

      setCountry(profile.country || '')
      setPhone(profile.phone || '')
      setBio(profile.bio || '')
      setWebsite(profile.website || '')
      setInstagram(profile.instagram || '')
      setTwitterX(profile.twitterX || '')
      setYoutube(profile.youtube || '')
      setGenres(profile.genres || [])
      return
    }

    const stored = localStorage.getItem(`extendedProfile:${user.id}`)
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        setCountry(parsed.country || '')
        setPhone(parsed.phone || '')
        setBio(parsed.bio || '')
        setWebsite(parsed.website || '')
        setInstagram(parsed.instagram || '')
        setTwitterX(parsed.twitterX || '')
        setYoutube(parsed.youtube || '')
        setGenres(parsed.genres || [])
      } catch {
        // ignore parse errors
      }
    }
  }, [user, profile])

  const toggleGenre = (g) => {
    setGenres(prev => prev.includes(g) ? prev.filter(x=>x!==g) : [...prev, g])
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setError('')
    const roles = selectedRoles.length ? selectedRoles : ['producer']
    let roleString = roles.join('+')
    if (roles.includes('artist') && roles.includes('producer')) {
      roleString = 'hybrid+' + roles.filter(r=>r!=='artist' && r!=='producer').join('+')
    }
    await updateProfile({
      role: roleString,
      display_name: displayName.trim(),
      country,
      phone,
      bio,
      website,
      instagram,
      twitterX,
      youtube,
      genres,
    })
    if (user) {
      // Keep localStorage as a fallback cache for older sessions
      const payload = { country, phone, bio, website, instagram, twitterX, youtube, genres }
      localStorage.setItem(`extendedProfile:${user.id}`, JSON.stringify(payload))
    }
    setSavedStamp(Date.now())
  }

  const handleUpdateEmail = async () => {
    if (!user || !email || email === user.email) return
    setAuthError('')
    setAuthMessage('')
    try {
      const { error } = await supabase.auth.updateUser({ email })
      if (error) throw error
      setAuthMessage('Email updated. If confirmations are enabled, check your inbox to verify the new address.')
    } catch (e) {
      setAuthError(e.message || 'Failed to update email.')
    }
  }

  const handleChangePassword = async (e) => {
    e.preventDefault()
    setAuthError('')
    setAuthMessage('')
    if (!newPassword || newPassword.length < 6) {
      setAuthError('New password must be at least 6 characters.')
      return
    }
    if (newPassword !== confirmPassword) {
      setAuthError('New password and confirmation do not match.')
      return
    }
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error
      setAuthMessage('Password updated. If security confirmations are enabled, you will receive an email to verify this change.')
      setNewPassword('')
      setConfirmPassword('')
    } catch (e2) {
      setAuthError(e2.message || 'Failed to change password.')
    }
  }

  const saveYoutubeToSupabase = async () => {
    if (!user || !youtube.trim()) return
    setSavingYoutube(true)
    try {
      // Upsert youtube_url into profiles table
      const { supabase } = await import('../lib/supabaseClient')
      const { error } = await supabase.from('profiles').upsert({ id: user.id, youtube_url: youtube.trim() })
      if (error) {
        setError(error.message)
      } else {
        setSavedStamp(Date.now())
      }
    } catch (e) {
      setError(e.message || 'Failed to save YouTube URL')
    } finally { setSavingYoutube(false) }
  }

  if (loading) {
    return <p className="p-6 text-xs text-slate-400">Loading...</p>
  }
  if (!user) {
    return <p className="p-6 text-xs text-rose-400">You must be logged in.</p>
  }

  return (
    <section className="bg-slate-950/95">
      <div className="mx-auto max-w-3xl px-4 py-10">
        <div className="flex items-center gap-3">
          <BackButton />
          <h1 className="font-display text-2xl font-semibold text-slate-50">Edit Profile</h1>
        </div>
        <form onSubmit={handleSave} className="mt-8 space-y-8">
          {/* Avatar & Display Name Card */}
          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/70 p-5">
            <div className="flex flex-col items-center gap-5 md:flex-row md:items-start">
              <div className="flex flex-col items-center gap-3">
                <div className="h-32 w-32 overflow-hidden rounded-2xl border border-slate-800/70 bg-slate-950/70 flex items-center justify-center text-[11px] text-slate-500 shadow-inner">
                  {profile?.avatarUrl ? <img src={profile.avatarUrl} alt="profile" className="h-full w-full object-cover" /> : 'No photo'}
                </div>
                <div className="flex gap-2">
                  <input ref={fileRef} type="file" accept="image/*" onChange={handleAvatar} className="hidden" />
                  <button type="button" onClick={()=>fileRef.current?.click()} className="rounded-lg border border-slate-700/70 bg-slate-800/70 px-3 py-1.5 text-[11px] font-medium text-slate-200 hover:border-emerald-400/70 hover:text-emerald-200 transition">Choose</button>
                  <button type="button" disabled={!avatarFile || uploading} onClick={doUploadAvatar} className="rounded-lg bg-emerald-500 px-3 py-1.5 text-[11px] font-semibold text-slate-950 disabled:opacity-40">{uploading ? 'Uploading…' : 'Upload'}</button>
                </div>
              </div>
              <div className="flex-1 w-full space-y-4">
                <div>
                  <label className="flex items-center justify-between text-[11px] font-semibold text-slate-300">
                    <span>Display Name</span>
                    <span className="rounded-full border border-slate-700/70 bg-slate-900/70 px-2 py-[1px] text-[9px] font-medium text-slate-400">
                      Edit
                    </span>
                  </label>
                  <input value={displayName} onChange={e=>setDisplayName(e.target.value)} required className="mt-1 w-full rounded-xl border border-slate-700/70 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 focus:border-emerald-400/70 focus:outline-none" />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-300">Roles (multi-select)</label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {ROLE_OPTIONS.map(r => {
                      const active = selectedRoles.includes(r)
                      return (
                        <button type="button" key={r} onClick={()=>toggleRole(r)} className={`rounded-full border px-3 py-1 text-[11px] font-medium transition ${active ? 'border-emerald-400/70 bg-emerald-500/10 text-emerald-300' : 'border-slate-700/70 bg-slate-900/70 text-slate-300 hover:border-slate-600'}`}>{r}</button>
                      )
                    })}
                  </div>
                  <p className="mt-2 text-[10px] text-slate-500">Producer + Artist becomes hybrid. Add all that apply.</p>
                </div>
              </div>
            </div>
          </div>
          {/* Contact & About */}
          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/70 p-5 space-y-5">
            <h2 className="text-xs font-semibold tracking-wide text-slate-200">Contact & About</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2 space-y-2">
                <div>
                  <label className="flex items-center justify-between text-[11px] font-semibold text-slate-300">
                    <span>Email</span>
                    <span className="rounded-full border border-slate-700/70 bg-slate-900/70 px-2 py-[1px] text-[9px] font-medium text-slate-400">
                      Edit
                    </span>
                  </label>
                  <div className="mt-1 flex gap-2">
                    <input
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      type="email"
                      className="flex-1 rounded-xl border border-slate-800/70 bg-slate-950/40 px-3 py-2 text-sm text-slate-100 focus:border-emerald-400/70 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleUpdateEmail}
                      className="rounded-full bg-slate-800 px-3 py-1.5 text-[11px] font-semibold text-slate-100 hover:bg-emerald-500 hover:text-slate-950 transition"
                    >
                      Update
                    </button>
                  </div>
                  <p className="mt-1 text-[10px] text-slate-500">
                    Changing your email may require confirming the new address via a link.
                  </p>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-300">Change password</label>
                  <form onSubmit={handleChangePassword} className="mt-1 grid gap-2 md:grid-cols-2 text-[11px]">
                    <input
                      type="password"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      placeholder="New password"
                      className="rounded-xl border border-slate-700/70 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 focus:border-emerald-400/70 focus:outline-none"
                    />
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                      className="rounded-xl border border-slate-700/70 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 focus:border-emerald-400/70 focus:outline-none"
                    />
                    <div className="md:col-span-2 flex justify-end">
                      <button
                        type="submit"
                        className="rounded-full border border-slate-700/70 bg-slate-900/80 px-4 py-1.5 text-[11px] font-semibold text-slate-100 hover:border-emerald-400/70 hover:text-emerald-200 transition"
                      >
                        Update password
                      </button>
                    </div>
                  </form>
                </div>
                {authError && <p className="text-[10px] text-rose-400">{authError}</p>}
                {authMessage && <p className="text-[10px] text-emerald-300">{authMessage}</p>}
              </div>
              <div>
                <label className="flex items-center justify-between text-[11px] font-semibold text-slate-300">
                  <span>Country</span>
                  <span className="rounded-full border border-slate-700/70 bg-slate-900/70 px-2 py-[1px] text-[9px] font-medium text-slate-400">
                    Edit
                  </span>
                </label>
                <select value={country} onChange={e=>setCountry(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-700/70 bg-slate-950/70 px-3 py-2 text-sm text-slate-100">
                  <option value="">Select country</option>
                  {countries.map(c=> <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="flex items-center justify-between text-[11px] font-semibold text-slate-300">
                  <span>Phone</span>
                  <span className="rounded-full border border-slate-700/70 bg-slate-900/70 px-2 py-[1px] text-[9px] font-medium text-slate-400">
                    Edit
                  </span>
                </label>
                <input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="+1 555 123 4567" className="mt-1 w-full rounded-xl border border-slate-700/70 bg-slate-950/70 px-3 py-2 text-sm text-slate-100" />
              </div>
              <div className="md:col-span-2">
                <label className="flex items-center justify-between text-[11px] font-semibold text-slate-300">
                  <span>Bio</span>
                  <span className="rounded-full border border-slate-700/70 bg-slate-900/70 px-2 py-[1px] text-[9px] font-medium text-slate-400">
                    Edit
                  </span>
                </label>
                <textarea value={bio} onChange={e=>setBio(e.target.value)} rows={4} placeholder="Introduce yourself, style, achievements..." className="mt-1 w-full rounded-xl border border-slate-700/70 bg-slate-950/70 px-3 py-2 text-sm text-slate-100" />
              </div>
            </div>
          </div>
          {/* Links & Social */}
          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/70 p-5 space-y-5">
            <h2 className="text-xs font-semibold tracking-wide text-slate-200">Links & Social</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="flex items-center justify-between text-[11px] font-semibold text-slate-300">
                  <span>Website</span>
                  <span className="rounded-full border border-slate-700/70 bg-slate-900/70 px-2 py-[1px] text-[9px] font-medium text-slate-400">
                    Edit
                  </span>
                </label>
                <input value={website} onChange={e=>setWebsite(e.target.value)} placeholder="https://" className="mt-1 w-full rounded-xl border border-slate-700/70 bg-slate-950/70 px-3 py-2 text-sm text-slate-100" />
              </div>
              <div>
                <label className="flex items-center justify-between text-[11px] font-semibold text-slate-300">
                  <span>Instagram</span>
                  <span className="rounded-full border border-slate-700/70 bg-slate-900/70 px-2 py-[1px] text-[9px] font-medium text-slate-400">
                    Edit
                  </span>
                </label>
                <input value={instagram} onChange={e=>setInstagram(e.target.value)} placeholder="@handle" className="mt-1 w-full rounded-xl border border-slate-700/70 bg-slate-950/70 px-3 py-2 text-sm text-slate-100" />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-300">X / Twitter</label>
                <input value={twitterX} onChange={e=>setTwitterX(e.target.value)} placeholder="@handle" className="mt-1 w-full rounded-xl border border-slate-700/70 bg-slate-950/70 px-3 py-2 text-sm text-slate-100" />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-300 flex items-center justify-between">YouTube <span className="text-[10px] font-normal text-slate-500">Supports channel, @handle, /user/, playlist</span></label>
                <div className="mt-1 flex gap-2">
                  <input value={youtube} onChange={e=>setYoutube(e.target.value)} placeholder="https://www.youtube.com/@handle" className="flex-1 rounded-xl border border-slate-700/70 bg-slate-950/70 px-3 py-2 text-sm text-slate-100" />
                  <button type="button" onClick={saveYoutubeToSupabase} disabled={savingYoutube || !youtube.trim()} className="rounded-lg bg-red-600/80 px-3 py-2 text-[11px] font-semibold text-white hover:bg-red-500 transition disabled:opacity-40">{savingYoutube? 'Saving…':'Save'}</button>
                </div>
              </div>
            </div>
          </div>
          {/* Genres */}
          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/70 p-5 space-y-5">
            <h2 className="text-xs font-semibold tracking-wide text-slate-200">Genres</h2>
            <div className="flex flex-wrap gap-2">
              {GENRE_OPTIONS.map(g => {
                const active = genres.includes(g)
                return (
                  <button type="button" key={g} onClick={()=>toggleGenre(g)} className={`rounded-full px-3 py-1 text-[11px] font-medium border transition ${active ? 'border-emerald-400/70 bg-emerald-500/10 text-emerald-300' : 'border-slate-700/70 bg-slate-950/70 text-slate-300 hover:border-slate-600'}`}>{g}</button>
                )
              })}
            </div>
            <p className="text-[10px] text-slate-500">Select genres that represent your catalog (max 6 recommended).</p>
          </div>
          {error && <p className="text-[11px] text-rose-400">{error}</p>}
          <div className="flex items-center gap-4">
            <button type="submit" className="rounded-full bg-emerald-500 px-6 py-2 text-xs font-semibold text-slate-950 hover:bg-emerald-400 transition disabled:opacity-50" disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</button>
            {savedStamp > 0 && <span className="text-[11px] text-emerald-300">Saved</span>}
          </div>
        </form>
          {showCropper && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
              <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-xl">
                <h2 className="text-sm font-semibold text-slate-100">Crop Profile Photo</h2>
                <p className="mt-1 text-[11px] text-slate-400">Drag to position. Use zoom. Output is square.</p>
                <div className="relative mx-auto mt-4 h-[300px] w-[300px] overflow-hidden rounded-xl border border-slate-700 bg-slate-800" onMouseDown={beginDrag}>
                  {rawImage && (
                    <img
                      src={rawImage.src}
                      alt="crop"
                      style={{
                        position: 'absolute',
                        left: offset.x + 'px',
                        top: offset.y + 'px',
                        width: rawImage.width * zoom + 'px',
                        height: rawImage.height * zoom + 'px',
                        userSelect: 'none',
                        cursor: 'grab'
                      }}
                      draggable={false}
                    />
                  )}
                  <div className="pointer-events-none absolute inset-0 ring-1 ring-emerald-400/40" />
                </div>
                <div className="mt-4 flex items-center gap-3">
                  <label className="text-[10px] font-medium text-slate-400">Zoom</label>
                  <input type="range" min={0.5} max={3} step={0.01} value={zoom} onChange={e=>setZoom(Number(e.target.value))} className="flex-1" />
                  <span className="text-[10px] text-slate-400">{zoom.toFixed(2)}x</span>
                </div>
                <div className="mt-5 flex justify-end gap-3">
                  <button type="button" onClick={()=>setShowCropper(false)} className="rounded-full border border-slate-700 px-4 py-1.5 text-[11px] font-medium text-slate-300 hover:border-slate-600">Cancel</button>
                  <button type="button" onClick={finalizeCrop} className="rounded-full bg-emerald-500 px-5 py-1.5 text-[11px] font-semibold text-slate-950 hover:bg-emerald-400">Crop</button>
                </div>
              </div>
            </div>
          )}
      </div>
    </section>
  )
}

export default EditProfile

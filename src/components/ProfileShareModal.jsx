import { useEffect, useState } from 'react'
import { slugify } from '../utils/slugify'

export function ProfileShareModal({ open, onClose, profileType='producer', profileId, displayName }) {
  const [copied, setCopied] = useState(false)
  const [copiedPlatform, setCopiedPlatform] = useState(null)
  useEffect(()=> { if (!open) setCopied(false) }, [open])
  if (!open) return null
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://riddimbase.local'
  const slug = slugify(displayName || '')
  let url = `${origin}/producer/${profileId}${slug ? `-${slug}` : ''}`
  if (profileType === 'service') {
    url = `${origin}/services/${profileId}${slug ? `-${slug}` : ''}`
  }
  if (profileType === 'beat') {
    url = `${origin}/beat/${profileId}${slug ? `-${slug}` : ''}`
  }
  const title = displayName || profileId
  const shareText = encodeURIComponent(`Check out ${title} on RiddimBase: ${url}`)
  const encodedUrl = encodeURIComponent(url)
  // Platforms with direct share endpoints use type 'link'; others fallback to copy
  const socials = [
    { name:'X', label:'X', type:'link', href:`https://twitter.com/intent/tweet?text=${shareText}`, Icon: XIcon, color:'hover:bg-black' },
    { name:'Facebook', label:'Facebook', type:'link', href:`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`, Icon: FacebookIcon, color:'hover:bg-[#1877F2]' },
    { name:'Instagram', label:'Instagram', type:'copy', Icon: InstagramIcon, color:'hover:bg-gradient-to-r hover:from-pink-500 hover:to-purple-600' },
    { name:'TikTok', label:'TikTok', type:'copy', Icon: TikTokIcon, color:'hover:bg-zinc-800' },
    { name:'WhatsApp', label:'WhatsApp', type:'link', href:`https://wa.me/?text=${shareText}`, Icon: WhatsAppIcon, color:'hover:bg-green-600' },
    { name:'Email', label:'Email', type:'link', href:`mailto:?subject=${encodeURIComponent('Profile Share')}&body=${shareText}`, Icon: EmailIcon, color:'hover:bg-indigo-600' }
  ]
  const copy = () => {
    navigator.clipboard.writeText(url).then(()=> { setCopied(true); setTimeout(()=> setCopied(false), 1500) })
  }
  const copyForPlatform = (name) => {
    navigator.clipboard.writeText(url).then(()=> {
      setCopiedPlatform(name)
      setTimeout(()=> setCopiedPlatform(null), 1600)
    })
  }
  const nativeShare = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: title, text: `Check out ${title}`, url }) } catch {}
    }
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-800/80 bg-slate-900/80 p-6">
        <h2 className="text-sm font-semibold text-slate-100">Share Profile</h2>
        <p className="mt-1 text-[11px] text-slate-400">Spread the word about {title}. Copy link or share directly.</p>
        <div className="mt-4 flex items-center gap-2">
          <input readOnly value={url} className="flex-1 rounded-lg border border-slate-700/70 bg-slate-950/70 px-3 py-2 text-[11px] text-slate-100" />
          <button onClick={copy} className="rounded-lg bg-emerald-500 px-3 py-2 text-[11px] font-semibold text-slate-950 hover:bg-emerald-400 transition">{copied ? 'Copied!' : 'Copy'}</button>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2">
          {socials.map(s => {
            const base = "group relative flex items-center gap-2 rounded-xl border border-slate-700/70 bg-slate-800/70 px-2 py-1.5 text-[10px] font-medium text-slate-200 transition hover:border-emerald-400/70";
            if (s.type === 'link') {
              return (
                <a key={s.name} href={s.href} target="_blank" rel="noreferrer" aria-label={s.label} className={`${base} ${s.color}`}>
                  <s.Icon className="h-5 w-5 text-white group-hover:scale-110 transition" />
                  <span className="sr-only">Share on {s.label}</span>
                </a>
              )
            }
            return (
              <button key={s.name} type="button" onClick={()=>copyForPlatform(s.name)} aria-label={`Copy link for ${s.label}`} className={`${base} ${s.color}`}>
                <s.Icon className="h-5 w-5 text-white group-hover:scale-110 transition" />
                <span className="sr-only">Copy link for {s.label}</span>
                {copiedPlatform === s.name && (
                  <span className="absolute -top-1 -right-1 rounded bg-emerald-500 px-1 py-0.5 text-[9px] font-semibold text-slate-950">Copied</span>
                )}
              </button>
            )
          })}
          {navigator.share && (
            <button onClick={nativeShare} className="rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 px-3 py-1.5 text-[10px] font-semibold text-slate-950 hover:brightness-110 transition">Native</button>
          )}
        </div>
        <button onClick={onClose} className="mt-6 w-full rounded-full border border-slate-700/70 px-4 py-2 text-[11px] font-medium text-slate-300 hover:border-slate-600">Close</button>
      </div>
    </div>
  )
}

export default ProfileShareModal

// Updated brand icons with consistent fill style
function XIcon(props){return(<svg viewBox="0 0 24 24" fill="currentColor" {...props}><path d="M18.244 2.25h3.308l-7.227 8.26 8.518 11.24H16.35l-5.214-6.817-6.006 6.817H1.822l7.73-8.78L1.348 2.25h6.937l4.713 6.188 5.246-6.188Z"/></svg>)}
function FacebookIcon(props){return(<svg viewBox="0 0 24 24" fill="currentColor" {...props}><path d="M22 12.06C22 6.49 17.52 2 12 2S2 6.49 2 12.06c0 5 3.66 9.15 8.44 9.94v-7.03H8.4v-2.91h2.04V9.94c0-2.02 1.2-3.14 3.03-3.14.88 0 1.8.16 1.8.16v1.98h-1.02c-1 0-1.31.63-1.31 1.27v1.53h2.23l-.36 2.9h-1.87v7.04C18.34 21.21 22 17.06 22 12.06Z"/></svg>)}
function InstagramIcon(props){return(<svg viewBox="0 0 24 24" fill="currentColor" {...props}><path d="M7 2h10c2.76 0 5 2.24 5 5v10c0 2.76-2.24 5-5 5H7c-2.76 0-5-2.24-5-5V7c0-2.76 2.24-5 5-5Zm0 2c-1.66 0-3 1.34-3 3v10c0 1.66 1.34 3 3 3h10c1.66 0 3-1.34 3-3V7c0-1.66-1.34-3-3-3H7Zm5 3.4a5.6 5.6 0 1 1 0 11.2 5.6 5.6 0 0 1 0-11.2Zm0 2a3.6 3.6 0 1 0 0 7.2 3.6 3.6 0 0 0 0-7.2Zm5.25-.9a1.05 1.05 0 1 1 0 2.1 1.05 1.05 0 0 1 0-2.1Z"/></svg>)}
function TikTokIcon(props){return(<svg viewBox="0 0 24 24" fill="currentColor" {...props}><path d="M14.25 2h2.4c.17 1.7 1.29 3.13 2.82 3.74v2.46c-1.3-.16-2.5-.68-3.49-1.47v6.55c0 3.33-2.7 6.04-6.02 6.04A6.03 6.03 0 0 1 4.5 13.3c0-3.33 2.7-6.04 6.06-6.04.14 0 .28 0 .42.01v2.52a3.54 3.54 0 0 0-.42-.02 3.53 3.53 0 0 0-3.53 3.53 3.53 3.53 0 0 0 3.53 3.53 3.53 3.53 0 0 0 3.52-3.53V2Z"/></svg>)}
function WhatsAppIcon(props){return(<svg viewBox="0 0 24 24" fill="currentColor" {...props}><path d="M12 2a10 10 0 0 0-8.94 14.52L2 22l5.67-1.49A10 10 0 1 0 12 2Zm0 2a8 8 0 0 1 4.9 14.34l-.32.23-3.6-.94-.2.02a8 8 0 0 1-9.16-8A8 8 0 0 1 12 4Zm-3.2 3.6c-.23 0-.64.15-.64.54 0 .39.38 1.52 1.08 2.37.76.91 1.98 1.93 3.58 2.52 1.46.54 1.76.46 2.07.38.31-.08 1.02-.62 1.02-1.23 0-.61-.51-.91-1-.99-.49-.08-.78-.08-.9.08-.13.15-.52.61-.64.74-.12.13-.23.15-.43.08-.2-.08-.86-.32-1.64-.99-.61-.54-1.02-1.23-1.14-1.44-.12-.23-.01-.35.07-.43.08-.08.2-.23.31-.38.1-.15.15-.23.23-.38.08-.15.04-.28-.02-.38-.06-.1-.55-1.28-.78-1.74-.18-.33-.37-.37-.49-.37Z"/></svg>)}
function EmailIcon(props){return(<svg viewBox="0 0 24 24" fill="currentColor" {...props}><path d="M4 4h16c1.1 0 2 .9 2 2v12a2 2 0 0 1-2 2H4c-1.11 0-2-.9-2-2V6c0-1.1.89-2 2-2Zm0 2v.01l8 5.33 8-5.34V6H4Zm0 12h16V9.34l-8 5.33-8-5.33V18Z"/></svg>)}

import { useEffect } from 'react'
import { slugify } from '../utils/slugify'

export default function ShareBeatModal({ beat, onClose }) {
  if (!beat) return null
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const slug = slugify(beat.title)
  const url = `${origin}/beat/${beat.id}-${slug}`
  const shareText = `Check out my new beat: ${beat.title}`
  const text = encodeURIComponent(`${shareText} - ${url}`)

  const links = [
    { name: 'WhatsApp', href: `https://wa.me/?text=${text}`, color: 'text-green-400', svg: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor"><path d="M12.04 2c-5.52 0-10 4.48-10 10 0 1.77.47 3.5 1.36 5.02L2 22l5.17-1.36A10.04 10.04 0 0 0 12.04 22c5.52 0 10-4.48 10-10s-4.48-10-10-10Zm0 18.13c-1.64 0-3.25-.44-4.66-1.27l-.33-.2-3.07.81.82-2.99-.21-.34A8.13 8.13 0 1 1 12.04 20.13Zm4.47-5.87c-.24-.12-1.42-.7-1.64-.78-.22-.08-.38-.12-.55.12-.16.24-.63.78-.77.94-.14.16-.28.18-.52.06-.24-.12-1.02-.38-1.94-1.22-.72-.64-1.2-1.42-1.34-1.66-.14-.24-.02-.37.1-.49.1-.1.24-.26.36-.39.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.55-1.32-.75-1.8-.2-.48-.4-.42-.55-.43-.14-.01-.3-.01-.46-.01-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2.02 0 1.2.86 2.36.98 2.52.12.16 1.7 2.6 4.15 3.66.58.25 1.03.4 1.38.51.58.19 1.12.16 1.54.1.48-.07 1.42-.58 1.62-1.14.2-.56.2-1.04.14-1.14-.06-.1-.22-.16-.46-.28Z"/></svg>) },
    { name: 'Telegram', href: `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${text}`, color: 'text-sky-400', svg: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2Zm4.38 6.78-1.63 7.68c-.12.54-.44.67-.9.42l-2.5-1.84-.12-.12 1.02-1 1.56.97c.18.1.38.02.44-.2l.28-1.3.6-2.8c.06-.26-.1-.4-.34-.3l-3.84 1.5-1.55-.48c-.34-.1-.35-.34.07-.5l5.97-2.3c.4-.16.75.08.64.5Z"/></svg>) },
    { name: 'Facebook', href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, color: 'text-blue-500', svg: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor"><path d="M12 2.04c-5.5 0-9.96 4.46-9.96 9.96 0 4.98 3.66 9.11 8.44 9.88v-6.99H8.9v-2.89h1.58v-1.46c0-1.56.93-2.43 2.34-2.43.68 0 1.39.12 1.39.12v1.53h-.78c-.77 0-1.01.48-1.01.97v1.27h1.72l-.27 2.89h-1.45v6.99c4.78-.77 8.44-4.9 8.44-9.88 0-5.5-4.46-9.96-9.96-9.96Z"/></svg>) },
    { name: 'SMS', href: `sms:?body=${text}`, color: 'text-lime-400', svg: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor"><path d="M4 4h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-6l-4.5 3.6c-.34.27-.85.03-.85-.41V17H4a2 2 0 0 1-2-2V6c0-1.1.9-2 2-2Zm0 2v9h6v2.15L13.25 15H20V6H4Z"/></svg>) },
    { name: 'X', href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(url)}`, color: 'text-slate-100', svg: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor"><path d="M17.75 3h3.65l-7.97 9.13 9.4 8.87h-7.36l-5.78-5.47L3.7 21H.05l8.52-9.77L.05 3h7.5l5.22 4.96L17.75 3Zm-2.59 16.44h2.03L7.02 4.48H4.84l10.32 14.96Z"/></svg>) },
    { name: 'Reddit', href: `https://www.reddit.com/submit?url=${encodeURIComponent(url)}&title=${encodeURIComponent(shareText)}` , color: 'text-orange-500', svg: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor"><path d="M12 2C6.48 2 2 6.02 2 10.98c0 2.41 1.13 4.66 3.09 6.32 0 .03-.01.05-.01.08 0 2.25 3.13 4.08 6.99 4.08 3.86 0 7-1.83 7-4.08 0-.02 0-.05-.01-.07 1.96-1.66 3.09-3.92 3.09-6.33C22 6.02 17.52 2 12 2Zm4.12 11.25a1.13 1.13 0 1 1 0-2.26 1.13 1.13 0 0 1 0 2.26ZM9.88 13.5a1.13 1.13 0 1 1 0-2.26 1.13 1.13 0 0 1 0 2.26Zm7.17 2.23c-.86.85-2.5 1.44-4.31 1.44s-3.46-.59-4.31-1.44a.56.56 0 0 1 .79-.79c.64.63 2.01 1.05 3.52 1.05 1.51 0 2.89-.42 3.52-1.05a.56.56 0 1 1 .79.79Z"/></svg>) },
  ]

  // Instagram has no direct web share intent; provide copy option.
  const copyLink = async () => {
    try { await navigator.clipboard.writeText(url) } catch {}
  }

  const nativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: beat.title, text: shareText, url })
        onClose()
      } catch {}
    } else {
      copyLink()
    }
  }

  useEffect(() => {
    const keyHandler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', keyHandler)
    return () => window.removeEventListener('keydown', keyHandler)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-950/95 p-5 shadow-xl">
        <h2 className="font-display text-lg font-semibold text-slate-100">Beat Uploaded!</h2>
        <p className="mt-1 text-xs text-slate-400">Share your beat instantly:</p>
        <div className="mt-3 flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2">
          <input readOnly value={url} className="flex-1 bg-transparent text-[11px] text-slate-200 focus:outline-none" />
          <button onClick={copyLink} className="text-[11px] rounded-full border border-emerald-500/40 px-2 py-1 text-emerald-300 hover:bg-emerald-500/10">Copy</button>
        </div>
        <div className="mt-4 grid grid-cols-4 gap-3">
          {links.map(l => (
            <a key={l.name} href={l.href} target="_blank" rel="noopener noreferrer" className="group flex flex-col items-center gap-1 rounded-lg border border-slate-800 bg-slate-900/60 px-2 py-3 text-[10px] font-medium text-slate-300 hover:border-slate-700 hover:bg-slate-800/80">
              <span className={l.color}>{l.svg}</span>
              <span className="group-hover:text-slate-100">{l.name}</span>
            </a>
          ))}
          <button onClick={copyLink} className="flex flex-col items-center gap-1 rounded-lg border border-slate-800 bg-slate-900/60 px-2 py-3 text-[10px] font-medium text-slate-300 hover:border-slate-700 hover:bg-slate-800/80">
            <span className="text-pink-400">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor"><path d="M12 2.2c3.2 0 3.6.01 4.85.07 1.17.05 1.96.24 2.65.52.72.28 1.33.66 1.93 1.26.6.6.98 1.21 1.26 1.93.28.69.47 1.48.52 2.65.06 1.25.07 1.65.07 4.85s-.01 3.6-.07 4.85c-.05 1.17-.24 1.96-.52 2.65a5.4 5.4 0 0 1-1.26 1.93 5.4 5.4 0 0 1-1.93 1.26c-.69.28-1.48.47-2.65.52-1.25.06-1.65.07-4.85.07s-3.6-.01-4.85-.07c-1.17-.05-1.96-.24-2.65-.52A5.4 5.4 0 0 1 2.2 19.8a5.4 5.4 0 0 1-1.26-1.93c-.28-.69-.47-1.48-.52-2.65C.36 14.97.35 14.57.35 11.37s.01-3.6.07-4.85c.05-1.17.24-1.96.52-2.65.28-.72.66-1.33 1.26-1.93.6-.6 1.21-.98 1.93-1.26.69-.28 1.48-.47 2.65-.52C8.4 2.21 8.8 2.2 12 2.2Zm0 2c-3.15 0-3.52.01-4.76.07-.98.05-1.51.21-1.86.35-.47.18-.8.39-1.15.74-.35.35-.56.68-.74 1.15-.14.35-.3.88-.35 1.86-.06 1.24-.07 1.61-.07 4.76s.01 3.52.07 4.76c.05.98.21 1.51.35 1.86.18.47.39.8.74 1.15.35.35.68.56 1.15.74.35.14.88.3 1.86.35 1.24.06 1.61.07 4.76.07s3.52-.01 4.76-.07c.98-.05 1.51-.21 1.86-.35.47-.18.8-.39 1.15-.74.35-.35.56-.68.74-1.15.14-.35.3-.88.35-1.86.06-1.24.07-1.61.07-4.76s-.01-3.52-.07-4.76c-.05-.98-.21-1.51-.35-1.86a3.4 3.4 0 0 0-.74-1.15 3.4 3.4 0 0 0-1.15-.74c-.35-.14-.88-.3-1.86-.35-1.24-.06-1.61-.07-4.76-.07Zm0 2.6a4.2 4.2 0 1 1 0 8.4 4.2 4.2 0 0 1 0-8.4Zm0 6.9a2.7 2.7 0 1 0 0-5.4 2.7 2.7 0 0 0 0 5.4Zm5.4-6.95a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z"/></svg>
            </span>
            <span>Instagram</span>
          </button>
        </div>
        <div className="mt-4 flex flex-wrap justify-end gap-3">
          {navigator.share && <button onClick={nativeShare} className="rounded-full bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-slate-950 hover:bg-emerald-500">Share (Native)</button>}
          <button onClick={onClose} className="rounded-full bg-slate-800 px-4 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700">Close</button>
          <a href={url} target="_blank" rel="noopener noreferrer" className="rounded-full bg-emerald-500 px-4 py-1.5 text-xs font-semibold text-slate-950 hover:bg-emerald-400">View Beat</a>
        </div>
        <p className="mt-3 text-[10px] text-slate-500">Instagram does not support direct web share; use Copy then paste.</p>
      </div>
    </div>
  )
}

export default function SocialIconRow({ website, instagram, twitterX, youtube, tiktok, whatsapp, telegram, size = 'xs' }) {
  const items = []
  if (website) items.push({ kind: 'website', href: website })
  if (instagram) items.push({ kind: 'instagram', href: instagram })
  if (twitterX) items.push({ kind: 'twitterX', href: twitterX })
  if (youtube) items.push({ kind: 'youtube', href: youtube })
  if (tiktok) items.push({ kind: 'tiktok', href: tiktok })
  if (whatsapp) items.push({ kind: 'whatsapp', href: whatsapp })
  if (telegram) items.push({ kind: 'telegram', href: telegram })

  if (!items.length) return null

  const baseSize = size === 'sm' ? 'h-4 w-4' : 'h-3.5 w-3.5'
  const padding = size === 'sm' ? 'p-1.5' : 'p-1'

  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5">
      {items.map((item) => (
        <a
          key={item.kind}
          href={item.href}
          target="_blank"
          rel="noreferrer"
          onClick={(e) => e.stopPropagation()}
          className={`flex items-center justify-center rounded-full bg-slate-900/90 border border-slate-700/70 text-slate-200 hover:border-emerald-400/70 hover:text-emerald-300 transition ${padding}`}
        >
          {renderIcon(item.kind, baseSize)}
        </a>
      ))}
    </div>
  )
}

function renderIcon(kind, className) {
  switch (kind) {
    case 'instagram':
      return (
        <img
          src="/assets/social/instagram.png"
          alt=""
          aria-hidden="true"
          className={className}
          loading="lazy"
          decoding="async"
        />
      )
    case 'twitterX':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className={className} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 4l16 16M20 4 4 20" />
        </svg>
      )
    case 'youtube':
      return (
        <img
          src="/assets/social/youtube.png"
          alt=""
          aria-hidden="true"
          className={className}
          loading="lazy"
          decoding="async"
        />
      )
    case 'tiktok':
      return (
        <img
          src="/assets/social/tiktok.png"
          alt=""
          aria-hidden="true"
          className={className}
          loading="lazy"
          decoding="async"
        />
      )
    case 'whatsapp':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className={className} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 20.5 6.5 17A7 7 0 1 1 10 19.5L5 20.5Z" />
          <path d="M16 12.5c-.5 1-1.6 1.7-2.1 1.9-.5.1-.4 0-1.3-.3-2.2-.8-3.6-3-3.7-3.1-.1-.1-.9-1.2-.9-2s.6-1.2.8-1.4.4-.2.5-.2h.4c.1 0 .3-.1.5.4.2.5.7 1.7.7 1.8.1.1.1.3 0 .4-.1.1-.1.2-.2.3l-.3.4c-.1.1-.3.3-.1.6.2.3.8 1.3 1.8 2.1 1.2.8 1.7.9 2 .8.3-.1.9-.4 1-0.7.1-.3.5-.6.7-.5.2.1 1.1.5 1.2.6.1.1.3.1.3.2 0 .1 0 .7-.5 1.4Z" />
        </svg>
      )
    case 'telegram':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className={className} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21.5 3.5 18 20.5l-5.5-3-3 3.5-1-7L2.5 11l19-7.5Z" />
        </svg>
      )
    case 'website':
    default:
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className={className} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18" />
          <path d="M12 3a14 14 0 0 1 4 9 14 14 0 0 1-4 9 14 14 0 0 1-4-9 14 14 0 0 1 4-9Z" />
        </svg>
      )
  }
}



import { useMemo, useState } from 'react'

// Drop the provided PNG here to use the exact artwork:
//   public/assets/verified-badge.png
const VERIFIED_BADGE_SRC = '/assets/verified-badge.png'

export default function VerifiedBadge({ className, label = 'Verified Producer Pro' }) {
  const [imageFailed, setImageFailed] = useState(false)

  const shouldUseImage = useMemo(() => {
    if (!VERIFIED_BADGE_SRC) return false
    if (imageFailed) return false
    return true
  }, [imageFailed])

  if (shouldUseImage) {
    return (
      <img
        src={VERIFIED_BADGE_SRC}
        alt={label}
        className={className}
        loading="lazy"
        decoding="async"
        onError={() => setImageFailed(true)}
      />
    )
  }

  // SVG fallback (uses currentColor so it respects existing Tailwind tokens)
  return (
    <svg viewBox="0 0 24 24" role="img" aria-label={label} className={className}>
      <path
        fill="currentColor"
        d="M12 1.8l2.05 1.6 2.57-.46.93 2.5 2.39 1.06-.46 2.57L23 12l-1.6 2.05.46 2.57-2.39 1.06-.93 2.5-2.57-.46L12 22.2l-2.05-1.6-2.57.46-.93-2.5-2.39-1.06.46-2.57L1 12l1.6-2.05-.46-2.57 2.39-1.06.93-2.5 2.57.46L12 1.8Z"
        opacity="0.95"
      />
      <path
        d="M9.4 12.3 11 13.9l3.9-4"
        fill="none"
        stroke="white"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

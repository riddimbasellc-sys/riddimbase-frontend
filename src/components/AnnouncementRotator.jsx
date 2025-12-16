import { useEffect, useState } from 'react'

// Props: announcements [{ id, message, severity }] and intervalSec (1-5)
export default function AnnouncementRotator({ announcements = [], intervalSec = 3, className = '' }) {
  const activeList = announcements.filter((a) => a && a.message && a.message.trim())
  const [index, setIndex] = useState(0)

  // Reset index when the list size or interval changes
  useEffect(() => {
    setIndex(0)
  }, [activeList.length, intervalSec])

  // Auto-advance between announcements
  useEffect(() => {
    if (activeList.length <= 1) return
    const ms = Math.min(5, Math.max(1, intervalSec)) * 1000
    const t = setInterval(() => {
      setIndex((i) => (i + 1) % activeList.length)
    }, ms)
    return () => clearInterval(t)
  }, [activeList.length, intervalSec])

  if (activeList.length === 0) return null

  // Clamp index so we never read past the end of the array
  const safeIndex = index % activeList.length
  const current = activeList[safeIndex]

  const messageText = current?.message || ''
  const durationSec = Math.min(40, 14 + messageText.length * 0.15)

  // Text-only marquee: moving text and dots
  return (
    <div className={`relative flex w-full items-center gap-2 overflow-hidden text-xs sm:text-sm ${className}`}>
      <div className="relative flex-1 overflow-hidden">
        <div
          className="rb-marquee-track font-medium tracking-wide"
          style={{ animationDuration: `${durationSec}s` }}
        >
          {messageText}
        </div>
      </div>

      {activeList.length > 1 && (
        <div className="flex items-center gap-1 text-slate-300/70">
          {activeList.map((a, i) => (
            <span
              key={a.id}
              className={`h-1.5 w-1.5 rounded-full ${
                i === safeIndex ? 'bg-slate-100' : 'bg-slate-500/40'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  )
}

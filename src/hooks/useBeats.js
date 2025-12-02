import { useEffect, useState } from 'react'
import { fetchBeats } from '../services/beatsRepository'
import { listBeats } from '../services/beatsService'

export function useBeats() {
  const [beats, setBeats] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    fetchBeats()
      .then((data) => {
        if (!active) return
        if (data && data.length) {
          // Primary source: Supabase beats table
          setBeats(
            data.map((b) => ({
              id: b.id,
              title: b.title,
              producer: b.producer || 'Unknown',
              userId: b.user_id || b.userId || null,
              genre: b.genre || 'Dancehall',
              bpm: b.bpm || 100,
              price: b.price || 29,
              audioUrl: b.audio_url || null,
              untaggedUrl: b.untagged_url || null,
              coverUrl: b.cover_url || null,
              bundleUrl: b.bundle_url || null,
              description: b.description || '',
              licensePrices: b.license_prices || b.licensePrices || null,
              freeDownload: !!(b.free_download || b.freeDownload),
            })),
          )
        } else {
          // Fallback only to user-local beats (from this browser),
          // never to hard-coded placeholders.
          setBeats(listBeats())
        }
        setLoading(false)
      })
      .catch(() => {
        setBeats(listBeats())
        setLoading(false)
      })
    return () => { active = false }
  }, [])

  return { beats, loading }
}

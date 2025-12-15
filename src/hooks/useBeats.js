import { useEffect, useState } from 'react'
import { fetchBeats } from '../services/beatsRepository'

export function useBeats() {
  const [beats, setBeats] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    fetchBeats()
      .then((data) => {
        if (!active) return
        if (data && data.length) {
          // Supabase beats table is the single source of truth.
          setBeats(
            data.map((b) => ({
              id: b.id,
              title: b.title,
              createdAt: b.created_at || null,
              producer: b.producer || 'Unknown',
              collaborator: b.collaborator || null,
              musicalKey: b.musical_key || null,
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
          // No Supabase beats found; do not fall back to localStorage.
          setBeats([])
        }
        setLoading(false)
      })
      .catch(() => {
        // If Supabase fails, show no beats rather than device-local ones.
        setBeats([])
        setLoading(false)
      })
    return () => { active = false }
  }, [])

  return { beats, loading }
}

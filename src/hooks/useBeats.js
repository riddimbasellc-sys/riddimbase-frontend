import { useEffect, useState } from 'react'
import { fetchBeats } from '../services/beatsRepository'
import { listBeats } from '../services/beatsService'

export function useBeats() {
  const [beats, setBeats] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    fetchBeats().then(data => {
      if (!active) return
      if (data.length === 0) {
        // fallback to in-memory mocks if Supabase empty
        setBeats(listBeats())
      } else {
        setBeats(data.map(b => ({
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
          freeDownload: !!(b.free_download || b.freeDownload),
        })))
      }
      setLoading(false)
    }).catch(() => {
      setBeats(listBeats())
      setLoading(false)
    })
    return () => { active = false }
  }, [])

  return { beats, loading }
}

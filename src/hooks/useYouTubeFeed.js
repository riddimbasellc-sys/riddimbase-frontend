import { useEffect, useState } from 'react'

export default function useYouTubeFeed(youtubeUrl) {
  const [videos, setVideos] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!youtubeUrl) {
      setVideos([])
      return
    }
    let cancelled = false
    async function run() {
      setLoading(true)
      setError(null)
      try {
        const base = import.meta.env.VITE_API_BASE_URL || ''
        const endpoint = `${base || ''}/api/youtube-feed?url=${encodeURIComponent(
          youtubeUrl,
        )}`
        const res = await fetch(endpoint)
        if (!res.ok) throw new Error('Feed request failed')
        const payload = await res.json()
        const list = Array.isArray(payload.videos) ? payload.videos : []
        if (!cancelled) {
          setVideos(list.slice(0, 3))
        }
      } catch (err) {
        console.warn('YouTube feed failed, using sample placeholders', err)
        if (!cancelled) {
          setError(err.message)
          setVideos([
            {
              videoId: 'M7lc1UVf-VE',
              title: 'Sample Tutorial 1',
              published: new Date().toISOString(),
            },
            {
              videoId: 'XGSy3_Czz8k',
              title: 'Sample Tutorial 2',
              published: new Date().toISOString(),
            },
            {
              videoId: 'eX2qFMC8cFo',
              title: 'Sample Tutorial 3',
              published: new Date().toISOString(),
            },
          ])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [youtubeUrl])

  return { videos, loading, error }
}

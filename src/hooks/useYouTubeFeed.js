import { useEffect, useState } from 'react'

function extractChannelIdBasic(url) {
  if (!url) return null
  const channelMatch = url.match(/youtube\.com\/channel\/([a-zA-Z0-9_-]+)/)
  if (channelMatch) return channelMatch[1]
  return null
}

async function resolveChannelId(url) {
  // 1. Direct channel URL
  const direct = extractChannelIdBasic(url)
  if (direct) return direct
  // 2. Handle (@name) or /user/ patterns – fetch page and regex channel id
  if (/youtube\.com\/(?:@|user\/)/.test(url)) {
    try {
      const res = await fetch(url)
      const html = await res.text()
      const match = html.match(/channelId":"(UC[^"]+)/) || html.match(/"externalId":"(UC[^"]+)/)
      if (match) return match[1]
    } catch (e) {
      console.warn('Handle/user channel resolution failed', e)
    }
  }
  // 3. Playlist URL – attempt to extract first video ids
  if (/playlist\?list=/.test(url)) {
    try {
      const res = await fetch(url)
      const html = await res.text()
      const vids = [...html.matchAll(/watch\?v=([a-zA-Z0-9_-]{11})/g)].map(m => m[1])
      // Return pseudo-channel id null; playlist will be handled separately.
      return { playlistVideos: Array.from(new Set(vids)).slice(0,6) }
    } catch (e) { console.warn('Playlist fetch failed', e) }
  }
  return null
}

export default function useYouTubeFeed(youtubeUrl) {
  const [videos, setVideos] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!youtubeUrl) { setVideos([]); return }
    let cancelled = false
    async function run() {
      setLoading(true); setError(null)
      try {
        const resolved = await resolveChannelId(youtubeUrl)
        if (resolved && typeof resolved === 'object' && resolved.playlistVideos) {
          // Playlist fallback: build minimal video objects
          const plVideos = resolved.playlistVideos.slice(0,3).map(id => ({ videoId: id, title: 'Playlist Video', published: null }))
          if (!cancelled) setVideos(plVideos)
          return
        }
        const channelId = resolved || extractChannelIdBasic(youtubeUrl)
        if (!channelId) throw new Error('Could not resolve channel ID')
        const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`
        const res = await fetch(feedUrl)
        if (!res.ok) throw new Error('Feed request failed')
        const text = await res.text()
        const parser = new DOMParser()
        const doc = parser.parseFromString(text, 'application/xml')
        const entries = [...doc.getElementsByTagName('entry')]
        const parsed = entries.slice(0, 6).map(e => {
          const idTag = e.getElementsByTagName('yt:videoId')[0]
          const vid = idTag ? idTag.textContent : null
          return {
            videoId: vid,
            title: e.getElementsByTagName('title')[0]?.textContent || 'Untitled',
            published: e.getElementsByTagName('published')[0]?.textContent || null
          }
        }).filter(v => v.videoId)
        if (!cancelled) setVideos(parsed.slice(0,3))
      } catch (err) {
        console.warn('YouTube feed failed, using sample placeholders', err)
        if (!cancelled) {
          setError(err.message)
          // Fallback sample videos (placeholders)
          setVideos([
            { videoId: 'M7lc1UVf-VE', title: 'Sample Tutorial 1', published: new Date().toISOString() },
            { videoId: 'XGSy3_Czz8k', title: 'Sample Tutorial 2', published: new Date().toISOString() },
            { videoId: 'eX2qFMC8cFo', title: 'Sample Tutorial 3', published: new Date().toISOString() }
          ])
        }
      } finally { if (!cancelled) setLoading(false) }
    }
    run()
    return () => { cancelled = true }
  }, [youtubeUrl])

  return { videos, loading, error }
}

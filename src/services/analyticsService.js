// Beat analytics: local counters + backend metrics

const playKey = (beatId) => `plays:${beatId}`
const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')

// Record a play locally and send a fire-and-forget hit to the backend
export function recordPlay(beatId, producerId) {
  if (!beatId) return
  if (!API_BASE) return
  try {
    fetch(`${API_BASE}/api/metrics/beat-play`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ beatId, producerId: producerId || null }),
      keepalive: true,
    }).catch(() => {})
  } catch {
    // ignore network issues; local counter still works
  }
}

export function getPlayCount(beatId) {
  if (!beatId) return 0
  // Local counters removed; rely on Supabase metrics instead.
  return 0
}

export function getTotalPlaysForBeats(beatIds = []) {
  return beatIds.reduce((sum, id) => sum + getPlayCount(id), 0)
}

export function getAveragePlaysPerBeat(beatIds = []) {
  if (!beatIds.length) return 0
  return getTotalPlaysForBeats(beatIds) / beatIds.length
}

export function topBeatsByPlays(beatIds = [], limit = 3) {
  return beatIds
    .map((id) => ({ id, plays: getPlayCount(id) }))
    .sort((a, b) => b.plays - a.plays)
    .slice(0, limit)
}

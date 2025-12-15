// Supabase-backed boosts helpers (via backend HTTP APIs).
// All live boost data comes from the server, which in turn uses the
// `boosted_beats` table. No localStorage or in-memory prototypes.

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')

function baseUrl(path) {
  return API_BASE ? `${API_BASE}${path}` : path
}

export async function listActiveBoosts() {
  try {
    const res = await fetch(baseUrl('/api/boosted'), {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    })
    if (!res.ok) return []
    const data = await res.json().catch(() => [])
    return Array.isArray(data) ? data : []
  } catch {
    return []
  }
}

export async function isBeatBoosted(beatId) {
  if (!beatId) return false
  const boosts = await listActiveBoosts()
  return boosts.some((b) => b.beat_id === beatId || b.beatId === beatId)
}

export async function getBoostForBeat(beatId) {
  if (!beatId) return null
  const boosts = await listActiveBoosts()
  return (
    boosts.find((b) => b.beat_id === beatId || b.beatId === beatId) || null
  )
}


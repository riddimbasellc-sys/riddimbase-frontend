// Beat analytics: backend metrics with lightweight frontend cache.

import { supabase } from '../lib/supabaseClient'

// Optional absolute API base (e.g. Render); if not set we use same-origin /api.
const RAW_BASE = import.meta.env.VITE_API_BASE_URL || ''
const API_BASE = RAW_BASE ? RAW_BASE.replace(/\/$/, '') : ''

// In‑memory cache of total plays per beat (aggregated from beat_metrics_daily).
const playCache = new Map()

// Record a play (visitor or logged-in user) via the backend metrics endpoint.
export function recordPlay(beatId, producerId) {
  if (!beatId) return
  try {
    const endpoint = API_BASE
      ? `${API_BASE}/api/metrics/beat-play`
      : '/api/metrics/beat-play'

    fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ beatId, producerId: producerId || null }),
      keepalive: true,
    }).catch(() => {})
  } catch {
    // Ignore network issues; playback should never break.
  }
}

export function getPlayCount(beatId) {
  if (!beatId) return 0
  return playCache.get(beatId) || 0
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

// Load aggregated play counts for a set of beats from Supabase metrics,
// update the local cache, and return a simple { [beatId]: totalPlays } map.
export async function loadPlayCountsForBeats(beatIds = []) {
  const ids = Array.from(new Set(beatIds.filter(Boolean)))
  if (!ids.length) return {}

  try {
    const { data, error } = await supabase
      .from('beat_metrics_daily')
      .select('beat_id,value')
      .eq('metric', 'plays')
      .in('beat_id', ids)

    if (error) throw error

    const totals = {}
    ;(data || []).forEach((row) => {
      const id = row.beat_id
      if (!id) return
      const val = Number(row.value) || 0
      totals[id] = (totals[id] || 0) + val
    })

    ids.forEach((id) => {
      if (totals[id] === undefined) totals[id] = 0
    })

    Object.entries(totals).forEach(([id, value]) => {
      playCache.set(id, value)
    })

    return totals
  } catch {
    return {}
  }
}

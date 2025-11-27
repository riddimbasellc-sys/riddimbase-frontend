// Lightweight boost service (localStorage-based prototype).
// Later can be wired to Supabase `boosted_beats` table.

const LS_KEY = 'rb_boosts_v2'

function readBoosts() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]') } catch { return [] }
}

function writeBoosts(arr) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(arr)) } catch {}
}

export function createLocalBoost({ beatId, producerId, tier }) {
  const tiers = { 1: 3, 2: 7, 3: 30 }
  const days = tiers[tier] || 3
  const now = Date.now()
  const expiresAt = now + days * 24 * 60 * 60 * 1000
  const priorityScore = (tier || 1) * 100

  const boosts = readBoosts().filter(b => !(b.beatId === beatId && b.producerId === producerId))
  const record = {
    id: 'local_' + beatId,
    beatId,
    producerId,
    tier,
    priorityScore,
    startsAt: now,
    expiresAt,
  }
  boosts.push(record)
  writeBoosts(boosts)
  return record
}

export function listActiveBoosts() {
  const now = Date.now()
  return readBoosts()
    .filter(b => b.expiresAt > now)
    .sort((a, b) => b.priorityScore - a.priorityScore || b.startsAt - a.startsAt)
}

export function isBeatBoosted(beatId) {
  const now = Date.now()
  return readBoosts().some(b => b.beatId === beatId && b.expiresAt > now)
}

export function getBoostForBeat(beatId) {
  const now = Date.now()
  return readBoosts().find(b => b.beatId === beatId && b.expiresAt > now) || null
}


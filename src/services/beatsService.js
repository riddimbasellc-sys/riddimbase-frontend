import { fetchSales, createSale } from './salesRepository'
import { sendSaleEmail } from './notificationService'

// For prototypes without real producer auth linking, we optionally map producer names
// to stable pseudo IDs; when Supabase beats carry a user_id column we use that instead.
const pseudoId = (name) =>
  'pseudo-' +
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

const LOCAL_BEATS_KEY = 'rb_user_beats_v1'

function loadUserBeatsFromStorage() {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(LOCAL_BEATS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function persistUserBeats(beats) {
  if (typeof window === 'undefined') return
  try {
    // Only persist real user beats, never any placeholders.
    const userBeats = beats.filter((b) => !b.isPlaceholder)
    window.localStorage.setItem(LOCAL_BEATS_KEY, JSON.stringify(userBeats))
  } catch {
    // ignore persistence errors
  }
}

// Bootstrap in‑memory beats with any user-created beats from localStorage.
// We intentionally do not ship hard‑coded demo beats; all content should come
// from Supabase or real user uploads so production data always matches reality.
let beats = [...loadUserBeatsFromStorage()]

// ---------------------------------------------------------------------------
// Sales state (local/in-memory; Supabase-backed sales are layered in via
// salesRepository when available). Starts empty so dashboards only ever show
// real sales, not seeded demo data.
// ---------------------------------------------------------------------------
let sales = []

// ---------------------------------------------------------------------------
// Beat helpers (used across dashboard, homepage, etc.)
// ---------------------------------------------------------------------------

export function listBeats({ includeHidden = false } = {}) {
  return includeHidden ? beats : beats.filter((b) => !b.hidden)
}

export function getBeat(id) {
  return beats.find((b) => b.id === id) || null
}

export function addBeat(data) {
  const id = data.id || String(Date.now())
  const userId = data.userId || (data.producer ? pseudoId(data.producer) : null)
  const newBeat = {
    id,
    hidden: false,
    flagged: false,
    userId,
    isPlaceholder: false,
    ...data,
  }
  beats.unshift(newBeat)
  persistUserBeats(beats)
  return newBeat
}

// ---------------------------------------------------------------------------
// Sales helpers
// ---------------------------------------------------------------------------

export function listSales() {
  return sales
}

export async function listSalesAsync() {
  try {
    const remote = await fetchSales()
    if (remote.length) {
      return remote.map((r) => ({
        beatId: r.beat_id,
        license: r.license,
        buyer: r.buyer,
        amount: r.amount,
        createdAt: r.created_at,
      }))
    }
    // No remote sales yet; return an empty list instead of any seeded data.
    return []
  } catch {
    // On error, also fall back to an empty list so only real sales created
    // during this session (via recordSale) are shown.
    return []
  }
}

export function totalEarnings() {
  return sales.reduce((sum, s) => sum + s.amount, 0)
}

export async function recordSale({ beatId, license, buyer, amount, beatTitle }) {
  const createdAt = new Date().toISOString()
  const sale = { beatId, license, buyer, amount, createdAt }
  sales.unshift(sale)
  try {
    await createSale({ beatId, license, buyer, amount })
  } catch {
    // ignore remote failure, keep local sale
  }
  if (import.meta.env.VITE_NOTIFICATIONS_ENABLED === 'true') {
    try {
      await sendSaleEmail({
        beatTitle: beatTitle || beatId,
        license,
        buyerEmail: buyer,
        amount,
      })
    } catch {
      // ignore email errors
    }
  }
  return sale
}

export function monthlySalesCount() {
  const now = new Date()
  return sales.filter((s) => {
    if (!s.createdAt) return false
    const d = new Date(s.createdAt)
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
  }).length
}

export function monthlyRevenue() {
  const now = new Date()
  return sales.reduce((sum, s) => {
    if (!s.createdAt) return sum
    const d = new Date(s.createdAt)
    if (d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()) {
      return sum + s.amount
    }
    return sum
  }, 0)
}

// Compute gross earnings for a producer by userId or displayName
export function computeProducerEarnings({ userId, displayName }) {
  return sales.reduce((sum, s) => {
    const beat = beats.find((b) => b.id === s.beatId)
    if (!beat) return sum
    if (
      (userId && beat.userId === userId) ||
      (displayName && beat.producer === displayName)
    ) {
      return sum + s.amount
    }
    return sum
  }, 0)
}

// ---------------------------------------------------------------------------
// Moderation helpers
// ---------------------------------------------------------------------------

export function hideBeat(id) {
  const b = beats.find((b) => b.id === id)
  if (b) b.hidden = true
  persistUserBeats(beats)
  return b
}

export function deleteBeat(id) {
  const before = beats.length
  beats = beats.filter((b) => b.id !== id)
  persistUserBeats(beats)
  return beats.length < before
}

export function flagProducer(id) {
  const b = beats.find((b) => b.id === id)
  if (b) b.flagged = true
  return b
}

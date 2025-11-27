import { fetchSales, createSale } from './salesRepository'
import { sendSaleEmail } from './notificationService'

// For prototypes without real producer auth linking, we optionally map producer names
// to stable pseudo IDs; when Supabase beats carry a user_id column we use that instead.
const pseudoId = (name) => 'pseudo-' + name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')
let beats = [
  { id: '1', title: 'Kingston Nights', producer: 'YaadWave', userId: pseudoId('YaadWave'), genre: 'Dancehall', bpm: 96, price: 39, hidden: false, flagged: false },
  { id: '2', title: 'Port of Spain Fete', producer: 'TriniVibes', userId: pseudoId('TriniVibes'), genre: 'Soca', bpm: 120, price: 29, hidden: false, flagged: false },
  { id: '3', title: 'Montego Bay Sunset', producer: 'DubShore', userId: pseudoId('DubShore'), genre: 'Reggae', bpm: 88, price: 35, hidden: false, flagged: false },
  { id: '4', title: 'AfroCarib Breeze', producer: 'IslandRootz', userId: pseudoId('IslandRootz'), genre: 'Afrobeats', bpm: 105, price: 49, hidden: false, flagged: false },
]

// Initialize sales with timestamps derived from minutesAgo for legacy entries
let sales = [
  { beatId: '1', license: 'Basic License', buyer: '@IslandVoice', amount: 39, minutesAgo: 120, createdAt: new Date(Date.now() - 120 * 60 * 1000).toISOString() },
  { beatId: '2', license: 'Premium License', buyer: '@TriniStar', amount: 59, minutesAgo: 1440, createdAt: new Date(Date.now() - 1440 * 60 * 1000).toISOString() },
]

export function listBeats({ includeHidden = false } = {}) {
  return includeHidden ? beats : beats.filter(b => !b.hidden)
}

export function getBeat(id) {
  return beats.find(b => b.id === id) || null
}

export function addBeat(data) {
  const id = String(Date.now())
  const userId = data.userId || (data.producer ? pseudoId(data.producer) : null)
  const newBeat = { id, hidden: false, flagged: false, userId, ...data }
  beats.unshift(newBeat)
  return newBeat
}

export function listSales() { return sales }

export async function listSalesAsync() {
  try {
    const remote = await fetchSales()
    if (remote.length) {
      return remote.map(r => ({
        beatId: r.beat_id,
        license: r.license,
        buyer: r.buyer,
        amount: r.amount,
        createdAt: r.created_at,
      }))
    }
    return sales
  } catch {
    return sales
  }
}

export function totalEarnings() {
  return sales.reduce((sum, s) => sum + s.amount, 0)
}

export async function recordSale({ beatId, license, buyer, amount, beatTitle }) {
  const createdAt = new Date().toISOString()
  const sale = { beatId, license, buyer, amount, createdAt }
  sales.unshift(sale)
  try { await createSale({ beatId, license, buyer, amount }) } catch {}
  if (import.meta.env.VITE_NOTIFICATIONS_ENABLED === 'true') {
    try { await sendSaleEmail({ beatTitle: beatTitle || beatId, license, buyerEmail: buyer, amount }) } catch {}
  }
  return sale
}

export function monthlySalesCount() {
  const now = new Date()
  const ym = now.getFullYear() + '-' + (now.getMonth())
  return sales.filter(s => {
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
  // Map beatId to beat
  return sales.reduce((sum, s) => {
    const beat = beats.find(b => b.id === s.beatId)
    if (!beat) return sum
    if ((userId && beat.userId === userId) || (displayName && beat.producer === displayName)) {
      return sum + s.amount
    }
    return sum
  }, 0)
}

export function hideBeat(id) {
  const b = beats.find(b => b.id === id)
  if (b) b.hidden = true
  return b
}

export function deleteBeat(id) {
  const before = beats.length
  beats = beats.filter(b => b.id !== id)
  return beats.length < before
}

export function flagProducer(id) {
  const b = beats.find(b => b.id === id)
  if (b) b.flagged = true
  return b
}

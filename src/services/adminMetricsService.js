import { listBeats, listSalesAsync, totalEarnings, monthlyRevenue, monthlySalesCount } from './beatsService'
import { sendPayoutEmail } from './notificationService'
import { listAllPayouts, createPayout as repoCreatePayout, markPayoutCompleted } from './payoutsRepository'

// Mock users & payouts until real persistence.
let users = [
  { id: 'u1', email: 'owner@example.com', producer: true, banned: false },
  { id: 'u2', email: 'artist1@example.com', producer: false, banned: false },
  { id: 'u3', email: 'producer1@example.com', producer: true, banned: false },
]

// Legacy local payouts retained for fallback but primary source is Supabase via payoutsRepository.
let payouts = [ { id: 'p1', userId: 'u3', amount: 120, currency: 'USD', status: 'pending', requestedAt: Date.now() - 86400000 } ]

export async function metrics() {
  const beats = listBeats({ includeHidden: true })
  const sales = await listSalesAsync()
  const totalRev = totalEarnings() // still using local for now
  const monthRev = monthlyRevenue()
  return {
    totalBeats: beats.length,
    totalUsers: users.length,
    totalSales: sales.length,
    monthlyRevenue: monthRev,
    monthlySales: monthlySalesCount(),
  }
}

export function listUsers() { return users }
export function banUser(id) { const u = users.find(u=>u.id===id); if(u) u.banned=true; return u }
export function approveProducer(id) { const u = users.find(u=>u.id===id); if(u) u.producer=true; return u }
export function resetPassword(id) { return { success: true, id } }

export function listPayouts() { return payouts }
export async function refreshPayouts() {
  try { payouts = (await listAllPayouts()).map(p => ({ id: p.id, userId: p.userId, amount: p.amount, currency: p.currency, status: p.status, requestedAt: new Date(p.createdAt).getTime() })) } catch {}
  return payouts
}
export async function markPayoutComplete(id) {
  let updated = null
  try { updated = await markPayoutCompleted(id) } catch {}
  if (updated) {
    const producer = users.find(u => u.id === updated.userId)
    if (producer && import.meta.env.VITE_NOTIFICATIONS_ENABLED === 'true') {
      await sendPayoutEmail({ producerEmail: producer.email, amount: updated.amount, currency: updated.currency })
    }
  } else {
    const p = payouts.find(p=>p.id===id)
    if (p) p.status='completed'
    updated = p
  }
  return updated
}
export async function addPayout(userId, amount, currency='USD') {
  try { const r = await repoCreatePayout({ userId, amount, currency, methodType: 'legacy', methodDetails: '{}' }); await refreshPayouts(); return r } catch { const p={ id: 'p'+Date.now(), userId, amount, currency, status:'pending', requestedAt: Date.now() }; payouts.push(p); return p }
}

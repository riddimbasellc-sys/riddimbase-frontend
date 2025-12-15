import { listBeats, listSalesAsync, totalEarnings, monthlyRevenue, monthlySalesCount } from './beatsService'
import { listAllPayouts, createPayout as repoCreatePayout, markPayoutCompleted } from './payoutsRepository'
import { supabase } from '../lib/supabaseClient'

// Legacy local payouts retained for fallback but primary source is Supabase via payoutsRepository.
let payouts = []

export async function metrics() {
  const beats = await listBeats({ includeHidden: true })
  const sales = await listSalesAsync()
  const totalRev = await totalEarnings()
  const monthRev = await monthlyRevenue()
  const monthSales = await monthlySalesCount()
  let totalUsers = 0
  try {
    const { count, error } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
    if (!error && typeof count === 'number') {
      totalUsers = count
    }
  } catch {
    totalUsers = 0
  }
  return {
    totalBeats: beats.length,
    totalUsers,
    totalSales: sales.length,
    monthlyRevenue: monthRev,
    monthlySales: monthSales,
  }
}

export function listPayouts() { return payouts }
export async function refreshPayouts() {
  try { payouts = (await listAllPayouts()).map(p => ({ id: p.id, userId: p.userId, amount: p.amount, currency: p.currency, status: p.status, requestedAt: new Date(p.createdAt).getTime() })) } catch {}
  return payouts
}
export async function markPayoutComplete(id) {
  let updated = null
  try { updated = await markPayoutCompleted(id) } catch {}
  if (!updated) {
    const p = payouts.find(p=>p.id===id)
    if (p) p.status='completed'
    updated = p
  }
  return updated
}
export async function addPayout(userId, amount, currency='USD') {
  try { const r = await repoCreatePayout({ userId, amount, currency, methodType: 'legacy', methodDetails: '{}' }); await refreshPayouts(); return r } catch { const p={ id: 'p'+Date.now(), userId, amount, currency, status:'pending', requestedAt: Date.now() }; payouts.push(p); return p }
}

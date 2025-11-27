import { supabase } from '../lib/supabaseClient'
import { sendPayoutRequestEmail } from './notificationService'

// Local fallback store if Supabase unavailable
let localPayouts = []

export const WITHDRAWAL_FEE_PERCENT = 0
export const WITHDRAWAL_FEE_MIN = 0
export function computeWithdrawalFee(amount) {
  const pct = amount * WITHDRAWAL_FEE_PERCENT
  return Math.max(pct, WITHDRAWAL_FEE_MIN)
}

function mapRow(r) {
  return {
    id: r.id,
    userId: r.user_id,
    amount: r.amount,
    currency: r.currency,
    status: r.status,
    methodType: r.method_type,
    methodDetails: r.method_details,
    fee: r.fee,
    createdAt: r.created_at,
    completedAt: r.completed_at || null,
  }
}

export async function createPayout({ userId, amount, currency='USD', methodType, methodDetails }) {
  const fee = computeWithdrawalFee(amount)
  try {
    const { data, error } = await supabase.from('payouts').insert({
      user_id: userId,
      amount,
      currency,
      status: 'pending',
      method_type: methodType,
      method_details: methodDetails,
      fee
    }).select().single()
    if (error) throw error
    const mapped = mapRow(data)
    if (import.meta.env.VITE_NOTIFICATIONS_ENABLED === 'true') {
      try { await sendPayoutRequestEmail({ producerEmail: methodType==='paypal' ? JSON.parse(methodDetails).paypalEmail : null, amount, currency }) } catch {}
    }
    return mapped
  } catch (e) {
    const p = { id: 'lp_'+Date.now(), userId, amount, currency, status: 'pending', methodType, methodDetails, fee, createdAt: new Date().toISOString() }
    localPayouts.push(p)
    return p
  }
}

export async function listUserPayouts(userId) {
  try {
    const { data, error } = await supabase.from('payouts').select('*').eq('user_id', userId).order('created_at', { ascending: false })
    if (error) throw error
    return data.map(mapRow)
  } catch {
    return localPayouts.filter(p => p.userId === userId)
  }
}

export async function listAllPayouts() {
  try {
    const { data, error } = await supabase.from('payouts').select('*').order('created_at', { ascending: false })
    if (error) throw error
    return data.map(mapRow)
  } catch {
    return [...localPayouts]
  }
}

export async function markPayoutCompleted(id) {
  try {
    const { data, error } = await supabase.from('payouts').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', id).select().single()
    if (error) throw error
    return mapRow(data)
  } catch (e) {
    const p = localPayouts.find(p => p.id === id)
    if (p) p.status = 'completed'
    return p || null
  }
}

export async function cancelPayout(id) {
  try {
    const { data, error } = await supabase.from('payouts').update({ status: 'cancelled' }).eq('id', id).select().single()
    if (error) throw error
    return mapRow(data)
  } catch (e) {
    const p = localPayouts.find(p => p.id === id)
    if (p) p.status = 'cancelled'
    return p || null
  }
}

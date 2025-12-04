// Service orders management: Supabase only (no localStorage fallback).
// Order lifecycle: pending -> open -> completed | cancelled
// Structure: { id, providerId, serviceName, price, buyerName, buyerEmail, status, createdAt, updatedAt }
import { createServiceOrderSupabase, updateServiceOrderStatusSupabase, listServiceOrdersSupabase, computeServiceOrdersStatsSupabase } from './supabaseServiceOrdersRepository'

export function createServiceOrder({ providerId, serviceName, price, buyerName, buyerEmail }) {
  if (!providerId || !serviceName || !price) return { error: 'Missing required fields' }
  return createServiceOrderSupabase({ providerId, serviceName, price, buyerName, buyerEmail })
    .then(order => (order ? { order } : { error: 'Failed to create order' }))
    .catch(()=> ({ error: 'Failed to create order' }))
}

export function listProviderOrders(providerId) {
  // Caller should use queryOrders instead for Supabase-backed listing.
  return []
}

export function updateOrderStatus(orderId, status) {
  const allowed = ['pending','open','completed','cancelled']
  if (!allowed.includes(status)) return { error: 'Invalid status' }
  return updateServiceOrderStatusSupabase(orderId, status)
    .then(order => (order ? { order } : { error: 'Failed to update order' }))
    .catch(()=> ({ error: 'Failed to update order' }))
}

export function computeProviderStats(providerId) {
  return computeServiceOrdersStatsSupabase(providerId)
    .catch(()=> ({ pending:0, open:0, completed:0, cancelled:0, revenue:0, completionRate:0 }))
}

// Extended listing with pagination & search using Supabase first
export async function queryOrders({ providerId, status='all', search='', page=1, pageSize=10 }) {
  try {
    const { data, count } = await listServiceOrdersSupabase({ providerId, status, search, page, pageSize })
    return { data, count, page, pageSize }
  } catch {
    return { data: [], count: 0, page, pageSize }
  }
}

// Availability (accepting new jobs) stored separately
export function getProviderAvailability(providerId) {
  try { return localStorage.getItem('provider_availability:'+providerId) === 'true' } catch { return true }
}
export function setProviderAvailability(providerId, value) {
  try { localStorage.setItem('provider_availability:'+providerId, value ? 'true':'false') } catch {}
}

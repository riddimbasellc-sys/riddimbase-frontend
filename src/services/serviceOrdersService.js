// Hybrid service orders management: Supabase primary, localStorage fallback.
// Order lifecycle: pending -> open -> completed | cancelled
// Structure: { id, providerId, serviceName, price, buyerName, buyerEmail, status, createdAt, updatedAt }
import { createServiceOrderSupabase, updateServiceOrderStatusSupabase, listServiceOrdersSupabase, computeServiceOrdersStatsSupabase } from './supabaseServiceOrdersRepository'

const KEY = 'rb_service_orders'

function readAll() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const arr = JSON.parse(raw)
    if (Array.isArray(arr)) return arr
  } catch {}
  return []
}

function writeAll(list) {
  try { localStorage.setItem(KEY, JSON.stringify(list)) } catch {}
}

export function createServiceOrder({ providerId, serviceName, price, buyerName, buyerEmail }) {
  if (!providerId || !serviceName || !price) return { error: 'Missing required fields' }
  return createServiceOrderSupabase({ providerId, serviceName, price, buyerName, buyerEmail })
    .then(order => order ? { order } : legacyCreate({ providerId, serviceName, price, buyerName, buyerEmail }))
    .catch(()=> legacyCreate({ providerId, serviceName, price, buyerName, buyerEmail }))
}

function legacyCreate({ providerId, serviceName, price, buyerName, buyerEmail }) {
  const orders = readAll()
  const id = 'loc_' + Date.now() + '_' + Math.random().toString(36).slice(2,8)
  const now = new Date().toISOString()
  const order = { id, providerId, serviceName, price: Number(price), buyerName: buyerName||'', buyerEmail: buyerEmail||'', status: 'pending', createdAt: now, updatedAt: now, _local: true }
  orders.push(order)
  writeAll(orders)
  return { order, fallback: true }
}

export function listProviderOrders(providerId) {
  return readAll().filter(o => o.providerId === providerId)
    .sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt))
}

export function updateOrderStatus(orderId, status) {
  const allowed = ['pending','open','completed','cancelled']
  if (!allowed.includes(status)) return { error: 'Invalid status' }
  return updateServiceOrderStatusSupabase(orderId, status)
    .then(order => order ? { order } : legacyUpdate(orderId, status))
    .catch(()=> legacyUpdate(orderId, status))
}

function legacyUpdate(orderId, status) {
  const orders = readAll()
  const idx = orders.findIndex(o => o.id === orderId)
  if (idx === -1) return { error: 'Not found (local fallback)' }
  orders[idx].status = status
  orders[idx].updatedAt = new Date().toISOString()
  writeAll(orders)
  return { order: orders[idx], fallback: true }
}

export function computeProviderStats(providerId) {
  return computeServiceOrdersStatsSupabase(providerId)
    .catch(()=> {
      const orders = listProviderOrders(providerId)
      const pending = orders.filter(o => o.status === 'pending').length
      const open = orders.filter(o => o.status === 'open').length
      const completed = orders.filter(o => o.status === 'completed').length
      const cancelled = orders.filter(o => o.status === 'cancelled').length
      const revenue = orders.filter(o => o.status === 'completed').reduce((sum,o)=> sum + o.price, 0)
      const totalHandled = completed + cancelled + open
      const completionRate = totalHandled ? (completed / totalHandled) : 0
      return { pending, open, completed, cancelled, revenue, completionRate, fallback:true }
    })
}

// Extended listing with pagination & search using Supabase first
export async function queryOrders({ providerId, status='all', search='', page=1, pageSize=10 }) {
  try {
    const { data, count } = await listServiceOrdersSupabase({ providerId, status, search, page, pageSize })
    return { data, count, page, pageSize }
  } catch {
    // Fallback local (no pagination, naive search)
    let arr = listProviderOrders(providerId)
    if (status !== 'all') arr = arr.filter(o => o.status === status)
    if (search) arr = arr.filter(o => (o.serviceName||'').toLowerCase().includes(search.toLowerCase()) || (o.buyerEmail||'').toLowerCase().includes(search.toLowerCase()))
    const count = arr.length
    const start = (page-1)*pageSize
    const end = start + pageSize
    return { data: arr.slice(start,end), count, page, pageSize, fallback:true }
  }
}

// Availability (accepting new jobs) stored separately
export function getProviderAvailability(providerId) {
  try { return localStorage.getItem('provider_availability:'+providerId) === 'true' } catch { return true }
}
export function setProviderAvailability(providerId, value) {
  try { localStorage.setItem('provider_availability:'+providerId, value ? 'true':'false') } catch {}
}

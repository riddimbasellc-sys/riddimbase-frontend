// Coupons service (localStorage backed). Coupons apply ONLY to subscriptions.
// Structure: { id, code, type: 'fixed'|'percent', value, active, maxRedemptions, used, expiresAt|null }

const KEY = 'rb_coupons'
function load() {
  try { const raw = localStorage.getItem(KEY); if (!raw) return []; const arr = JSON.parse(raw); return Array.isArray(arr) ? arr : [] } catch { return [] }
}
function save(list) { try { localStorage.setItem(KEY, JSON.stringify(list)) } catch {}
}

export function listCoupons() { return load() }
export function createCoupon({ code, type, value, maxRedemptions = 0, expiresAt = null }) {
  const list = load()
  const id = 'c_' + Date.now()
  const c = { id, code: (code||'').trim().toUpperCase(), type, value: Number(value||0), active: true, maxRedemptions, used: 0, expiresAt }
  list.push(c); save(list); return c
}
export function deleteCoupon(id) { const list = load().filter(c=>c.id!==id); save(list); }
export function toggleCoupon(id) { const list = load(); const c = list.find(c=>c.id===id); if (c) { c.active=!c.active; save(list) } return c }

export function validateCoupon({ code, planId, amount }) {
  if (!code) return { valid:false, reason:'No code' }
  const list = load()
  const c = list.find(c=>c.code === code.trim().toUpperCase())
  if (!c) return { valid:false, reason:'Not found' }
  if (!c.active) return { valid:false, reason:'Inactive' }
  if (c.expiresAt && Date.now() > c.expiresAt) return { valid:false, reason:'Expired' }
  if (c.maxRedemptions>0 && c.used >= c.maxRedemptions) return { valid:false, reason:'Limit reached' }
  // Only allow non-free plan upgrades
  if (planId === 'free') return { valid:false, reason:'Not applicable to Free' }
  let discount = 0
  if (c.type === 'fixed') discount = Math.min(c.value, amount)
  else if (c.type === 'percent') discount = Math.min(amount, amount * (c.value/100))
  return { valid:true, coupon:c, discount, final: Math.max(0, amount - discount) }
}

export function markCouponUsed(code) {
  const list = load(); const c = list.find(c=>c.code===code); if (c) { c.used += 1; save(list) }
}

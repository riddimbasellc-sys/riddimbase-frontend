// Coupons service: now purely in-memory defaults (no localStorage).
// In production you should back coupons with Supabase or your backend.

const defaultCoupons = []

export function listCoupons() { return defaultCoupons }

export function createCoupon() {
  throw new Error('createCoupon is not wired to persistent storage; manage coupons via backend instead.')
}

export function deleteCoupon() {
  throw new Error('deleteCoupon is not wired to persistent storage.')
}

export function toggleCoupon() {
  throw new Error('toggleCoupon is not wired to persistent storage.')
}

export function validateCoupon({ code, planId, amount }) {
  if (!code) return { valid:false, reason:'No code' }
  // No active coupons until backed by Supabase.
  return { valid:false, reason:'Not found' }
}

export function markCouponUsed() {
  // no-op until persistent coupons are implemented
}

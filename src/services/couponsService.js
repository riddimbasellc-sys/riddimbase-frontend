import { supabase } from '../lib/supabaseClient'

// Basic Supabase-backed coupons service for subscription plans.
// All functions are async; callers should await them.

const TABLE = 'coupons'
let memoryCoupons = []

function mapRow(row) {
  return {
    id: row.id,
    code: row.code,
    type: row.type,
    value: Number(row.value || 0),
    planId: row.plan_id || null,
    planIds: Array.isArray(row.coupon_plans)
      ? row.coupon_plans.map((r) => r.plan_id)
      : [],
    maxRedemptions: row.max_redemptions ?? null,
    used: Number(row.used || 0),
    active: !!row.active,
    createdAt: row.created_at,
  }
}

export async function listCoupons() {
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*, coupon_plans ( plan_id )')
      .order('created_at', { ascending: false })
    if (error) throw error
    memoryCoupons = (data || []).map(mapRow)
    return memoryCoupons
  } catch {
    return [...memoryCoupons]
  }
}

export async function createCoupon({ code, type, value, maxRedemptions, planId = null, planIds = [] }) {
  const payload = {
    code: code.trim(),
    type,
    value,
    plan_id: planId || null,
    max_redemptions: maxRedemptions || null,
  }
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .insert(payload)
      .select('*')
      .maybeSingle()
    if (error) throw error
    if (data) {
      const allowList = (planIds || []).filter(Boolean)
      if (allowList.length) {
        const joinRows = allowList.map((pid) => ({ coupon_id: data.id, plan_id: pid }))
        try { await supabase.from('coupon_plans').insert(joinRows) } catch {}
      }
      // Re-fetch including relation so planIds present
      let mapped
      try {
        const { data: withRel } = await supabase
          .from(TABLE)
          .select('*, coupon_plans ( plan_id )')
          .eq('id', data.id)
          .maybeSingle()
        mapped = mapRow(withRel || data)
      } catch {
        mapped = mapRow(data)
        mapped.planIds = allowList
      }
      memoryCoupons = [mapped, ...memoryCoupons.filter((c) => c.id !== mapped.id)]
      return mapped
    }
  } catch {
    // keep in-memory only if Supabase fails
    const temp = {
      id: `local_${Date.now()}`,
      code: payload.code,
      type: payload.type,
      value: payload.value,
      maxRedemptions: payload.max_redemptions,
      planId: payload.plan_id || null,
      planIds: (planIds || []).filter(Boolean),
      used: 0,
      active: true,
      createdAt: new Date().toISOString(),
    }
    memoryCoupons = [temp, ...memoryCoupons]
    return temp
  }
}

export async function deleteCoupon(id) {
  if (!id) return
  try {
    await supabase.from(TABLE).delete().eq('id', id)
  } catch {
    // ignore
  }
  memoryCoupons = memoryCoupons.filter((c) => c.id !== id)
}

export async function toggleCoupon(id) {
  if (!id) return
  const existing = memoryCoupons.find((c) => c.id === id)
  const nextActive = existing ? !existing.active : true
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .update({ active: nextActive })
      .eq('id', id)
      .select('*')
      .maybeSingle()
    if (error) throw error
    if (data) {
      const mapped = mapRow(data)
      memoryCoupons = memoryCoupons.map((c) => (c.id === id ? mapped : c))
      return mapped
    }
  } catch {
    // fall back to local toggle
    memoryCoupons = memoryCoupons.map((c) =>
      c.id === id ? { ...c, active: nextActive } : c,
    )
  }
}

export async function validateCoupon({ code, planId, amount }) {
  if (!code) return { valid: false, reason: 'No code' }
  const normalized = code.trim().toUpperCase()

  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*, coupon_plans ( plan_id )')
      .eq('code', normalized)
      .maybeSingle()
    if (error) throw error
    if (!data) return { valid: false, reason: 'Not found' }

    const coupon = mapRow(data)
    if (!coupon.active) return { valid: false, reason: 'Inactive' }
    const restrictions = (coupon.planIds && coupon.planIds.length > 0)
      ? coupon.planIds
      : (coupon.planId ? [coupon.planId] : [])
    if (restrictions.length > 0) {
      if (!planId) return { valid: false, reason: 'Plan required' }
      if (!restrictions.includes(planId)) {
        return { valid: false, reason: 'Plan mismatch' }
      }
    }
    if (
      coupon.maxRedemptions &&
      coupon.maxRedemptions > 0 &&
      coupon.used >= coupon.maxRedemptions
    ) {
      return { valid: false, reason: 'Max redemptions reached' }
    }

    const base = Number(amount || 0)
    if (base <= 0) return { valid: false, reason: 'Nothing to discount' }

    let discount = 0
    if (coupon.type === 'fixed') {
      discount = Math.min(coupon.value, base)
    } else if (coupon.type === 'percent') {
      discount = (base * coupon.value) / 100
    }
    const final = Math.max(0, base - discount)

    return {
      valid: true,
      coupon,
      discount,
      final,
    }
  } catch (e) {
    console.warn('[couponsService] validate error', e?.message)
    return { valid: false, reason: 'Error validating code' }
  }
}

export async function markCouponUsed(code) {
  if (!code) return
  const normalized = code.trim().toUpperCase()
  try {
    const { data: existing, error: fetchError } = await supabase
      .from(TABLE)
      .select('*')
      .eq('code', normalized)
      .maybeSingle()
    if (fetchError || !existing) throw fetchError || new Error('Not found')

    const current = mapRow(existing)
    const nextUsed = (current.used || 0) + 1

    const { data, error } = await supabase
      .from(TABLE)
      .update({ used: nextUsed })
      .eq('code', normalized)
      .select('*')
      .maybeSingle()
    if (error || !data) throw error || new Error('Update failed')

    const mapped = mapRow(data)
    memoryCoupons = memoryCoupons.map((c) =>
      c.id === mapped.id ? mapped : c,
    )
    return
  } catch {
    // Fallback: naive increment in memory only
    memoryCoupons = memoryCoupons.map((c) =>
      c.code.toUpperCase() === normalized
        ? { ...c, used: (c.used || 0) + 1 }
        : c,
    )
  }
}

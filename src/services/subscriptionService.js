import { supabase } from '../lib/supabaseClient'

// Supabase-backed subscriptions for plans.
// Table: public.subscriptions (see supabase_subscriptions.sql)

const ACTIVE_STATUSES = ['active', 'trialing', 'past_due']

export async function getSubscription(userId) {
  if (!userId) return null
  try {
    const { data, error } = await supabase
      .from('subscriptions')
      .select(
        'id,user_id,plan_id,status,auto_renew,current_period_end,cancel_at_period_end,provider_subscription_id',
      )
      .eq('user_id', userId)
      .in('status', ACTIVE_STATUSES)
      .order('current_period_end', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      console.warn('[subscriptionService] getSubscription error', error.message)
      return null
    }
    if (!data) return null

    return {
      id: data.id,
      userId: data.user_id,
      planId: data.plan_id,
      status: data.status,
      autoRenew: !!data.auto_renew && !data.cancel_at_period_end,
      expiresAt: data.current_period_end,
      cancelAtPeriodEnd: !!data.cancel_at_period_end,
      providerSubscriptionId: data.provider_subscription_id || null,
    }
  } catch (e) {
    console.warn('[subscriptionService] getSubscription exception', e)
    return null
  }
}

// Marks the current active subscription as cancel-at-period-end.
// NOTE: For real PayPal Subscriptions, you should also call PayPal's
// API to cancel the subscription on their side from your backend.
export async function cancelSubscription(userId) {
  if (!userId) return { success: false }
  try {
    const { error } = await supabase
      .from('subscriptions')
      .update({
        cancel_at_period_end: true,
        auto_renew: false,
      })
      .eq('user_id', userId)
      .in('status', ACTIVE_STATUSES)
    if (error) {
      console.warn('[subscriptionService] cancelSubscription error', error.message)
      return { success: false, error }
    }
    return { success: true }
  } catch (e) {
    console.warn('[subscriptionService] cancelSubscription exception', e)
    return { success: false, error: e }
  }
}

export function isPro(planId) {
  return (
    planId === 'basic-pro' ||
    planId === 'premium-pro' ||
    planId === 'pro' ||
    planId === 'premium' ||
    planId === 'starter'
  )
}

export function isProducerProPlanId(planId) {
  const id = String(planId || '').trim().toLowerCase()
  return id === 'producer-pro' || id === 'pro-yearly' || id === 'pro-producer'
}

export async function isProducerPro(userId) {
  if (!userId) return false
  const sub = await getSubscription(userId)
  return !!(sub && isProducerProPlanId(sub.planId))
}

// plan values: 'free' | 'starter' | 'pro'
export async function getUserPlan(userId) {
  if (!userId) return 'free'
  const sub = await getSubscription(userId)
  if (!sub || !sub.planId) return 'free'
  if (sub.planId === 'free') return 'free'
  if (!sub.expiresAt) return sub.planId

  const now = new Date()
  const expiry = new Date(sub.expiresAt)
  if (expiry < now && !sub.autoRenew) {
    return 'free'
  }
  return sub.planId
}

// Stub maintained for backwards compatibility; real activation
// comes from PayPal Subscription webhook + /api/subscriptions/activate.
export async function setUserPlan() {
  // no-op in Supabase-backed mode
  return null
}


const STORAGE_KEY = 'rb_plans'

const defaultPlans = [
  { id: 'free', name: 'Free', monthly: 0, yearly: 0, badge: 'First 5 uploads free', features: ['5 Beat uploads total','Basic analytics','Community access','Email support (48h)'], cta: 'Get Started', hidden: false },
  { id: 'starter', name: 'Starter', monthly: 9, yearly: 90, badge: 'For growing catalogs', features: ['Unlimited active beats','Advanced analytics (monthly)','Priority email support (24h)','Custom artwork hosting'], cta: 'Upgrade to Starter', hidden: false },
  { id: 'pro', name: 'Pro', monthly: 19, yearly: 190, badge: 'Scale & sell more', features: ['Unlimited active beats','Real‑time sales dashboard','Priority chat support','Early access to new features'], cta: 'Go Pro', hidden: false },
]

// For now plans are defined statically here; no localStorage persistence.
// If you later move plans fully into Supabase, this module can call that API.

export function listPlans({ includeHidden=false } = {}) {
  return includeHidden ? defaultPlans : defaultPlans.filter(p=>!p.hidden)
}

export function getPlan(id) { return defaultPlans.find(p=>p.id===id) || null }

export function createPlan() {
  throw new Error('createPlan is not supported in static plansService; manage plans via Supabase/admin instead.')
}

export function updatePlan() {
  throw new Error('updatePlan is not supported in static plansService; manage plans via Supabase/admin instead.')
}

export function deletePlan() {
  throw new Error('deletePlan is not supported in static plansService; manage plans via Supabase/admin instead.')
}

export function reorderPlans(ids) {
  const map = new Map(defaultPlans.map(p=>[p.id,p]))
  const reordered = ids.map(id=>map.get(id)).filter(Boolean)
  const remainder = defaultPlans.filter(p=>!ids.includes(p.id))
  return [...reordered, ...remainder]
}

export function togglePlanVisibility() {
  throw new Error('togglePlanVisibility is not supported in static plansService.')
}

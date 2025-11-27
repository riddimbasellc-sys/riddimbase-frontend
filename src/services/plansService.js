const STORAGE_KEY = 'rb_plans'

const defaultPlans = [
  { id: 'free', name: 'Free', monthly: 0, yearly: 0, badge: 'First 5 uploads free', features: ['5 Beat uploads total','Basic analytics','Community access','Email support (48h)'], cta: 'Get Started', hidden: false },
  { id: 'starter', name: 'Starter', monthly: 9, yearly: 90, badge: 'For growing catalogs', features: ['Up to 100 active beats','Advanced analytics (monthly)','Priority email support (24h)','Custom artwork hosting'], cta: 'Upgrade to Starter', hidden: false },
  { id: 'pro', name: 'Pro', monthly: 19, yearly: 190, badge: 'Scale & sell more', features: ['Unlimited active beats','Real‑time sales dashboard','Priority chat support','Early access to new features'], cta: 'Go Pro', hidden: false },
]

function load() {
  try { const raw = localStorage.getItem(STORAGE_KEY); if (raw) return JSON.parse(raw) } catch {}
  return defaultPlans
}

function save(plans) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(plans)) } catch {} }

export function listPlans({ includeHidden=false } = {}) {
  const plans = load(); return includeHidden ? plans : plans.filter(p=>!p.hidden)
}

export function getPlan(id) { return load().find(p=>p.id===id) || null }

export function createPlan(plan) {
  const plans = load()
  const id = plan.id || plan.name.toLowerCase().replace(/[^a-z0-9]+/g,'-')
  if (plans.some(p=>p.id===id)) throw new Error('Plan id exists')
  const newPlan = { id, monthly: 0, yearly: 0, features: [], cta: 'Choose Plan', hidden: false, ...plan }
  plans.push(newPlan); save(plans); return newPlan
}

export function updatePlan(id, patch) {
  const plans = load(); const idx = plans.findIndex(p=>p.id===id); if (idx===-1) throw new Error('Plan not found')
  plans[idx] = { ...plans[idx], ...patch }; save(plans); return plans[idx]
}

export function deletePlan(id) {
  const plans = load().filter(p=>p.id!==id); save(plans); return true
}

export function reorderPlans(ids) {
  const plans = load(); const map = new Map(plans.map(p=>[p.id,p]))
  const reordered = ids.map(id=>map.get(id)).filter(Boolean)
  const remainder = plans.filter(p=>!ids.includes(p.id))
  const final = [...reordered, ...remainder]; save(final); return final
}

export function togglePlanVisibility(id, hidden) { return updatePlan(id,{ hidden }) }

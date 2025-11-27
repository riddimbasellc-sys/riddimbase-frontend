import { supabase } from '../lib/supabaseClient'
import { listPlans as listLocal, createPlan as createLocal, updatePlan as updateLocal, deletePlan as deleteLocal, reorderPlans as reorderLocal, togglePlanVisibility as toggleLocal } from './plansService'
import { slugify } from '../utils/slugify'

// Supabase table definition (for reference):
// create table plans (
//   id text primary key,
//   name text not null,
//   monthly numeric not null default 0,
//   yearly numeric not null default 0,
//   badge text,
//   features_json text not null default '[]',
//   cta text not null default 'Choose Plan',
//   hidden boolean not null default false,
//   position integer not null default 0,
//   created_at timestamptz default now()
// );
// create unique index plans_position_idx on plans(position);

function mapRow(r) {
  return {
    id: r.id,
    name: r.name,
    monthly: r.monthly,
    yearly: r.yearly,
    badge: r.badge || '',
    features: safeParseFeatures(r.features_json),
    cta: r.cta || 'Choose Plan',
    hidden: !!r.hidden,
    position: r.position ?? 0,
  }
}

function safeParseFeatures(str) {
  try { const arr = JSON.parse(str || '[]'); return Array.isArray(arr) ? arr : [] } catch { return [] }
}

async function ensureSeed() {
  try {
    const { data, error } = await supabase.from('plans').select('id')
    if (error) throw error
    if (data && data.length) return
    // Seed from local service defaults
    const seed = listLocal({ includeHidden: true })
    for (let i=0;i<seed.length;i++) {
      const p = seed[i]
      await supabase.from('plans').insert({
        id: p.id,
        name: p.name,
        monthly: p.monthly,
        yearly: p.yearly,
        badge: p.badge,
        features_json: JSON.stringify(p.features||[]),
        cta: p.cta,
        hidden: p.hidden || false,
        position: i
      })
    }
  } catch {
    // ignore; fallback used later
  }
}

export async function listPlans({ includeHidden=false } = {}) {
  try {
    await ensureSeed()
    const { data, error } = await supabase.from('plans').select('*').order('position', { ascending: true })
    if (error) throw error
    const mapped = data.map(mapRow)
    return includeHidden ? mapped : mapped.filter(p=>!p.hidden)
  } catch {
    return listLocal({ includeHidden })
  }
}

export async function getPlan(id) {
  try {
    const { data, error } = await supabase.from('plans').select('*').eq('id', id).single()
    if (error) throw error
    return mapRow(data)
  } catch {
    return listLocal({ includeHidden: true }).find(p=>p.id===id) || null
  }
}

export async function createPlan(plan) {
  const id = plan.id || slugify(plan.name || '') || 'plan-'+Date.now()
  try {
    const { data: existing, error: exErr } = await supabase.from('plans').select('id').eq('id', id).maybeSingle()
    if (exErr) throw exErr
    if (existing) throw new Error('Plan id exists')
    const { data: countData } = await supabase.from('plans').select('id, position').order('position', { ascending: false }).limit(1)
    const nextPos = countData && countData.length ? (countData[0].position+1) : 0
    const insert = {
      id,
      name: plan.name,
      monthly: plan.monthly||0,
      yearly: plan.yearly||0,
      badge: plan.badge||'',
      features_json: JSON.stringify(plan.features||[]),
      cta: plan.cta || 'Choose Plan',
      hidden: !!plan.hidden,
      position: nextPos
    }
    const { data, error } = await supabase.from('plans').insert(insert).select().single()
    if (error) throw error
    return mapRow(data)
  } catch (e) {
    // fallback local
    return createLocal({ id, ...plan })
  }
}

export async function updatePlan(id, patch) {
  try {
    const upd = { ...patch }
    if (patch.features) upd.features_json = JSON.stringify(patch.features)
    delete upd.features
    const { data, error } = await supabase.from('plans').update(upd).eq('id', id).select().single()
    if (error) throw error
    return mapRow(data)
  } catch {
    return updateLocal(id, patch)
  }
}

export async function deletePlan(id) {
  try {
    const { error } = await supabase.from('plans').delete().eq('id', id)
    if (error) throw error
    return true
  } catch {
    return deleteLocal(id)
  }
}

export async function togglePlanVisibility(id, hidden) {
  return updatePlan(id, { hidden })
}

export async function reorderPlans(ids) {
  try {
    // Update positions sequentially to preserve order
    for (let i=0;i<ids.length;i++) {
      await supabase.from('plans').update({ position: i }).eq('id', ids[i])
    }
    return listPlans({ includeHidden: true })
  } catch {
    return reorderLocal(ids)
  }
}

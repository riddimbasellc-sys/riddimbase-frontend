import { supabase } from '../lib/supabaseClient'

// Submit anonymous report. type: 'beat' | 'producer'
// Returns { id, success }
export async function submitReport({ type, targetId, reason, details }) {
  const payload = {
    type,
    target_id: targetId,
    reason,
    details: details || null,
    status: 'open',
    created_at: new Date().toISOString()
  }
  try {
    const { data, error } = await supabase.from('reports').insert(payload).select().maybeSingle()
    if (error) {
      console.warn('[reportService] supabase insert failed, falling back to localStorage', error.message)
      fallbackStore(payload)
      return { id: payload.created_at, success: true, fallback: true }
    }
    // Also store locally for immediate UI visibility even if Supabase succeeds.
    fallbackStore({ ...(data||{}), ...payload })
    return { id: data?.id || payload.created_at, success: true }
  } catch (e) {
    console.warn('[reportService] unexpected error', e)
    fallbackStore(payload)
    return { id: payload.created_at, success: true, fallback: true }
  }
}

export async function listReports() {
  try {
    const { data, error } = await supabase.from('reports').select('*').order('created_at', { ascending: false })
    if (error) throw error
    // Merge with local fallback (ensuring no duplicates by id/created_at)
    const local = fallbackRead()
    const combined = [...data, ...local.filter(l => !data.some(d => (d.id && d.id === l.id) || d.created_at === l.created_at))]
    // Sort newest first
    combined.sort((a,b)=> new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    return combined
  } catch (e) {
    console.warn('[reportService] list fallback', e.message)
    return fallbackRead()
  }
}

export async function updateReportStatus(id, status) {
  try {
    const { data, error } = await supabase.from('reports').update({ status }).eq('id', id).select().maybeSingle()
    if (error) throw error
    return data
  } catch (e) {
    console.warn('[reportService] update status fallback', e.message)
    // local fallback: mutate localStorage entry
    const all = fallbackRead()
    const idx = all.findIndex(r => r.created_at === id || r.id === id)
    if (idx !== -1) {
      all[idx].status = status
      localStorage.setItem('rb_reports', JSON.stringify(all))
      return all[idx]
    }
    return null
  }
}

function fallbackStore(entry) {
  try {
    const key = 'rb_reports'
    const existing = JSON.parse(localStorage.getItem(key) || '[]')
    // Prevent duplicate by created_at or id
    if (!existing.some(r => (entry.id && r.id === entry.id) || r.created_at === entry.created_at)) {
      existing.unshift(entry)
    }
    localStorage.setItem(key, JSON.stringify(existing))
  } catch {/* ignore */}
}

function fallbackRead() {
  try { return JSON.parse(localStorage.getItem('rb_reports') || '[]') } catch { return [] }
}

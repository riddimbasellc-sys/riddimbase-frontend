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
    if (error) throw error
    return { id: data?.id || payload.created_at, success: true }
  } catch (e) {
    console.warn('[reportService] submitReport error', e?.message || e)
    return { id: null, success: false }
  }
}

export async function listReports() {
  try {
    const { data, error } = await supabase.from('reports').select('*').order('created_at', { ascending: false })
    if (error) throw error
    return data || []
  } catch (e) {
    console.warn('[reportService] listReports error', e?.message || e)
    return []
  }
}

export async function updateReportStatus(id, status) {
  try {
    const { data, error } = await supabase.from('reports').update({ status }).eq('id', id).select().maybeSingle()
    if (error) throw error
    return data
  } catch (e) {
    console.warn('[reportService] updateReportStatus error', e?.message || e)
    return null
  }
}

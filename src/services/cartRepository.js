import { supabase } from '../lib/supabaseClient'

const TABLE = 'cart_items'

function supabaseAvailable() {
  try {
    return !!supabase && !!supabase.from
  } catch {
    return false
  }
}

export async function loadCart(userId) {
  if (!userId || !supabaseAvailable()) return []
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select('beat_id, license')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
    if (error) throw error
    return (data || []).map((row) => ({
      beatId: row.beat_id,
      license: row.license || 'Basic',
    }))
  } catch {
    return []
  }
}

export async function replaceCart(userId, items) {
  if (!userId || !supabaseAvailable()) return
  const payload = (items || [])
    .filter((it) => it && it.beatId)
    .map((it) => ({
      user_id: userId,
      beat_id: it.beatId,
      license: it.license || 'Basic',
    }))
  try {
    // Simple strategy: clear then re-insert current items
    await supabase.from(TABLE).delete().eq('user_id', userId)
    if (payload.length) {
      await supabase.from(TABLE).insert(payload)
    }
  } catch {
    // ignore sync errors; local cart remains authoritative
  }
}


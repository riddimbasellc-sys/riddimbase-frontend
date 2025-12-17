import { supabase } from '../lib/supabaseClient'

/**
 * Fetch collaborator wallet balance for the given user.
 * Returns a number (balance) or 0 if none.
 */
export async function getCollaboratorWallet(userId) {
  if (!userId) return 0
  try {
    const { data, error } = await supabase
      .from('user_wallet')
      .select('balance')
      .eq('user_id', userId)
      .single()
    if (error) return 0
    return Number(data?.balance || 0)
  } catch {
    return 0
  }
}

/**
 * List recent split entries for the given user.
 * Returns array of { beat_id, amount_earned, currency, timestamp, collaborator_id }.
 */
export async function listCollaboratorSplitEntries(userId, { limit = 10 } = {}) {
  if (!userId) return []
  try {
    // 1) Find collaborator rows tied to this user
    const { data: collabs, error: collabErr } = await supabase
      .from('collaborators')
      .select('id')
      .eq('user_id', userId)
    if (collabErr) return []
    const ids = (collabs || []).map((c) => c.id).filter(Boolean)
    if (!ids.length) return []

    // 2) Fetch recent split ledger rows for those collaborator IDs
    const { data, error } = await supabase
      .from('beat_sales_split')
      .select('beat_id, amount_earned, currency, timestamp, collaborator_id')
      .in('collaborator_id', ids)
      .order('timestamp', { ascending: false })
      .limit(limit)
    if (error) return []
    return Array.isArray(data) ? data : []
  } catch {
    return []
  }
}

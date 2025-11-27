import { supabase } from '../lib/supabaseClient'
import { addNotification as addLocal, getNotifications as getLocal, markAllRead as markLocal } from './notificationsService'

const TABLE = 'notifications'

function supabaseAvailable() {
  try { return !!supabase && !!supabase.from } catch { return false }
}

export async function addNotification({ recipientId, actorId, type, data }) {
  if (!type || !recipientId) return null
  if (supabaseAvailable()) {
    const { error, data: rows } = await supabase.from(TABLE).insert({ user_id: recipientId, actor_id: actorId || null, type, data })
    if (!error) return rows?.[0] || null
    console.warn('[notificationsRepository] insert error; falling back to local', error)
  }
  addLocal(type, { ...data, recipientId, actorId })
  return null
}

export async function listNotifications(recipientId) {
  if (!recipientId) return []
  if (supabaseAvailable()) {
    const { data: rows, error } = await supabase.from(TABLE).select('*').eq('user_id', recipientId).order('created_at', { ascending: false }).limit(250)
    if (!error && rows) return rows.map(r => ({ id: r.id, type: r.type, data: r.data || {}, ts: new Date(r.created_at).getTime(), read: r.read }))
    if (error) console.warn('[notificationsRepository] list error; using local fallback', error)
  }
  return getLocal()
}

export async function markAllRead(recipientId) {
  if (recipientId && supabaseAvailable()) {
    const { error } = await supabase.from(TABLE).update({ read: true }).eq('user_id', recipientId).eq('read', false)
    if (!error) return
    console.warn('[notificationsRepository] markAllRead error; local fallback', error)
  }
  markLocal()
}

export function realtimeSubscribe(recipientId, onEvent) {
  if (!recipientId || !supabaseAvailable()) return () => {}
  const channel = supabase.channel('public:notifications')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: TABLE, filter: `user_id=eq.${recipientId}` }, payload => {
      const r = payload.new
      onEvent({ id: r.id, type: r.type, data: r.data || {}, ts: new Date(r.created_at).getTime(), read: r.read })
    })
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: TABLE, filter: `user_id=eq.${recipientId}` }, payload => {
      const r = payload.new
      onEvent({ id: r.id, type: r.type, data: r.data || {}, ts: new Date(r.created_at).getTime(), read: r.read })
    })
    .subscribe()
  return () => { try { supabase.removeChannel(channel) } catch {} }
}
